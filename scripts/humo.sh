#!/usr/bin/env bash
# Prueba de humo de la API contra `wrangler dev`.
# Recorre el flujo real: login, CSRF, CRUD, reglas de negocio, permisos y descargas.
set -u
BASE="${1:-http://127.0.0.1:8787}"
GALLETAS=$(mktemp)
OK=0; FALLO=0

c() { # curl con cookies
  curl -s -c "$GALLETAS" -b "$GALLETAS" "$@"
}

verificar() { # nombre, esperado, obtenido
  if [ "$2" = "$3" ]; then
    printf '  \033[32mOK\033[0m   %-58s %s\n' "$1" "$3"; OK=$((OK+1))
  else
    printf '  \033[31mFALLA\033[0m %-58s esperado=%s obtenido=%s\n' "$1" "$2" "$3"; FALLO=$((FALLO+1))
  fi
}

estado() { c -o /dev/null -w '%{http_code}' "$@"; }

echo "== Salud (publica) =="
SALUD=$(c "$BASE/api/salud")
verificar "GET /api/salud responde ok" "true" "$(echo "$SALUD" | jq -r .ok)"
verificar "el sistema quedo sembrado" "true" "$(echo "$SALUD" | jq -r .datos.sembrado)"

echo "== Sin sesion =="
verificar "GET /api/empleados sin sesion" "401" "$(estado "$BASE/api/empleados")"
verificar "GET /api/panel sin sesion" "401" "$(estado "$BASE/api/panel")"
verificar "ruta inexistente" "404" "$(estado "$BASE/api/no-existe")"
# Una ruta que existe pero no para ese verbo debe dar 405, no 404: decir "no
# existe" cuando existe manda a depurar en la direccion equivocada.
verificar "metodo no permitido" "405" "$(estado -X DELETE "$BASE/api/salud")"
verificar "el 405 incluye la cabecera Allow" "1" \
  "$(curl -s -D - -o /dev/null -X DELETE "$BASE/api/salud" | grep -ci '^allow:')"

echo "== Login =="
verificar "login con clave incorrecta" "401" \
  "$(estado -X POST -H 'Content-Type: application/json' -d '{"email":"admin@ecotech.com","contrasena":"incorrecta123"}' "$BASE/api/auth/login")"
verificar "login con email inexistente" "401" \
  "$(estado -X POST -H 'Content-Type: application/json' -d '{"email":"nadie@ecotech.com","contrasena":"EcoTech#2026Admin"}' "$BASE/api/auth/login")"

SESION=$(c -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@ecotech.com","contrasena":"EcoTech#2026Admin"}' "$BASE/api/auth/login")
verificar "login correcto" "true" "$(echo "$SESION" | jq -r .ok)"
CSRF=$(echo "$SESION" | jq -r .datos.tokenCsrf)
verificar "rol devuelto" "ADMIN_RRHH" "$(echo "$SESION" | jq -r .datos.usuario.rol)"
verificar "obliga a cambiar la clave inicial" "true" "$(echo "$SESION" | jq -r .datos.usuario.debeCambiarContrasena)"
verificar "cookie __Host- instalada" "1" "$(grep -c '__Host-ecotech_sesion' "$GALLETAS")"

echo "== CSRF =="
verificar "POST sin token CSRF" "403" \
  "$(estado -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/empleados")"
verificar "POST con token CSRF invalido" "403" \
  "$(estado -X POST -H 'Content-Type: application/json' -H 'X-Token-CSRF: falso' -d '{}' "$BASE/api/empleados")"
verificar "POST desde otro origen" "403" \
  "$(estado -X POST -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF" -H 'Origin: https://malicioso.example' -d '{}' "$BASE/api/empleados")"

