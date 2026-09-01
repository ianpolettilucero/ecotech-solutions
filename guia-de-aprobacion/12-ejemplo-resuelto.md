# Ejemplo resuelto: el informe mínimo que cumple

Esto es un informe completo, escrito lo más corto posible sin dejar fuera ni uno
de los mínimos que la guía cuenta. Ocupa unas 9 páginas en Word. No es el
informe brillante: es **el informe que aprueba**, y sirve para ver de un vistazo
qué densidad tiene que tener cada apartado.

:::aviso Léelo como un modelo, no como una entrega
Dos razones. La primera es que hay defensa oral en los cuatro pasos: un texto
que no razonaste tú se cae en la primera repregunta. La segunda es más práctica:
**el apartado 3.3 no lo puedes copiar aunque quieras**. Ahí van los prompts que
*tú* ejecutaste y los resultados que *a ti* te devolvió la herramienta, con su
fecha. Los de abajo son reales y los puedes ejecutar, pero la salida que pegues
tiene que ser la tuya.
:::

---

## 1. Introducción

EcoTech Solutions, empresa dedicada al desarrollo de tecnologías sostenibles, ha
crecido de forma acelerada durante el último año. Ese crecimiento dejó al
descubierto las limitaciones de su gestión interna: la información de empleados,
departamentos y proyectos se administra mediante hojas de cálculo y sistemas
aislados, lo que ha producido duplicidad de datos, errores en la asignación de
personal, ausencia de trazabilidad en el registro de horas, reportes poco
confiables y una exposición innecesaria de los datos personales de la plantilla.

Este informe documenta el diseño de un modelo orientado a objetos que responde a
esa situación. El trabajo se desarrolló en cuatro etapas: un análisis conceptual
del dominio desde los fundamentos de la programación orientada a objetos, la
construcción de un diagrama de clases en notación UML, la generación de
propuestas alternativas mediante una herramienta de inteligencia artificial y su
evaluación crítica, y la elaboración de un modelo final validado contra los
requisitos del enunciado.

El documento se organiza de la siguiente manera. El apartado 3.1 presenta el
análisis conceptual y las entidades identificadas. El 3.2 desarrolla el modelo
estructural, sus clases, relaciones y multiplicidades. El 3.3 documenta el uso de
la herramienta de IA, con los prompts empleados, los resultados obtenidos y su
evaluación crítica. El 3.4 justifica las mejoras aplicadas, los principios de
diseño utilizados y la trazabilidad entre requisitos y clases.

---

## 2. Objetivo

**Objetivo general.** Diseñar un modelo orientado a objetos para el sistema de
gestión interna de EcoTech Solutions, representado mediante un diagrama de clases
UML, a partir del análisis conceptual del dominio y de la evaluación crítica de
propuestas generadas con herramientas de inteligencia artificial.

**Objetivos específicos.**

1. Analizar la problemática desde los fundamentos de la POO, identificando las
   entidades del dominio, sus atributos y sus responsabilidades.
2. Elaborar un diagrama de clases en notación UML estándar, definiendo las
   relaciones estructurales con su tipo y multiplicidad.
3. Evaluar críticamente los modelos generados por una herramienta de IA,
   identificando errores, omisiones y coincidencias respecto del análisis propio.
4. Validar el modelo final mediante la aplicación de principios de diseño
   orientado a objetos y una matriz de trazabilidad con los requisitos.

---

## 3. Desarrollo

### 3.1 Análisis del problema

#### 3.1.1 Entidades relevantes del dominio

Se identificaron cuatro entidades principales. El criterio para admitir un
concepto como entidad fue triple: que tenga **identidad propia** (dos ejemplares
con los mismos valores siguen siendo cosas distintas), **estado que cambia** a lo
largo del tiempo y **comportamiento** que le pertenece.

| Entidad | Identidad | Estado que cambia | Comportamiento propio |
|---|---|---|---|
| **Empleado** | Dos personas homónimas con la misma fecha de ingreso son dos empleados distintos: requiere un ID único | Departamento, situación activa o de baja | Calcula su propia remuneración mensual |
| **Departamento** | Dos departamentos con el mismo nombre serían el mismo: el nombre actúa como clave natural | Gerente designado, personal que agrupa | Designa a su gerente y valida que pertenezca a él |
| **Proyecto** | Identificado por un código único e irrepetible | Ciclo de vida: planificado, en curso, suspendido, cerrado | Acumula las horas imputadas y controla sus transiciones de estado |
| **RegistroTiempo** | Cada parte de horas es un hecho puntual e irrepetible | Circuito de aprobación: borrador, enviado, aprobado, rechazado | Se envía a revisión y valida quién puede aprobarlo |

