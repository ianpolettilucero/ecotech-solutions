# 11. Pruebas

> Qué se verifica de forma automática, qué no, y cómo comprobar a mano lo que
> las pruebas automáticas no cubren.

## Contenido

- [11.1. Cómo se ejecutan](#111-cómo-se-ejecutan)
- [11.2. Pruebas unitarias](#112-pruebas-unitarias)
- [11.3. Prueba de humo de la API](#113-prueba-de-humo-de-la-api)
- [11.4. Qué NO está cubierto](#114-qué-no-está-cubierto)
- [11.5. Plan de pruebas manuales](#115-plan-de-pruebas-manuales)
- [11.6. Verificación tras un despliegue](#116-verificación-tras-un-despliegue)

---

## 11.1. Cómo se ejecutan

```bash
npm run typecheck   # comprobación de tipos de los tres proyectos
npm test            # 80 pruebas unitarias
npm run build       # typecheck + compilación del frontend a dist/
```

`npm test` hace dos cosas: `scripts/build-tests.mjs` transpila `src/` y `tests/`
a `build-tests/` conservando la estructura de carpetas, y después
`node --test build-tests/tests/*.test.js` ejecuta el resultado.

**Por qué se transpila en lugar de usar el borrado de tipos nativo de Node.** El
borrado nativo (`--experimental-strip-types`) no admite varias construcciones que
el proyecto usa, y obligaría a escribir el dominio peor para complacer a la
herramienta. esbuild transpila todo en milisegundos y sin restricciones. Se
compila **sin empaquetar** (`bundle: false`) a propósito, para que cada módulo
siga siendo un archivo y los fallos señalen el archivo real y no una línea de un
bundle.

**Por qué el patrón de archivo y no el directorio.** `node --test build-tests/tests/`
falla en Node 22 al tratar el directorio como módulo. El comando usa el patrón
`build-tests/tests/*.test.js`, que el intérprete de órdenes expande.

### Comprobación de tipos en tres proyectos

| Proyecto | Entorno | Incluye |
|---|---|---|
| `tsconfig.worker.json` | Workers, **sin** librería DOM | `compartido`, `dominio`, `infraestructura`, `aplicacion`, `worker` |
| `tsconfig.cliente.json` | Navegador, **sin** tipos de Cloudflare | `compartido`, `cliente` |
| `tsconfig.tests.json` | Node + Cloudflare | `tests`, `compartido`, `dominio`, `infraestructura` |

La separación no es cosmética. Las definiciones de ambos entornos declaran
globales homónimos con firmas incompatibles —`HTMLSelectElement.remove` devuelve
`void` en el DOM y `Element` en los tipos de Workers—, de modo que compilarlos
juntos produce errores que no corresponden a ningún fallo real. Además, el
proyecto del Worker excluye la librería DOM, así que usar `document` o `window`
en el servidor es un error de compilación y no un fallo en producción.

---

## 11.2. Pruebas unitarias

80 pruebas en 19 grupos, repartidas en tres archivos.

### `tests/dominio.test.ts` — 35 pruebas

| Grupo | Qué fija |
|---|---|
| Polimorfismo de la remuneración | Las tres fórmulas: importe fijo, horas con recargo del 1,5× sobre 160 h, y horas con tope mensual. Incluye la prueba clave: un mismo `reduce` liquida las tres modalidades y **no contiene ningún condicional sobre el tipo** |
| `FabricaEmpleados` | Rehidrata la subclase correcta desde el estado persistido; un tipo desconocido falla en vez de devolver un empleado con remuneración cero |
| Empleado y departamento | Reasignar reemplaza en lugar de acumular; la baja es lógica y desvincula; el DTO enmascara datos sensibles y remuneración cuando no llegan descifrados |
| `Departamento` | Normalización del nombre para detectar duplicados; `liberarSiEsGerente` solo actúa sobre el gerente real |
| Máquina de estados de `Proyecto` | Transiciones válidas e inválidas; solo `EN_CURSO` admite horas; detección de exceso de presupuesto |
| `AsignacionProyecto` | `estabaVigenteEn` en los bordes del rango; desasignar preserva el histórico; no se cierra antes de empezar; una asignación cerrada no se modifica |
| Circuito de aprobación de horas | El recorrido completo; nadie aprueba sus propias horas; el rechazo exige motivo y devuelve el registro al empleado; un registro aprobado no se edita; no se cargan horas futuras |
| `PoliticaAutorizacion` | Denegación por defecto; el auditor no escribe nada; la gerencia no ve datos personales ni nómina; RRHH no aprueba horas; la matriz devuelta es una copia y no se puede mutar |

### `tests/seguridad.test.ts` — 28 pruebas

| Grupo | Qué fija |
|---|---|
| Contraseñas | Misma clave con sal distinta produce hash distinto; verificación correcta e incorrecta; una sal corrupta devuelve `false` en vez de lanzar |
| Cifrado de datos personales | Ciclo cifrar/descifrar; dos cifrados del mismo texto no coinciden (IV aleatorio); AES-GCM detecta la manipulación del texto cifrado; otra clave maestra no abre el sobre |
| Índice ciego | Determinista y normalizado; no revela el valor original; comparación en tiempo constante |
| Validación de entrada | Eliminación de caracteres de control (byte nulo y `CRLF`, que son el vehículo de la inyección de cabeceras); política de contraseñas; fechas imposibles del calendario; el identificador rechaza `../usuarios` y `1 OR 1=1` |
| `Esquema` | Rechaza campos no declarados (cierra el *mass assignment*); rechaza `__proto__`; acumula todos los fallos; la variante parcial valida lo que llega |
| Bloqueo por fuerza bruta | Bloqueo al quinto intento; el bloqueo es **temporal**, no permanente; un acceso correcto limpia el contador; el DTO nunca expone hash ni sal |

### `tests/exportadores.test.ts` — 17 pruebas

| Grupo | Qué fija |
|---|---|
| `FabricaExportadores` | Devuelve la clase concreta de cada formato; rechaza un formato desconocido; el nombre de archivo es seguro para una cabecera HTTP; los cuatro formatos producen bytes sobre el mismo reporte |
| CSV | BOM UTF-8 y saltos CRLF para que Excel lo abra bien; escapado RFC 4180; **neutralización de fórmulas** (`=HYPERLINK` sale con apóstrofo delante); fila de totales |
| XLSX | Firma de ZIP correcta al principio y EOCD al final; las seis partes obligatorias de un libro OOXML; el número de entradas del EOCD coincide con las partes escritas |
| PDF | Cabecera de versión y `%%EOF`; **el desplazamiento de `startxref` apunta al byte exacto de la tabla**; la paginación no pierde ninguna fila sobre 120 registros; la cabecera se repite en cada página |

La prueba del desplazamiento de `startxref` merece una nota: es el fallo más
fácil de cometer escribiendo un PDF a mano. Si algún tramo del documento se
codifica en UTF-8 en vez de latin1, los desplazamientos se corren un byte por
cada carácter no ASCII y **ningún lector abre el archivo**. La prueba lee el
valor y comprueba que en esa posición exacta empiece la palabra `xref`.

---

## 11.3. Prueba de humo de la API

`scripts/humo.sh` recorre la API real de extremo a extremo: 64 comprobaciones
que ejercitan el sistema completo con KV, criptografía y control de acceso de
verdad, no dobles de prueba.

```bash
npx wrangler dev            # en una terminal
./scripts/humo.sh           # en otra (usa http://127.0.0.1:8787 por defecto)
./scripts/humo.sh https://ecotech-solutions.ianypico.workers.dev
```

Cubre, por bloques:

| Bloque | Ejemplos de lo que verifica |
|---|---|
| Salud y acceso anónimo | La sonda responde; los recursos protegidos devuelven 401; una ruta inexistente devuelve 404 |
| Autenticación | Clave incorrecta y correo inexistente devuelven **el mismo** 401; el login correcto instala la cookie `__Host-`; obliga a cambiar la clave inicial |
| CSRF | Sin token, con token inválido y desde otro origen devuelven 403 |
| Datos sembrados | 10 empleados, 5 departamentos, 6 proyectos y horas cargadas |
| Cifrado y permisos | El listado enmascara los datos personales; el detalle los descifra para RRHH |
| Validación | Un campo no declarado devuelve 400; un identificador inválido devuelve 400; un cuerpo sin `Content-Type: application/json` devuelve 400; un JSON mal formado devuelve 400 |
| Duplicidad | Un documento repetido devuelve 409; el tipo de contrato no se puede cambiar |
| Reglas de asignación | Asignación duplicada 409; proyecto cerrado 422; **sobreasignación por encima del 100 % 422** |
| Estados de proyecto | Una transición ilegítima devuelve 422; una legítima devuelve 200 |
| Departamentos | No se borra uno con empleados; nombre duplicado 409 |
| Informes | Los cinco tipos en JSON; descarga real en CSV, XLSX y PDF con su tipo MIME |
| Auditoría | Quedaron asientos del login correcto, de los fallidos y del alta de empleado |
| Cabeceras | `Content-Security-Policy` con `default-src 'none'`, `nosniff`, `no-store` |
| Aislamiento por rol | Un EMPLEADO no crea empleados, no ve la auditoría, no accede a la nómina, no ve datos personales ajenos y **el filtro `empleadoId` de otro se ignora** (comprobación de IDOR) |
| Rol AUDITOR | Lee la auditoría pero no crea proyectos ni carga horas |
| Frontend | `index.html`, una ruta de SPA, el bundle y la hoja de estilos se sirven |

---

## 11.3b. Auditoría de diseño adaptable

`scripts/responsive.mjs` recorre con Playwright la pantalla de acceso y los
nueve módulos en seis tamaños —320×568, 375×667, 390×844, 844×390 (apaisado),
768×1024 y 1440×900— y falla si encuentra alguno de estos defectos:

- la página se desplaza en horizontal;
- un elemento sobresale de su contenedor (el defecto que no se ve midiendo solo
  contra la ventana);
- la tarjeta de acceso queda cortada por arriba —el clásico de centrar con
  `place-items: center` un contenido más alto que la ventana, cuya zona superior
  **no** se alcanza desplazándose—;
- el botón de ingresar cae fuera de la vista;
- una tabla necesita desplazamiento lateral por debajo de 900 px, donde debería
  estar en modo de fichas. Por encima de ese ancho no se comprueba: ahí el
  desplazamiento dentro de `.tabla-contenedor` es el comportamiento buscado.

```bash
npx wrangler dev                                   # en una terminal
npm run test:responsive                            # en otra
npm run test:responsive -- https://mi-despliegue   # o contra una URL
```

Usa `playwright-core`, que **no** descarga navegadores al instalarse: ni el
despliegue de Cloudflare ni una instalación limpia pagan 150 MB por una
herramienta que solo se usa a mano. Hay que apuntarle a un Chromium existente
con `PLAYWRIGHT_CHROMIUM=/ruta/a/chrome`, o dejar que lo busque en las rutas
habituales del sistema. Con `CAPTURAS=/ruta` guarda una captura por pantalla y
tamaño.

Son 189 comprobaciones. Dos defectos reales salieron de aquí y no de la
inspección visual: la tarjeta de acceso con un ancho mínimo intrínseco de 301 px
en un teléfono de 320, y la celda «Email corporativo» ensanchando la ficha en el
mismo tamaño. Los dos por la misma causa —texto sin puntos de corte— y ninguno
visible por encima de 360 px.

---

## 11.4. Qué NO está cubierto

Con franqueza, porque un apartado de pruebas que solo enumera aciertos no sirve
para decidir dónde mirar cuando algo falla.

**Los servicios de aplicación no tienen pruebas unitarias.** Necesitarían un
doble de `KVNamespace`. Están cubiertos indirectamente por la prueba de humo, que
los ejercita a través de la API, pero no hay pruebas que aíslen, por ejemplo, el
comportamiento de `ServicioEmpleados.actualizar` ante una colisión de índice
ciego concurrente.

**El Worker no tiene pruebas de integración automatizadas en CI.** La prueba de
humo requiere un servidor levantado y se ejecuta a mano.

**El cliente no tiene pruebas unitarias.** Su verificación es de comportamiento,
con un navegador real: 37 comprobaciones de flujo (login, cambio de contraseña,
navegación por los nueve módulos, contenido de las tablas, modales, modo oscuro
y recorte del menú por rol) y las 189 de `npm run test:responsive`. La segunda
sí forma parte del repositorio; la primera todavía no.

**No hay pruebas de concurrencia.** El modelo de "el último en escribir gana" de
una colección de KV no está ejercitado con escrituras simultáneas. Es la
limitación conocida del almacén, documentada en
[08-modelo-datos-kv.md](08-modelo-datos-kv.md).

**No hay pruebas de carga.** Se desconoce a partir de cuántos registros el
tiempo de respuesta deja de ser aceptable.

**El límite de tasa no está probado automáticamente.** Verificarlo exigiría
esperar la ventana o manipular el reloj.

---

## 11.5. Plan de pruebas manuales

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1 | Primer acceso | Entrar con `admin@ecotech.com` / `EcoTech#2026Admin` | Entra y **queda retenido en Mi perfil** con un aviso de que debe cambiar la contraseña |
| 2 | Bloqueo hasta rotar la clave | Intentar ir a Empleados sin haber cambiado la clave | Rebota a Mi perfil con el mismo aviso |
| 3 | Repetición que no coincide | En Mi perfil, escribir una contraseña nueva y una repetición distinta | Error en pantalla; **no se envía nada al servidor** |
| 4 | Contraseña débil | Probar `password1234` como nueva | El servidor la rechaza indicando la política |
| 5 | Rotación correcta | Cambiar la contraseña por una válida | Aviso de éxito; el menú deja de rebotar |
| 6 | Empleado duplicado | Dar de alta un empleado con un documento ya existente | Error 409 con el legajo del registro que choca |
| 7 | Cambio de contrato | Editar un empleado y cambiarle el tipo de contrato | Error 422 explicando que hay que dar de baja y alta |
| 8 | Baja en cascada | Dar de baja a un empleado que dirige un departamento y tiene asignaciones | Queda inactivo; el departamento queda **vacante**; sus asignaciones se cierran con fecha de hoy; su cuenta se desactiva |
| 9 | Departamento con gente | Intentar eliminar un departamento con empleados activos | Error 422 indicando cuántos hay que reasignar primero |
| 10 | Nombre duplicado | Crear un departamento llamado `  ventas  ` | Error 409: la normalización detecta el duplicado |
| 11 | Sobreasignación | Asignar a alguien con 60 % a un segundo proyecto con 50 % | Error 422 indicando cuánta dedicación le queda |
| 12 | Proyecto cerrado | Asignar personal a un proyecto FINALIZADO | Error 422 |
| 13 | Transición ilegítima | Pasar un proyecto de PLANIFICADO a FINALIZADO | Error 422 con la lista de transiciones válidas |
| 14 | Horas sin asignación | Cargar horas a un proyecto en el que no se participa | Error 422 |
| 15 | Horas futuras | Cargar horas con fecha de mañana | Error 400 |
| 16 | Tope diario | Cargar más de 16 h en un mismo día | Error 422 indicando cuántas lleva ya |
| 17 | Auto-aprobación | Enviar unas horas propias e intentar aprobarlas | Error 422: separación de funciones |
| 18 | Rechazo | Rechazar unas horas sin motivo, y luego con motivo | Primero error; después el registro vuelve al empleado con el motivo visible |
| 19 | Los cuatro formatos | Descargar cada informe en JSON, CSV, XLSX y PDF | El XLSX abre en Excel sin advertencias; el PDF abre y todas las filas están |
| 20 | Nómina denegada | Entrar como GERENTE e intentar el informe de nómina | Error 403 |
| 21 | Aislamiento de horas | Entrar como EMPLEADO y pedir `/api/registros-tiempo?empleadoId=<ajeno>` | Devuelve **solo las propias**: el filtro se ignora |
| 22 | Datos personales | Entrar como GERENTE y abrir la ficha de un empleado | Los datos personales llegan enmascarados, con explicación |
| 23 | Menú por rol | Entrar con cada uno de los cuatro roles | El menú lateral solo muestra los módulos permitidos |
| 24 | Auditoría | Entrar como AUDITOR y revisar la traza | Aparecen los intentos de login fallidos y las altas |
| 25 | Adaptable | Abrir en un móvil o reducir a 390 px | La barra lateral pasa abajo; ninguna tabla desborda la página |

---

## 11.6. Verificación tras un despliegue

```bash
curl -s https://ecotech-solutions.ianypico.workers.dev/api/salud | jq
```

Debe responder:

```json
{
  "ok": true,
  "datos": {
    "estado": "operativo",
    "almacen": "workers-kv",
    "sembrado": true,
    "cifradoConClaveDeDesarrollo": false,
    "advertencia": null
  }
}
```

Los dos campos que hay que mirar:

- **`sembrado: true`** — la siembra inicial se completó y hay usuarios con los
  que entrar.
- **`cifradoConClaveDeDesarrollo: false`** — el secreto `CLAVE_MAESTRA` está
  definido. Si sale `true`, los datos personales se están cifrando con una clave
  que figura en el repositorio: defina el secreto antes de cargar nada real
  (ver [10-despliegue.md](10-despliegue.md)).

Y a continuación, la prueba de humo completa contra la URL desplegada:

```bash
./scripts/humo.sh https://ecotech-solutions.ianypico.workers.dev
```

> Ejecutarla contra un entorno con datos reales **crea un empleado de prueba** y
> modifica el estado de un proyecto. Úsela solo contra entornos de prueba, o
> revierta después lo que haya creado.

---

**Anterior:** [10. Despliegue](10-despliegue.md) · **Índice:** [Documentación](README.md)