echo "== Datos sembrados =="
EMPS=$(c "$BASE/api/empleados")
verificar "empleados sembrados" "10" "$(echo "$EMPS" | jq '.datos | length')"
DEPS=$(c "$BASE/api/departamentos")
verificar "departamentos sembrados" "5" "$(echo "$DEPS" | jq '.datos.departamentos | length')"
PRYS=$(c "$BASE/api/proyectos")
verificar "proyectos sembrados" "6" "$(echo "$PRYS" | jq '.datos.proyectos | length')"
PANEL=$(c "$BASE/api/panel")
verificar "panel devuelve metricas" "true" "$(echo "$PANEL" | jq -r '.datos.totalEmpleados > 0')"
verificar "hay horas cargadas" "true" "$(echo "$PANEL" | jq -r '(.datos.horasPorProyecto | length) > 0')"

echo "== Cifrado y permisos sobre datos personales =="
ID1=$(echo "$EMPS" | jq -r '.datos[0].id')
verificar "el listado enmascara datos sensibles" "true" "$(echo "$EMPS" | jq -r '.datos[0].sensiblesEnmascarados')"
UNO=$(c "$BASE/api/empleados/$ID1")
verificar "RRHH ve el detalle descifrado" "false" "$(echo "$UNO" | jq -r '.datos.sensiblesEnmascarados')"
verificar "el documento se descifro" "true" "$(echo "$UNO" | jq -r '.datos.datosSensibles.documento != "********"')"

echo "== Validacion de entrada =="
verificar "cuerpo con campo no declarado" "400" \
  "$(estado -X POST -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF" \
     -d '{"nombre":"Ana","apellido":"Test","emailCorporativo":"a@ecotech.com","tipoContrato":"ASALARIADO","fechaInicioContrato":"2026-01-01","documento":"99887766","telefono":"+54 11 5555555","direccion":"Calle 1 234","emailPersonal":"ana@x.com","salarioMensual":100000,"rol":"ADMIN_RRHH"}' \
     "$BASE/api/empleados")"
# Nota: no se usa "../usuarios" porque curl normaliza el ".." antes de enviar.
verificar "identificador invalido en la ruta" "400" "$(estado "$BASE/api/empleados/no-es-un-uuid")"
verificar "sin Content-Type JSON" "400" \
  "$(estado -X POST -H "X-Token-CSRF: $CSRF" -d 'nombre=Ana' "$BASE/api/empleados")"

echo "== Alta de empleado y control de duplicados =="
NUEVO='{"nombre":"Ana","apellido":"Prueba","emailCorporativo":"a.prueba@ecotech.com","tipoContrato":"POR_HORAS","fechaInicioContrato":"2026-01-15","documento":"99887766","telefono":"+54 11 55550000","direccion":"Calle Falsa 123","emailPersonal":"ana.prueba@correo.com","tarifaHora":9500}'
ALTA=$(c -X POST -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF" -d "$NUEVO" "$BASE/api/empleados")
verificar "alta de empleado" "true" "$(echo "$ALTA" | jq -r .ok)"
NUEVO_ID=$(echo "$ALTA" | jq -r .datos.id)
verificar "legajo asignado automaticamente" "true" "$(echo "$ALTA" | jq -r '.datos.legajo | startswith("ECO-")')"
verificar "documento duplicado rechazado" "409" \
  "$(estado -X POST -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF" -d "$NUEVO" "$BASE/api/empleados")"
verificar "no se puede cambiar el tipo de contrato" "422" \
  "$(estado -X PATCH -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF" -d '{"tipoContrato":"ASALARIADO"}' "$BASE/api/empleados/$NUEVO_ID")"

echo "== Reglas de negocio: asignaciones =="
PRY_CURSO=$(echo "$PRYS" | jq -r '[.datos.proyectos[] | select(.estado=="EN_CURSO")][0].id')
PRY_FIN=$(echo "$PRYS" | jq -r '[.datos.proyectos[] | select(.estado=="FINALIZADO")][0].id')
ASIG=$(c -X POST -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF" \
  -d "{\"empleadoId\":\"$NUEVO_ID\",\"proyectoId\":\"$PRY_CURSO\",\"rolProyecto\":\"DESARROLLADOR\",\"porcentajeDedicacion\":60}" "$BASE/api/asignaciones")
verificar "asignacion creada" "true" "$(echo "$ASIG" | jq -r .ok)"
verificar "asignacion duplicada rechazada" "409" \
  "$(estado -X POST -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF" \
     -d "{\"empleadoId\":\"$NUEVO_ID\",\"proyectoId\":\"$PRY_CURSO\",\"rolProyecto\":\"QA\",\"porcentajeDedicacion\":10}" "$BASE/api/asignaciones")"