Se descartaron dos candidatos que aparecen en el enunciado pero no superan la
prueba de identidad. **Dirección** no es entidad: dos direcciones con la misma
calle, número y comuna *son* la misma dirección, no necesitan un identificador
que las separe; se modela como atributo. **Salario** tampoco: es un valor
asociado al empleado, no un objeto con vida propia.

#### 3.1.2 Atributos, objetos posibles y responsabilidades

| Entidad | Atributos principales | Objeto posible (instancia concreta) | Responsabilidad |
|---|---|---|---|
| **Empleado** | `id`, `nombre`, `apellido`, `fechaInicioContrato`, `direccion`, `telefono`, `email`, `activo` | *Lucía Ferreyra, legajo ECO-000003, ingresó el 02/09/2019, área I+D, activa* | Calcular su remuneración mensual según su modalidad de contrato |
| **Departamento** | `id`, `nombre`, `descripcion` | *Investigación y Desarrollo, 4 personas, gerente Lucía Ferreyra* | Mantener la coherencia entre su personal y su gerente |
| **Proyecto** | `id`, `codigo`, `nombre`, `descripcion`, `fechaInicio`, `estado` | *PRY-0001 «Red de Paneles Solares Cuyo», iniciado el 01/03/2025, en curso* | Controlar sus transiciones de estado y totalizar sus horas |
| **RegistroTiempo** | `id`, `fecha`, `horas`, `descripcion`, `estado` | *8 h el 12/08/2026 en PRY-0001: «montaje del inversor central», aprobado* | Validar sus propias horas y hacer cumplir el circuito de aprobación |

:::nota Qué es un "objeto posible"
Una **instancia concreta**, con valores reales, no una subclase. El error
frecuente es responder «objetos posibles de Empleado: asalariado, por horas,
contratista», que son clases, no objetos.
:::

#### 3.1.3 Conceptos del problema vinculados a fundamentos de la POO

**Encapsulamiento — los datos personales y el salario.** El enunciado exige
almacenar los datos personales "de forma segura utilizando técnicas de cifrado
adecuadas" y que los usuarios "solo tengan acceso a los módulos para los que
están autorizados". Eso descarta atributos públicos: el teléfono y el salario se
declaran privados y el único acceso pasa por un método que comprueba el permiso
de quien pregunta. La regla de acceso vive así en un solo lugar del modelo y no
se puede olvidar en una pantalla.

**Herencia y polimorfismo — las modalidades de contrato.** El enunciado pide usar
"herencia y polimorfismo de manera efectiva para evitar duplicación de código".
Un empleado asalariado, uno por horas y un contratista no se diferencian en un
dato sino en un *comportamiento*: cada uno calcula distinto su remuneración. Con
un atributo `tipoContrato` ese cálculo termina en una cadena de condicionales que
hay que modificar cada vez que aparece una modalidad nueva. Con herencia, el
método `calcularRemuneracionMensual()` se declara abstracto en `Empleado` y cada
subclase lo implementa; añadir una modalidad es añadir una clase.

**Abstracción — la ficha de empleado.** El sistema no representa todo lo que se
sabe de una persona, sino lo que la gestión interna necesita: no hay estado
civil, ni fotografía, ni historial médico. La clase `Empleado` es una abstracción
del rol laboral, no un retrato de la persona.

#### 3.1.4 Cómo el enfoque orientado a objetos estructura la solución

| Problema declarado por la empresa | Cómo lo resuelve el modelo |
|---|---|
| Duplicidad de información de empleados | Identidad explícita: cada empleado recibe un `id` único generado por el sistema, y el documento actúa como clave natural que impide altas repetidas |
| Errores en la asignación de personal a proyectos | La asignación deja de ser un dato suelto y pasa a ser un objeto (`AsignacionProyecto`) con sus propias reglas de validación |
| Falta de trazabilidad en el registro de horas | `RegistroTiempo` incorpora un circuito de estados; un parte aprobado no se puede editar, de modo que la nómina se calcula sobre datos inmutables |
| Reportes poco confiables | Los informes se calculan a partir de los mismos objetos del dominio, no de copias en planillas paralelas |
| Riesgo sobre los datos personales | Los datos sensibles se encapsulan en un bloque de acceso restringido, cifrable como unidad |

