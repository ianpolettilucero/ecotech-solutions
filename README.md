# EcoTech Solutions — Sistema de Gestión Interna

Sistema de gestión de empleados, departamentos, proyectos y registro de horas,
construido con programación orientada a objetos y desplegado en **Cloudflare
Workers** con **Workers KV** como almacén, sin base de datos relacional.

**En producción:** <https://ecotech-solutions.ianypico.workers.dev>
Estado del despliegue: <https://ecotech-solutions.ianypico.workers.dev/api/salud>

> **Documentación completa en [`docs/`](docs/README.md).** El análisis del
> dominio, la evaluación crítica de los modelos preliminares, el diagrama de
> clases UML y la justificación de cada decisión de diseño están en los cuatro
> primeros documentos.

---

## Qué resuelve

La empresa gestionaba su información en hojas de cálculo, con cinco
consecuencias. El sistema ataca cada una con un mecanismo concreto:

| Problema | Mecanismo |
|---|---|
| Duplicidad de empleados | Identificador único automático e índice ciego HMAC sobre documento y correo, verificado antes de cada alta |
| Errores de asignación a proyectos | Clase de asociación con vigencia temporal y tope de dedicación acumulada del 100 % |
| Falta de trazabilidad de horas | Circuito `BORRADOR → ENVIADO → APROBADO / RECHAZADO`, con separación de funciones y registro de auditoría inmutable |
| Informes poco confiables | Una clase por informe, con las reglas de cálculo escritas una sola vez; solo las horas aprobadas computan |
| Riesgo sobre datos personales | Datos personales cifrados con AES-256-GCM y lectura condicionada a permiso |

---

## Puesta en marcha

```bash
npm install
npm run typecheck     # los tres proyectos: worker, cliente y pruebas
npm test              # 81 pruebas unitarias
npm run test:responsive  # 189 comprobaciones de diseno adaptable (requiere wrangler dev)
npm run build         # compila el frontend a dist/
npx wrangler dev      # entorno local en http://localhost:8787
```

Despliegue y configuración de secretos: [`docs/10-despliegue.md`](docs/10-despliegue.md).

### Credenciales de demostración

El sistema se siembra solo en el primer arranque con datos de ejemplo (cinco
departamentos, diez empleados, seis proyectos y seis semanas de partes de horas).

| Cuenta | Rol | Qué puede hacer |
|---|---|---|
| `admin@ecotech.com` | Administración de RRHH | Gestionar personas, departamentos y proyectos; ver datos personales y nómina |
| `gerente@ecotech.com` | Gerencia | Gestionar proyectos y asignaciones; aprobar horas |
| `empleado@ecotech.com` | Empleado | Cargar sus propias horas y consultar el organigrama |
| `auditor@ecotech.com` | Auditoría | Solo lectura, incluida la traza de auditoría |

Contraseña inicial: `EcoTech#2026Admin` — el sistema obliga a cambiarla en el
primer ingreso. En un despliegue real se define el secreto
`CLAVE_ADMIN_INICIAL` y esta contraseña nunca llega a usarse.

> **Antes de usarlo con datos reales**, defina el secreto `CLAVE_MAESTRA`
> (mínimo 32 caracteres). Sin él, los datos personales se cifran con una clave
> pública de desarrollo, y `GET /api/salud` lo reporta explícitamente.

---

## Estructura

```
src/
├── compartido/        DTOs y tipos que comparten servidor y cliente
├── dominio/           Núcleo POO, sin dependencias hacia afuera
│   ├── base/            Entidad (abstracta), jerarquía de errores, identificadores
│   ├── personas/        Persona → Empleado → {Asalariado, PorHoras, Contratista}
│   ├── organizacion/    Departamento, Proyecto, AsignacionProyecto
│   ├── tiempo/          RegistroTiempo con su circuito de aprobación
│   ├── seguridad/       Usuario, Sesion, PoliticaAutorizacion (RBAC)
│   ├── auditoria/       RegistroAuditoria (inmutable)
│   ├── validacion/      Regla (jerarquía) y Esquema
│   ├── fabricas/        FabricaEmpleados
│   └── reportes/        Reporte (método plantilla) + 5 informes + 4 exportadores
├── infraestructura/   AlmacenKV, RepositorioKV, ServicioCripto, LimitadorTasa
├── aplicacion/        Contexto (contenedor) y servicios de caso de uso
├── worker/            Punto de entrada, enrutador, cabeceras y rutas de la API
└── cliente/           SPA en TypeScript, sin dependencias en tiempo de ejecución
```

La **regla de dependencia** es estricta: el dominio no conoce a nadie hacia
afuera, y los servicios dependen de la abstracción `Repositorio<T>`, nunca de
Workers KV. Esa frontera es lo que permitiría cambiar de almacén sin tocar una
sola regla de negocio.

---

## Dónde mirar el trabajo de POO

| Concepto | Archivo | Qué demuestra |
|---|---|---|
| Herencia y polimorfismo | `src/dominio/personas/` | Tres modalidades de contrato con tres fórmulas de remuneración; el motor de nómina las liquida sin un solo condicional |
| Método plantilla | `src/dominio/reportes/Reporte.ts` | La forma del informe se escribe una vez; las subclases aportan solo lo que las distingue |
| Fábrica | `src/dominio/fabricas/FabricaEmpleados.ts` | Único punto del sistema que menciona las clases concretas de empleado |
| Clase de asociación | `src/dominio/organizacion/AsignacionProyecto.ts` | El muchos-a-muchos con atributos propios, que sostiene la trazabilidad |
| Encapsulamiento real | `src/dominio/tiempo/RegistroTiempo.ts` | `aprobar(jefe)` en lugar de `setEstado(...)`: el invariante no se puede saltar |
| Abstracción de la persistencia | `src/infraestructura/Repositorio.ts` | Una interfaz que no menciona KV; una sola clase genérica sirve a siete colecciones |
| Polimorfismo de errores | `src/dominio/base/errores.ts` | La capa HTTP pregunta al error por su código; no encadena `instanceof` |

---

## Decisiones que conviene conocer antes de usarlo

- La **baja de un empleado es lógica**, no física, y arrastra tres efectos:
  libera la gerencia de los departamentos que dirigiera, cierra sus asignaciones
  activas y desactiva su cuenta.
- **No se puede cambiar el tipo de contrato** de un empleado: es un contrato
  nuevo, y el sistema exige dar de baja y alta.
- **Nadie aprueba sus propias horas**, y un registro aprobado no se edita sin
  rechazarlo antes; el rechazo exige un motivo y queda en la auditoría.
- **No se imputan horas a un proyecto sin una asignación vigente** a esa fecha,
  ni a un proyecto que no esté en curso.
- La suma de dedicaciones activas de un empleado **no puede superar el 100 %**.
- Un departamento **con empleados activos no se elimina**: hay que reasignarlos
  primero.

Todas están explicadas en el [manual de usuario](docs/09-manual-usuario.md) y
justificadas en [la documentación de diseño](docs/04-justificacion-diseno.md).

---

## Limitaciones conocidas

Workers KV es un almacén clave-valor eventualmente consistente, sin
transacciones ni claves foráneas. Las consecuencias concretas —y las
mitigaciones aplicadas— están en
[`docs/08-modelo-datos-kv.md`](docs/08-modelo-datos-kv.md). No hay rotación
automática de la clave de cifrado ni segundo factor de autenticación; el
inventario completo está en
[`docs/06-seguridad.md`](docs/06-seguridad.md).