if [ "$PRY_FIN" != "null" ]; then
  verificar "no se asigna a proyecto cerrado" "422" \
    "$(estado -X POST -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF" \
       -d "{\"empleadoId\":\"$NUEVO_ID\",\"proyectoId\":\"$PRY_FIN\",\"rolProyecto\":\"QA\",\"porcentajeDedicacion\":10}" "$BASE/api/asignaciones")"
fi
PRY_OTRO=$(echo "$PRYS" | jq -r "[.datos.proyectos[] | select(.estado==\"EN_CURSO\" and .id!=\"$PRY_CURSO\")][0].id")
verificar "sobreasignacion (60+50>100) rechazada" "422" \
  "$(estado -X POST -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF" \
     -d "{\"empleadoId\":\"$NUEVO_ID\",\"proyectoId\":\"$PRY_OTRO\",\"rolProyecto\":\"QA\",\"porcentajeDedicacion\":50}" "$BASE/api/asignaciones")"

echo "== Reglas de negocio: proyectos =="
PRY_PLAN=$(echo "$PRYS" | jq -r '[.datos.proyectos[] | select(.estado=="PLANIFICADO")][0].id')
verificar "transicion PLANIFICADO -> FINALIZADO rechazada" "422" \
  "$(estado -X PUT -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF" -d '{"estado":"FINALIZADO"}' "$BASE/api/proyectos/$PRY_PLAN/estado")"
verificar "transicion PLANIFICADO -> EN_CURSO aceptada" "200" \
  "$(estado -X PUT -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF" -d '{"estado":"EN_CURSO"}' "$BASE/api/proyectos/$PRY_PLAN/estado")"
verificar "cuerpo JSON mal formado" "400" \
  "$(estado -X PUT -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF" -d '{roto' "$BASE/api/proyectos/$PRY_PLAN/estado")"

echo "== Reglas de negocio: departamentos =="
DEP_CON_GENTE=$(echo "$DEPS" | jq -r '.datos.departamentos[0].id')
verificar "no se borra un departamento con empleados" "422" \
  "$(estado -X DELETE -H "X-Token-CSRF: $CSRF" "$BASE/api/departamentos/$DEP_CON_GENTE")"
verificar "nombre de departamento duplicado" "409" \
  "$(estado -X POST -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF" -d '{"nombre":"  ventas  "}' "$BASE/api/departamentos")"

echo "== Informes =="
for T in empleados departamentos proyectos horas nomina; do
  verificar "informe $T en json" "200" "$(estado "$BASE/api/reportes/$T?formato=json")"
done
verificar "tipo de informe invalido" "400" "$(estado "$BASE/api/reportes/inventado")"
for F in csv xlsx pdf; do
  verificar "descarga de informe en $F" "200" "$(estado "$BASE/api/reportes/empleados?formato=$F")"
done
TIPO_PDF=$(c -o /dev/null -w '%{content_type}' "$BASE/api/reportes/horas?formato=pdf")
verificar "content-type del PDF" "application/pdf" "$TIPO_PDF"

echo "== Auditoria =="
AUD=$(c "$BASE/api/auditoria?limite=50")
verificar "la auditoria registro operaciones" "true" "$(echo "$AUD" | jq -r '(.datos | length) > 0')"
verificar "registro el login exitoso" "true" "$(echo "$AUD" | jq -r '[.datos[] | select(.accion=="LOGIN_EXITOSO")] | length > 0')"
verificar "registro los login fallidos" "true" "$(echo "$AUD" | jq -r '[.datos[] | select(.accion=="LOGIN_FALLIDO")] | length > 0')"
verificar "registro el alta de empleado" "true" "$(echo "$AUD" | jq -r '[.datos[] | select(.accion|startswith("EMPLEADO"))] | length > 0')"