---

### 3.2 Diseño del sistema

#### 3.2.1 Catálogo de clases

Siete clases. El signo indica la visibilidad UML: `-` privado, `+` público,
`#` protegido. Las clases abstractas van marcadas.

| Clase | Atributos | Métodos |
|---|---|---|
| **`Empleado`** *(abstracta)* | `- id: str`, `- nombre: str`, `- apellido: str`, `- fechaInicioContrato: date`, `# datosPersonales: DatosPersonales`, `- activo: bool` | `+ calcularRemuneracionMensual(): float` *(abstracto)*, `+ asignarA(d: Departamento): void`, `+ darDeBaja(): void` |
| **`EmpleadoAsalariado`** | `- salarioMensual: float` | `+ calcularRemuneracionMensual(): float` |
| **`EmpleadoPorHoras`** | `- tarifaHora: float` | `+ calcularRemuneracionMensual(): float` |
| **`Departamento`** | `- id: str`, `- nombre: str`, `- descripcion: str` | `+ designarGerente(e: Empleado): void`, `+ cantidadEmpleados(): int` |
| **`Proyecto`** | `- id: str`, `- codigo: str`, `- nombre: str`, `- fechaInicio: date`, `- estado: EstadoProyecto` | `+ cambiarEstado(e: EstadoProyecto): void`, `+ horasImputadas(): float` |
| **`AsignacionProyecto`** *(clase asociativa)* | `- rol: str`, `- porcentajeDedicacion: int`, `- fechaAsignacion: date`, `- fechaDesasignacion: date` | `+ estaVigente(): bool`, `+ cerrar(f: date): void` |
| **`RegistroTiempo`** | `- id: str`, `- fecha: date`, `- horas: float`, `- descripcion: str`, `- estado: EstadoParte` | `+ enviar(): void`, `+ aprobar(a: Empleado): void` |

#### 3.2.2 Relaciones estructurales y multiplicidades

Siete relaciones que cubren los cuatro tipos que exige el enunciado.

| # | Relación | Tipo | Multiplicidad | Justificación |
|:--:|---|---|:--:|---|
| 1 | `EmpleadoAsalariado` → `Empleado` | Generalización | — | "Es un" empleado; solo cambia el cálculo de su remuneración |
| 2 | `EmpleadoPorHoras` → `Empleado` | Generalización | — | Ídem: misma identidad, distinta regla de cálculo |
| 3 | `Departamento` ◇— `Empleado` | Agregación | `0..1` — `0..*` | Al eliminar un departamento los empleados subsisten y se reasignan |
| 4 | `Departamento` → `Empleado` *(rol: gerente)* | Asociación dirigida | `0..1` | "Cada departamento tendrá un nombre y un gerente asociado" |
| 5 | `Empleado` — `AsignacionProyecto` — `Proyecto` | Asociación N:M con clase asociativa | `0..*` — `0..*` | "Los empleados pueden ser asignados a uno o varios proyectos", y la asignación tiene datos propios |
| 6 | `Proyecto` ◆— `RegistroTiempo` | Composición | `1` — `0..*` | Un parte de horas sin su proyecto carece de sentido: no hay a dónde reasignarlo |
| 7 | `Empleado` — `RegistroTiempo` | Asociación | `1` — `0..*` | "Estos registros deben estar asociados a un empleado y a un proyecto específico" |

**Lectura de las multiplicidades.** Se escriben en el extremo de la línea, junto
a la clase que restringen, y se leen tomando un objeto del otro extremo. En la
relación 3, el `0..*` situado junto a `Empleado` se lee "un departamento agrupa
de cero a muchos empleados"; el `0..1` situado junto a `Departamento` se lee "un
empleado pertenece como máximo a un departamento". Se usa `0..1` y no `1` porque
el enunciado fija un máximo —"solo puede pertenecer a un departamento a la
vez"— pero admite que un empleado recién registrado aún no tenga área asignada.

**La decisión entre agregación y composición** se resolvió con una única
pregunta: si se elimina el todo, ¿la parte conserva sentido? Los empleados de un
departamento sí lo conservan, por lo que la relación 3 es una agregación (rombo
hueco). Los partes de horas de un proyecto no, por lo que la relación 6 es una
composición (rombo relleno).

