# 1. Análisis del problema desde la programación orientada a objetos

> Documento de análisis. Identifica las entidades del dominio de EcoTech
> Solutions y las relaciona con los fundamentos de la POO, mostrando qué
> problema concreto del enunciado resuelve cada decisión.

## Contenido

- [1.1. El problema real, traducido a términos técnicos](#11-el-problema-real-traducido-a-términos-técnicos)
- [1.2. Identificación de las entidades del dominio](#12-identificación-de-las-entidades-del-dominio)
- [1.3. Qué NO es una entidad](#13-qué-no-es-una-entidad)
- [1.4. Los cuatro fundamentos, aplicados](#14-los-cuatro-fundamentos-aplicados)
- [1.5. Trazabilidad entre problemas y solución](#15-trazabilidad-entre-problemas-y-solución)

---

## 1.1. El problema real, traducido a términos técnicos

El enunciado enumera cinco síntomas. Conviene traducirlos antes de modelar,
porque cada uno apunta a una carencia estructural distinta y algunos no se
arreglan con "poner una base de datos".

| Síntoma en la empresa | Causa técnica | Qué exige del modelo |
|---|---|---|
| Duplicidad de información de empleados | No existe una noción de identidad: cada hoja de cálculo tiene su propia fila para la misma persona | Un identificador único por empleado, generado por el sistema, y una comprobación de unicidad sobre atributos naturales (documento, correo) |
| Errores en la asignación de personal a proyectos | La relación empleado–proyecto se representa como texto libre en una celda, sin reglas | Una relación explícita con atributos propios y con invariantes verificables (dedicación total, vigencia temporal) |
| Falta de trazabilidad en el registro de horas | Una celda editable no conserva quién la escribió, cuándo, ni si alguien la validó | Un ciclo de vida con estados y transiciones, más un registro de auditoría separado e inmutable |
| Informes poco confiables | Cada informe se arma a mano con criterios distintos | Una única definición de cada informe, con reglas de cálculo escritas una sola vez |
| Riesgo sobre los datos personales | Los datos viven en claro en archivos que cualquiera con acceso puede abrir | Separar el dato personal del dato laboral, cifrarlo en reposo y condicionar su lectura a un permiso |

La observación importante es que **ninguno de los cinco se resuelve guardando los
mismos datos en otro sitio**. Los cinco se resuelven poniendo reglas donde antes
solo había campos. La POO es el vehículo: una clase es precisamente "datos + las
reglas que los gobiernan, indivisibles".

---

## 1.2. Identificación de las entidades del dominio

Se aplicó el criterio clásico: una entidad es un sustantivo del dominio que
tiene **identidad propia** (dos objetos con los mismos valores no son el mismo
objeto) y un **ciclo de vida** (nace, cambia, termina).

### Entidades

| Entidad | Identidad | Responsabilidad | Archivo |
|---|---|---|---|
| `Persona` (abstracta) | UUID | Datos identificativos y de contacto de una persona física, y su protección | `src/dominio/personas/Persona.ts` |
| `Empleado` (abstracta) | UUID + legajo | Vínculo laboral: contrato, remuneración, pertenencia a un departamento | `src/dominio/personas/Empleado.ts` |
| `EmpleadoAsalariado` | Hereda | Remuneración fija mensual | `src/dominio/personas/EmpleadoAsalariado.ts` |
| `EmpleadoPorHoras` | Hereda | Remuneración por hora con recargo por horas extra | `src/dominio/personas/EmpleadoPorHoras.ts` |
| `Contratista` | Hereda | Remuneración por hora con tope mensual pactado | `src/dominio/personas/Contratista.ts` |
| `Departamento` | UUID | Unidad organizativa; conoce a su gerente | `src/dominio/organizacion/Departamento.ts` |
| `Proyecto` | UUID + código | Trabajo con presupuesto y ciclo de vida propio | `src/dominio/organizacion/Proyecto.ts` |
| `AsignacionProyecto` | UUID | La participación de un empleado en un proyecto, con sus atributos | `src/dominio/organizacion/AsignacionProyecto.ts` |
| `RegistroTiempo` | UUID | Un parte de horas y su circuito de aprobación | `src/dominio/tiempo/RegistroTiempo.ts` |
| `Usuario` | UUID | Credenciales y rol de acceso al sistema | `src/dominio/seguridad/Usuario.ts` |
| `RegistroAuditoria` | UUID | Asiento inmutable de una operación | `src/dominio/auditoria/RegistroAuditoria.ts` |

### La entidad que suele pasarse por alto

`AsignacionProyecto` es la que casi nunca aparece en un primer modelado, y es la
que sostiene medio sistema.

Empleado y Proyecto se relacionan de muchos a muchos. La representación ingenua
es una línea con multiplicidad `*..*` entre ambas clases. No alcanza, porque **el
vínculo tiene datos propios**:

- con qué rol participa esa persona en ese proyecto,
- qué porcentaje de su jornada le dedica,
- desde cuándo y hasta cuándo.

Ninguno de esos atributos pertenece al empleado (cambian según el proyecto) ni al
proyecto (cambian según la persona). Pertenecen a la relación. En UML eso es una
**clase de asociación**; en código, una entidad con identidad propia.

Y de ahí se derivan dos capacidades que el enunciado pide explícitamente:

- La **validación de asignaciones**: se puede exigir que la suma de dedicaciones
  activas de un empleado no supere el 100 %, porque hay un objeto donde
  preguntarlo.
- La **trazabilidad de horas**: al desasignar no se borra la fila, se cierra con
  `fechaDesasignacion`. Las horas cargadas durante ese período conservan un
  vínculo que las explica.

---

## 1.3. Qué NO es una entidad

Modelar bien es, sobre todo, decidir qué dejar fuera. Cuatro candidatos que
fueron descartados a propósito:

**`Gerente`.** Ser gerente es un *rol que se ocupa*, no una naturaleza. Una
persona lo asume y lo deja sin dejar de ser el mismo empleado, con su legajo, sus
horas y su historial. Se modela como la asociación
`Departamento --gerente--> Empleado`. El razonamiento completo está en
[04-justificacion-diseno.md](04-justificacion-diseno.md#41-por-qué-gerente-no-hereda-de-empleado).

**`Rol` y `Permiso`.** Son valores de un conjunto cerrado y conocido, no cosas
con ciclo de vida. Se modelan como uniones de literales en
`src/compartido/tipos.ts` y como una matriz inmutable en `PoliticaAutorizacion`.
Convertirlos en entidades editables habría añadido una tabla, un CRUD y una
pantalla para expresar algo que cabe en veinte líneas y que, además, conviene que
solo cambie con un despliegue revisado.

**`Sistema` / `GestorGeneral`.** La clase que "coordina todo" es el antipatrón
más frecuente de los modelos generados automáticamente. Concentra métodos que
pertenecen a otras clases y acaba siendo un módulo procedural con sintaxis de
objetos. Aquí la coordinación está repartida entre servicios de aplicación con
una responsabilidad cada uno.

**`DatosSensibles`.** Es un objeto de valor, no una entidad: no tiene identidad
propia ni existe fuera de la persona a la que pertenece. Se modela como una
estructura que viaja cifrada dentro de `Persona`.

---

## 1.4. Los cuatro fundamentos, aplicados

### Abstracción

`Entidad` (`src/dominio/base/Entidad.ts`) define *qué* sabe hacer toda entidad
—validarse, serializarse, compararse por identidad— sin decir *cómo*. Los
repositorios trabajan contra ese contrato y funcionan igual con empleados que con
proyectos.

El caso más rentable es `Repositorio<T>` (`src/infraestructura/Repositorio.ts`):
una interfaz que describe la persistencia sin mencionar Workers KV. El dominio y
los servicios dependen de ella, nunca del almacén concreto. Esa frontera es lo
que permitiría cambiar a D1 o PostgreSQL sin tocar una sola regla de negocio, y
lo que hace que el núcleo sea comprobable sin infraestructura.

### Encapsulamiento

No es "poner todo privado y generar getters y setters"; eso deja la clase igual
de expuesta, solo que con más código. El criterio aplicado es: **el estado
interno solo cambia a través de operaciones con nombre de negocio.**

Comparación concreta, en `RegistroTiempo`:

```ts
// Lo que NO se hizo
registro.setEstado('APROBADO');
registro.setAprobadoPor(idJefe);

// Lo que sí
registro.aprobar(idJefe);
```

La segunda forma no es azúcar sintáctico. `aprobar()` comprueba que el registro
estuviera en `ENVIADO`, rechaza que alguien apruebe sus propias horas y deja el
objeto en un estado coherente en un solo paso. Con setters sueltos, cualquiera de
esas tres garantías se pierde en cuanto un llamador se olvida de una línea.

El otro uso fuerte está en `Usuario`: el hash y la sal de la contraseña son
privados y **no tienen getter**. La única vía es
`credencialesParaVerificar()`, que se expone como método precisamente para que
todo uso sea visible en una búsqueda del código.

### Herencia

Se usa en un solo eje, y por una razón concreta: la empresa remunera de tres
maneras distintas.

```
Persona (abstracta)
  └── Empleado (abstracta)
        ├── EmpleadoAsalariado    sueldo fijo
        ├── EmpleadoPorHoras      horas x tarifa, extras al 1,5x sobre 160 h
        └── Contratista           horas x tarifa, con tope mensual
```

La alternativa —una sola clase con un campo `tipo` y un `switch` dentro de
`calcularSueldo()`— reaparece luego en el generador de nómina, en el validador de
altas y en los informes. Cada modalidad nueva obliga a encontrar y tocar todos
esos puntos, y el que se olvide produce un error de cálculo silencioso, que es
exactamente el tipo de fallo que la empresa ya sufre con las hojas de cálculo.

`Persona → Empleado` responde a otra necesidad: separar el dato **personal**
(sujeto a normativa de privacidad, cifrado, enmascarado según permisos) del dato
**laboral** (legajo, contrato, remuneración), que tiene otro ciclo de vida y otras
reglas de acceso.

### Polimorfismo

Es el fundamento que más trabajo hace en este sistema. Aparece en cuatro sitios
independientes:

**1. Remuneración.** El motor de nómina recorre una lista de `Empleado` y no
pregunta de qué tipo es cada uno:

```ts
// src/dominio/reportes/ReporteNomina.ts
const remuneracion = empleado.calcularRemuneracionMensual(horasAprobadas);
```

Tres formulas distintas, cero condicionales. Añadir una modalidad es añadir una
clase.

**2. Errores.** `ErrorDominio` declara `codigoHttp` abstracto. La capa HTTP no
encadena `instanceof`: le pregunta al error por su propio código
(`src/worker/http.ts`). Un error nuevo no obliga a tocar el router.

**3. Validación.** `Regla` es una jerarquía de objetos con un único método
`aplicar()`. El `Esquema` recorre la lista sin saber qué regla concreta está
ejecutando. Sustituye a la cascada de `if` que se vuelve inmantenible.

**4. Informes y exportación.** `Reporte.generar()` es un **método plantilla**: fija
el algoritmo en la clase base y deja que las subclases rellenen los pasos
(`columnas`, `construirFilas`, `calcularTotales`). En paralelo, `Exportador` tiene
cuatro implementaciones (JSON, CSV, XLSX, PDF). El servicio combina ambos ejes sin
un solo condicional:

```ts
// src/aplicacion/ServicioReportes.ts
const reporte = Reporte.crear(tipo).generar(datos);
const bytes = await FabricaExportadores.crear(formato).exportar(reporte);
```

Cinco informes por cuatro formatos son veinte combinaciones, servidas por nueve
clases pequeñas y ningún `switch` en el servicio.

---

## 1.5. Trazabilidad entre problemas y solución

| Problema del enunciado | Mecanismo | Dónde |
|---|---|---|
| Duplicidad de empleados | UUID automático + índice ciego HMAC sobre documento y correo personal, comprobado antes de cada alta | `ServicioEmpleados.crear`, `ServicioCripto.indiceCiego` |
| Errores de asignación | `AsignacionProyecto` como clase de asociación; tope de dedicación acumulada del 100 %; el proyecto debe estar abierto y el empleado activo | `ServicioAsignaciones.asignar` |
| Falta de trazabilidad de horas | Ciclo `BORRADOR → ENVIADO → APROBADO / RECHAZADO`; un registro aprobado no se edita sin rechazarlo antes; nadie aprueba sus propias horas; las horas exigen una asignación vigente a esa fecha | `RegistroTiempo`, `ServicioRegistrosTiempo` |
| Informes poco confiables | Una clase por informe con sus reglas de cálculo escritas una sola vez; solo las horas **aprobadas** computan | `src/dominio/reportes/` |
| Riesgo sobre datos personales | Bloque `datosSensibles` cifrado con AES-256-GCM; lectura condicionada al permiso `empleado:leer_sensible`; enmascarado por defecto en los listados | `Persona`, `Empleado.aDTO`, `ServicioEmpleados` |
| (Transversal) Quién hizo qué | `RegistroAuditoria` inmutable, incluidos los intentos fallidos | `ServicioAuditoria` |

---

**Siguiente:** [2. Evaluación crítica de propuestas, incluidas las generadas con IA](02-evaluacion-critica-ia.md)