echo "== Cabeceras de seguridad =="
CAB=$(c -D - -o /dev/null "$BASE/api/salud")
verificar "Content-Security-Policy" "1" "$(echo "$CAB" | grep -ci 'content-security-policy')"
verificar "CSP niega por defecto" "1" "$(echo "$CAB" | grep -ci "default-src 'none'")"
verificar "X-Content-Type-Options" "1" "$(echo "$CAB" | grep -ci 'x-content-type-options: nosniff')"
verificar "sin cache de datos" "1" "$(echo "$CAB" | grep -ci 'cache-control: no-store')"

echo "== Rol EMPLEADO: aislamiento de datos =="
c -X POST -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF" -o /dev/null "$BASE/api/auth/logout"
SES_EMP=$(c -X POST -H 'Content-Type: application/json' \
  -d '{"email":"empleado@ecotech.com","contrasena":"EcoTech#2026Admin"}' "$BASE/api/auth/login")
CSRF_EMP=$(echo "$SES_EMP" | jq -r .datos.tokenCsrf)
EMP_ID=$(echo "$SES_EMP" | jq -r .datos.usuario.empleadoId)
verificar "login como empleado" "EMPLEADO" "$(echo "$SES_EMP" | jq -r .datos.usuario.rol)"
verificar "el empleado NO puede crear empleados" "403" \
  "$(estado -X POST -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF_EMP" -d "$NUEVO" "$BASE/api/empleados")"
verificar "el empleado NO ve la auditoria" "403" "$(estado "$BASE/api/auditoria")"
verificar "el empleado NO accede a la nomina" "403" "$(estado "$BASE/api/reportes/nomina?formato=json")"
verificar "el empleado NO ve datos sensibles ajenos" "true" \
  "$(c "$BASE/api/empleados/$ID1" | jq -r '.datos.sensiblesEnmascarados')"
HORAS_AJENAS=$(c "$BASE/api/registros-tiempo?empleadoId=$ID1")
SOLO_PROPIAS=$(echo "$HORAS_AJENAS" | jq -r "[.datos[] | select(.empleadoId != \"$EMP_ID\")] | length")
verificar "el filtro empleadoId ajeno se ignora (IDOR)" "0" "$SOLO_PROPIAS"

echo "== Rol AUDITOR: solo lectura =="
c -X POST -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF_EMP" -o /dev/null "$BASE/api/auth/logout"
SES_AUD=$(c -X POST -H 'Content-Type: application/json' \
  -d '{"email":"auditor@ecotech.com","contrasena":"EcoTech#2026Admin"}' "$BASE/api/auth/login")
CSRF_AUD=$(echo "$SES_AUD" | jq -r .datos.tokenCsrf)
verificar "el auditor SI lee la auditoria" "200" "$(estado "$BASE/api/auditoria")"
verificar "el auditor NO crea proyectos" "403" \
  "$(estado -X POST -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF_AUD" \
     -d '{"nombre":"Proyecto auditor","fechaInicio":"2026-01-01"}' "$BASE/api/proyectos")"
verificar "el auditor NO carga horas" "403" \
  "$(estado -X POST -H 'Content-Type: application/json' -H "X-Token-CSRF: $CSRF_AUD" \
     -d "{\"proyectoId\":\"$PRY_CURSO\",\"fecha\":\"2026-08-20\",\"horas\":4,\"descripcion\":\"Prueba de auditor sin permiso\"}" "$BASE/api/registros-tiempo")"

echo "== Frontend =="
verificar "index.html se sirve" "200" "$(estado "$BASE/")"
verificar "ruta de SPA cae en index.html" "200" "$(estado "$BASE/panel")"
verificar "el bundle se sirve" "200" "$(estado "$BASE/app.js")"
verificar "la hoja de estilos se sirve" "200" "$(estado "$BASE/estilos.css")"

rm -f "$GALLETAS"
echo
printf 'RESULTADO: \033[32m%d correctas\033[0m, \033[31m%d fallos\033[0m\n' "$OK" "$FALLO"
[ "$FALLO" -eq 0 ]