**La clase asociativa** resuelve la relación 5. Empleado y Proyecto se vinculan
en una relación de muchos a muchos que además transporta datos propios: la fecha
de asignación, el rol y el porcentaje de dedicación. Esos atributos no pertenecen
a ninguno de los dos extremos —el porcentaje varía según el proyecto y el rol
varía según la persona— sino a la relación misma, que es la definición exacta de
una clase asociativa.

#### 3.2.3 Diagrama de clases

![Los tres compartimentos de una clase UML: nombre, atributos y métodos con su visibilidad](diagramas/anatomia-clase.svg)

```text
classDiagram
    direction TB

    class Empleado {
        <<abstract>>
        -id: str
        -nombre: str
        -fechaInicioContrato: date
        -activo: bool
        +calcularRemuneracionMensual() float
        +asignarA(d: Departamento) void
    }
    class EmpleadoAsalariado {
        -salarioMensual: float
        +calcularRemuneracionMensual() float
    }
    class EmpleadoPorHoras {
        -tarifaHora: float
        +calcularRemuneracionMensual() float
    }
    class Departamento {
        -id: str
        -nombre: str
        +designarGerente(e: Empleado) void
    }
    class Proyecto {
        -id: str
        -codigo: str
        -estado: EstadoProyecto
        +cambiarEstado(e: EstadoProyecto) void
        +horasImputadas() float
    }
    class AsignacionProyecto {
        -rol: str
        -porcentajeDedicacion: int
        -fechaAsignacion: date
        +estaVigente() bool
    }
    class RegistroTiempo {
        -fecha: date
        -horas: float
        -estado: EstadoParte
        +aprobar(a: Empleado) void
    }

    Empleado <|-- EmpleadoAsalariado
    Empleado <|-- EmpleadoPorHoras
    Departamento "0..1" o-- "0..*" Empleado : agrupa
    Departamento "0..1" --> "1" Empleado : gerente
    Empleado "1" -- "0..*" AsignacionProyecto
    Proyecto "1" -- "0..*" AsignacionProyecto
    Proyecto "1" *-- "0..*" RegistroTiempo : registra
    Empleado "1" -- "0..*" RegistroTiempo : imputa
```

> **Figura 1.** Diagrama de clases del sistema de gestión interna de EcoTech
> Solutions. `AsignacionProyecto` se modela como clase asociativa de la relación
> N:M entre `Empleado` y `Proyecto`; la herramienta de diagramación empleada no
> representa la notación estándar de clase asociativa (línea discontinua al
> centro de la asociación), por lo que se dibuja como clase vinculada a ambos
> extremos. Elaboración propia.

---

### 3.3 Uso de herramientas de inteligencia artificial

:::aviso Este apartado es el único que no puedes reutilizar
Los prompts de abajo son reales y los puedes ejecutar tal cual. El **resultado**
que pegues tiene que ser el que la herramienta te devuelva a ti, con tu fecha.
Lo que sigue muestra la forma que debe tener el apartado y el nivel de detalle
que se espera del análisis.
:::

#### 3.3.1 Herramienta y contexto de uso

Se utilizó [nombre de la herramienta y versión] los días [fecha]. La herramienta
se empleó exclusivamente para generar propuestas iniciales de modelado que
sirvieran de contraste con el análisis desarrollado en el apartado 3.1, ya
concluido antes de la primera consulta. No se utilizó para redactar este informe
ni para tomar decisiones de diseño: la versión final del diagrama es resultado
del refinamiento propio documentado en 3.4.

#### 3.3.2 Iteración 1

**Prompt utilizado (transcripción literal):**

```text
Actúa como analista de sistemas. A partir del siguiente enunciado, propone un
diagrama de clases UML.

Enunciado: una empresa de tecnologías sostenibles necesita un sistema de gestión
interna. Debe registrar empleados con nombre, dirección, teléfono, correo, fecha
de inicio de contrato y salario, y asignarles un ID único automático. Debe
permitir crear, editar, buscar y eliminar departamentos, cada uno con un nombre y
un gerente. Cada empleado pertenece a un departamento a la vez. Los empleados
registran horas trabajadas indicando fecha, cantidad de horas y descripción de la
tarea, asociadas a un empleado y a un proyecto. Debe permitir crear, editar y
eliminar proyectos con nombre, descripción y fecha de inicio. Un empleado puede
estar asignado a uno o varios proyectos.

Formato de salida: lista de clases con sus atributos y métodos, y a continuación
la lista de relaciones indicando tipo (asociación, agregación, composición o
generalización) y multiplicidad en ambos extremos.
```

**Resultado obtenido:** [pega aquí la salida literal de la herramienta, o una
captura de pantalla rotulada como Figura 2].

#### 3.3.3 Iteración 2

El segundo prompt corrige las tres carencias detectadas en la primera salida: la
ausencia de jerarquía de herencia, la falta de tratamiento de la relación N:M con
atributos propios y la omisión de la visibilidad de los miembros.

**Prompt utilizado (transcripción literal):**

```text
Revisa el modelo anterior aplicando estas tres correcciones:

1. Los empleados tienen tres modalidades de contrato (sueldo fijo, pago por hora
   y contratista con tope mensual) que calculan su remuneración de forma
   distinta. Modela esto con herencia y un método polimórfico, no con un
   atributo de tipo.
2. La relación entre empleado y proyecto es de muchos a muchos y transporta
   datos propios: fecha de asignación, rol y porcentaje de dedicación. Resuélvela
   con una clase asociativa.
3. Indica la visibilidad de cada atributo y método con la notación UML (-, +, #)
   y marca en cursiva las clases y los métodos abstractos.

Devuelve el modelo corregido con el mismo formato de salida anterior.
```

**Resultado obtenido:** [pega aquí la salida literal de la segunda iteración,
rotulada como Figura 3].

#### 3.3.4 Evaluación crítica de los aportes de la IA

Se contrastaron ambas salidas con el análisis del apartado 3.1. Se identificaron
seis elementos, clasificados según el aspecto del modelo al que afectan.

| # | Aspecto | Qué propuso la herramienta | Qué establece el análisis propio | Tipo | Corrección aplicada |
|:--:|---|---|---|---|---|
| 1 | Clases | Una clase `Usuario` con los mismos atributos que `Empleado` | Son entidades distintas: un empleado dado de baja conserva su historial, su credencial se revoca de inmediato | Error | Se eliminó la duplicación; `Usuario` queda fuera del alcance de esta unidad |
| 2 | Clases | No incluyó jerarquía: una sola clase `Empleado` con un atributo `tipoContrato` | Las tres modalidades difieren en comportamiento, no en un dato | Error | Se introdujo la jerarquía con `calcularRemuneracionMensual()` abstracto |
| 3 | Relaciones | Asociación directa `Empleado` — `Proyecto` con multiplicidad `0..*` en ambos extremos | La relación transporta rol, dedicación y fechas, que no caben en ninguno de los extremos | Omisión | Se añadió la clase asociativa `AsignacionProyecto` |
| 4 | Relaciones | Composición entre `Departamento` y `Empleado` | Los empleados sobreviven a la eliminación del departamento | Error | Se corrigió a agregación (rombo hueco) |
| 5 | Atributos | `idDepartamento` como atributo de `Empleado` | Es una clave foránea de base de datos, no un atributo del dominio; la relación ya expresa el vínculo | Error | Se eliminó el atributo; la asociación lo sustituye |
| 6 | Atributos | Modeló correctamente los datos personales como atributos privados de `Empleado` | Coincide con el análisis propio: el enunciado exige acceso restringido | Coincidencia | Se conservó, agrupando los cuatro campos en un bloque de datos sensibles |

La evaluación permite una conclusión más general: la herramienta resuelve con
solvencia la parte descriptiva del modelado —identificar clases evidentes y
listar atributos a partir del enunciado— pero falla sistemáticamente en las
decisiones que exigen interpretar reglas de negocio. Los cuatro errores
detectados se concentran en relaciones y en la elección entre herencia y
atributo, es decir, allí donde hay que decidir y no solo transcribir.

---

### 3.4 Mejoras aplicadas

#### 3.4.1 Justificación de los cambios realizados

| Cambio | Del modelo inicial | Al modelo final | Criterio técnico |
|---|---|---|---|
| Jerarquía de empleados | Una clase con `tipoContrato` | `Empleado` abstracta con dos subclases | Abierto/cerrado: añadir una modalidad no obliga a modificar código existente |
| Relación empleado-proyecto | Asociación N:M simple | Clase asociativa `AsignacionProyecto` | Los atributos de la relación no pertenecen a los extremos |
| Departamento-empleado | Composición | Agregación | El ciclo de vida de la parte es independiente del todo |
| Clave foránea | `idDepartamento` en `Empleado` | Eliminada | El modelo conceptual expresa vínculos con relaciones, no con identificadores |
| Datos sensibles | Cuatro atributos sueltos | Bloque agrupado de acceso restringido | Un único punto de control para el cifrado y el permiso de lectura |

#### 3.4.2 Aplicación de principios de diseño orientado a objetos

**Responsabilidad única.** Cada clase tiene un motivo único de cambio. `Proyecto`
cambia si cambian las reglas del ciclo de vida de un proyecto; no cambia si
cambia la fórmula de la remuneración.

**Encapsulamiento.** Todos los atributos se declaran privados o protegidos y se
exponen mediante métodos que aplican las reglas del dominio. `Departamento` no
publica su lista de empleados: quien la obtiene recibe una copia inmutable, de
modo que nadie puede añadir personal saltándose `asignarA()`.

**Cohesión alta y acoplamiento bajo.** Los datos y las operaciones que los usan
viven en la misma clase. `RegistroTiempo` guarda sus horas y también las valida;
no existe una clase externa de validación que deba conocer sus reglas internas.

| Clase | Responsabilidad única | Encapsulamiento | Cohesión |
|---|:--:|:--:|:--:|
| `Empleado` | Representa a la persona trabajadora | Datos sensibles con acceso controlado | Reúne identidad y cálculo de remuneración |
| `EmpleadoAsalariado` | Solo la regla de sueldo fijo | `salarioMensual` privado | — |
| `EmpleadoPorHoras` | Solo la regla de pago por hora | `tarifaHora` privada | — |
| `Departamento` | Agrupa personal y designa gerente | Lista de empleados no modificable desde fuera | Reúne estructura y validación del gerente |
| `Proyecto` | Ciclo de vida y totalización de horas | `estado` privado, solo modificable por `cambiarEstado()` | Reúne estado y transiciones |
| `AsignacionProyecto` | Solo los datos de la participación | Validación de la dedicación en la construcción | — |
| `RegistroTiempo` | Un parte de horas y su circuito | `estado` privado; un parte aprobado no admite edición | Reúne dato y validación |

Los tres principios se aplican en las siete clases del modelo.

#### 3.4.3 Matriz de trazabilidad

| Requisito del enunciado | Clases que lo realizan | Elemento concreto |
|---|---|---|
| Registro de empleados con ID único automático | `Empleado` | Atributo `id`, generado en la construcción |
| Gestión de departamentos (crear, editar, buscar, eliminar) | `Departamento` | Atributos `nombre` y `descripcion`; asociación con su gerente |
| Asignación de empleados a departamentos, uno a la vez | `Empleado`, `Departamento` | Método `asignarA()`; multiplicidad `0..1` en la relación 3 |
| Registro de tiempo asociado a empleado y proyecto | `RegistroTiempo` | Atributos `fecha`, `horas`, `descripcion`; relaciones 6 y 7 con multiplicidad `1` |
| Gestión de proyectos | `Proyecto` | Atributos `nombre`, `descripcion`, `fechaInicio`; método `cambiarEstado()` |
| Asignación de empleados a varios proyectos | `AsignacionProyecto` | Clase asociativa de la relación 5; método `cerrar()` para la desasignación |
| Seguridad de datos sensibles | `Empleado` | Bloque de datos personales con acceso restringido por método |

#### 3.4.4 Viabilidad técnica de la implementación en Python

El modelo es independiente del lenguaje, pero se verificó su traducción directa a
Python mediante la siguiente correspondencia:

| Elemento UML | Construcción en Python |
|---|---|
| Clase abstracta | `class Empleado(ABC)` |
| Método abstracto | `@abstractmethod` |
| Atributo privado `-` | `self._nombre` con `@property` de solo lectura |
| Generalización | `class EmpleadoAsalariado(Empleado)` |
| Composición | La lista vive dentro del todo y se crea con él |
| Agregación | Se guarda una referencia a un objeto que existe fuera |
| Multiplicidad `0..*` | Una lista |
| Multiplicidad `0..1` | `Optional[...]` |
| Clase asociativa | Clase propia con referencia a ambos extremos |

```python
class Empleado(ABC):
    def __init__(self, nombre: str, fecha_inicio: date) -> None:
        self._id = f"ECO-{next(Empleado._secuencia):06d}"
        self._nombre = nombre
        self._departamento: Optional[Departamento] = None   # multiplicidad 0..1

    @abstractmethod
    def calcular_remuneracion_mensual(self, horas: float) -> float:
        ...


class EmpleadoAsalariado(Empleado):          # generalización
    def calcular_remuneracion_mensual(self, horas: float) -> float:
        return self._salario_mensual         # polimorfismo: misma firma, otra regla
```

El polimorfismo queda demostrado en el cálculo de la nómina: un mismo bucle
recorre empleados de distintas modalidades e invoca el mismo método, sin ninguna
condición sobre el tipo de contrato.

---

## 4. Conclusiones

El modelado orientado a objetos resultó adecuado para la problemática planteada
porque los cinco problemas declarados por EcoTech Solutions son, en el fondo, un
mismo problema: la información carecía de identidad y de reglas propias. Asignar a
cada concepto del dominio una clase con identidad, estado y comportamiento
resuelve la duplicidad en el origen, y encapsular las reglas dentro de los objetos
—en lugar de dejarlas en las pantallas que los manipulan— es lo que hace posible
la trazabilidad que la empresa echaba en falta.

La decisión de diseño más determinante fue sustituir el atributo `tipoContrato`
por una jerarquía de herencia. No es una preferencia estilística: convierte una
cadena de condicionales que crece con cada modalidad nueva en una estructura donde
añadir una modalidad significa añadir una clase sin tocar lo existente.

Respecto del uso de inteligencia artificial, el contraste fue revelador. La
herramienta produjo con rapidez un modelo descriptivamente correcto —las clases
evidentes y sus atributos— pero cometió cuatro errores concentrados exactamente
en las decisiones que exigen interpretar reglas de negocio: confundió agregación
con composición, omitió la clase asociativa, arrastró una clave foránea desde el
modelo relacional y duplicó una entidad. La conclusión práctica es que la
herramienta es útil para acelerar la parte mecánica del modelado, pero el criterio
sobre qué representa cada relación sigue siendo responsabilidad del diseñador.

Queda fuera del alcance de este informe el modelado del subsistema de
autenticación y autorización, que el enunciado menciona y que requeriría
incorporar las clases `Usuario`, `Rol` y `Permiso`, así como el diseño de la
persistencia. Ambos se abordarán en las unidades siguientes.

---

## 5. Referencias bibliográficas

Jiménez de Parga, C. (2021). *UML: arquitectura de aplicaciones en Java, C++ y
Python* (1.ª ed.). Ra-Ma.

Sánchez Palacio, A. (2025). *ChatGPT y OpenAI: desarrollo y uso de herramientas
de inteligencia artificial generativa*. RA-MA Editorial.

---

## Cómo se cuenta este ejemplo contra los mínimos

| Mínimo que exige la guía | Dónde está | Cantidad |
|---|---|:--:|
| 4 entidades relevantes | 3.1.1 | 4 |
| 4 elementos con atributos, objetos y responsabilidad | 3.1.2 | 4 |
| 3 conceptos vinculados a fundamentos POO | 3.1.3 | 3 |
| 3 clases principales | 3.2.1 | 7 |
| 3 relaciones con tipo y multiplicidad | 3.2.2 | 7 |
| 2 iteraciones con IA | 3.3.2 y 3.3.3 | 2 |
| 2 prompts documentados | 3.3.2 y 3.3.3 | 2 |
| 4 hallazgos clasificados por aspecto | 3.3.4 | 6 |
| 3 principios de diseño en la mayoría de las clases | 3.4.2 | 3 en 7 de 7 |
| 3 requerimientos en la matriz de trazabilidad | 3.4.3 | 7 |

:::clave Lo que falta para que sea tuyo
Tres cosas, y ninguna es larga:

1. **Los resultados de la IA.** Ejecuta los dos prompts, guarda las salidas
   literales y ajusta la tabla 3.3.4 a lo que realmente te haya devuelto. Si tu
   herramienta acierta donde la del ejemplo falló, dilo: una coincidencia
   documentada vale tanto como un error.
2. **Tus atributos.** El catálogo de 3.2.1 tiene que coincidir con las clases que
   ya tienes hechas, no con las de aquí.
3. **La portada y el índice.** Están en el
   [esqueleto](esqueleto-informe.docx); actualiza la tabla de contenidos con F9.
:::
