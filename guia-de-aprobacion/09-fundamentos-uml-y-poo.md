# Fundamentos: POO y UML, lo que hay que dominar

Este es el documento de teoría de la evaluación. No es un manual general de programación orientada a objetos: es exactamente lo que los cuatro criterios de la ES1 te van a pedir que sepas decir, dibujar y defender.

Está pensado para dos usos. Leerlo entero una vez antes de dibujar nada, para tener el vocabulario en la cabeza cuando escribas el informe. Y volver a él por secciones antes de la defensa oral: cada tema trae el núcleo, una **:::trampa** con el error que se comete todos los años, y un **:::avanzado** con el matiz que separa una respuesta correcta de una sobresaliente.

:::aviso Los ejemplos son para aprender de ellos, no para copiarlos
Cada ejemplo trabajado muestra **la forma y el nivel** de una respuesta buena. No es tu respuesta: tu modelo tiene que salir de tu propio análisis del enunciado y tu defensa tiene que poder sostenerlo sin este archivo delante. La defensa oral existe precisamente para separar las dos cosas. Si te aprendes las conclusiones sin el razonamiento, la tercera pregunta del docente te va a encontrar.
:::

---

## 1. Antes de empezar: modelar no es implementar

La Unidad 1 evalúa **modelado**. Los cuatro criterios lo dicen: analizar fundamentos de POO, elaborar un diagrama de clases, ajustar diagramas generados por IA, diseñar el diagrama final. En ninguno aparece la palabra "código". Al mismo tiempo, la guía define la ES1 como:

> un Informe técnico del diseño y desarrollo de una solución de software en Python representada mediante un diagrama de clases UML

y cierra el Paso 4 pidiendo "defendiendo la viabilidad técnica del diseño definitivo en Python". Tú tienes un sistema real, desplegado, en TypeScript: la mejor evidencia disponible y el flanco más fácil de atacar. La clave conceptual que resuelve la tensión es una sola: **UML es deliberadamente independiente del lenguaje**. El mismo diagrama de clases se realiza en Python, Java, C# o TypeScript, porque describe estructura y contratos, no sintaxis. Una implementación existente no sustituye al modelo, pero sí es la prueba más fuerte de que el modelo es realizable: cada método del diagrama existe, cada invariante se cumple, cada relación se materializa.

:::clave La frase que ordena todo el trabajo
El modelo es el entregable. El código es su verificación. Presenta el diagrama como el producto y el sistema como validación empírica, con una tabla de equivalencia UML→Python y un fragmento real de la jerarquía escrito en Python. Ese orden es el que evalúan los criterios.
:::

:::trampa Los dos errores simétricos con el sistema ya construido
**Uno**: presentar el repositorio, el despliegue y las 7.400 líneas de `docs/` como si fueran la entrega; desplaza el foco de los criterios evaluados —que son de análisis y modelado— y deja expuesto el flanco del lenguaje. **Dos**: esconder el sistema por miedo a que "está en TypeScript y pedían Python", desperdiciando la evidencia de viabilidad más fuerte que puedes tener en una ES1. Ambos parten del mismo malentendido: creer que el diagrama es consecuencia del código, cuando en la Unidad 1 el diagrama es el producto y el código es a lo sumo su verificación.
:::

:::avanzado Adelantarse a la objeción y convertirla en argumento
No esperes a que pregunten por el lenguaje: dilo tú. *"El modelo es independiente del lenguaje por definición de UML; la implementación de referencia está en TypeScript; aquí está el mapeo a Python y el fragmento equivalente."* Y un matiz más fino: la única diferencia relevante entre ambos lenguajes **para este modelo** es cómo se sostiene el encapsulamiento. El `private` de TypeScript se aplica en compilación; el doble guion bajo de Python solo hace *name mangling*; ninguno impone barrera en tiempo de ejecución. Por eso el encapsulamiento de este modelo descansa en el diseño de la API pública —operaciones con nombre de negocio en vez de setters— y no en la palabra clave del lenguaje. Eso demuestra que entiendes la separación modelo/implementación en lugar de recitarla.
:::

Las tensiones completas están en [Ambigüedades y riesgos](02-ambiguedades-y-riesgos.html); la traducción a Python, en [Paso 4](06-paso-4-validacion-final.html).

---

## 2. Los cuatro pilares

El Paso 1 pide relacionar "al menos 3 conceptos del problema con fundamentos de POO", y la acción oral nombra dos por su nombre: "cómo los pilares fundamentales de la POO (abstracción, encapsulamiento) dan respuesta a las necesidades del caso planteado". Esos dos son obligatorios en la exposición. Herencia y polimorfismo los exige el enunciado por otra vía: *"utiliza herencia y polimorfismo de manera efectiva para evitar duplicación de código"*.

### 2.1 Abstracción

**Abstracción es seleccionar las características relevantes de una cosa del mundo para un propósito determinado, e ignorar deliberadamente el resto.** Su resultado es un concepto —una clase, un tipo, una interfaz— que dice *qué hace* algo sin comprometerse con *cómo lo hace*. En EcoTech: de una persona real hay cientos de datos posibles y el modelo se queda con nombre, contacto, documento, contrato y remuneración porque son los que un sistema de gestión interna necesita; eso es una decisión, no un olvido. Su forma más rentable es la **abstracción de comportamiento**: una clase base `Empleado` que declara `calcularRemuneracionMensual()` sin implementarla, o una interfaz `Repositorio<T>` que describe la persistencia sin mencionar el almacén concreto. Ambas permiten que el resto del sistema trabaje contra el contrato y no contra la implementación.

:::trampa Definir abstracción como "ocultar los detalles internos"
Eso es **ocultamiento de información**, que va con el encapsulamiento y no con la abstracción: es el criterio de *qué* esconder, y se trata en 2.2 y, como principio, en 8.3. Abstracción no oculta: **selecciona y nombra**. Un modelo puede estar perfectamente abstraído y tener todos los atributos públicos (mala encapsulación, buena abstracción), y al revés. El segundo error es confundir *abstracción* (el pilar) con *clase abstracta* (una construcción concreta del lenguaje y de UML): la clase abstracta es una forma de aplicar abstracción, no su definición.
:::

:::avanzado La abstracción es relativa al propósito, y eso decide las fronteras del modelo
La misma persona física es una abstracción distinta según para qué se la mire: para la nómina es un `Empleado` (legajo, contrato, remuneración); para el control de acceso es un `Usuario` (credenciales, rol). Que sean **dos clases unidas por una asociación opcional `0..1`**, y no una sola clase con veinte campos ni una herencia `Usuario extends Empleado`, es exactamente una decisión de abstracción: responden a propósitos distintos, cambian por razones distintas y tienen ciclos de vida distintos —un contratista externo puede tener cuenta sin ser empleado; un operario puede ser empleado sin tener cuenta—. Poder enunciar ese criterio, **una abstracción por propósito**, separa una respuesta de 7 de una definición de manual.
:::

### 2.2 Encapsulamiento

**Encapsulamiento es reunir en una misma unidad los datos y las operaciones que los gobiernan, y controlar el acceso al estado interno de modo que solo pueda cambiar a través de esas operaciones.** Su finalidad no es el secreto: es la **garantía de invariantes**. Si el estado solo se altera por caminos conocidos, esos caminos pueden comprobar las reglas. En EcoTech se expresa en dos decisiones observables: los campos son privados o protegidos, y **no existen setters genéricos**; en su lugar hay operaciones con nombre de negocio. La comparación canónica es `registro.setEstado("APROBADO")` más `registro.setAprobadoPor(id)` frente a `registro.aprobar(idJefe)`: la segunda forma verifica que el registro estuviera `ENVIADO`, impide que alguien apruebe sus propias horas y deja el objeto coherente en un solo paso; la primera pierde las tres garantías en cuanto un llamador olvida una línea. Es, además, la respuesta técnica a dos síntomas literales del enunciado: los datos personales en riesgo y la falta de trazabilidad de las horas.

:::trampa "Encapsular es poner todo privado y generar getter y setter para cada campo"
Un getter y un setter públicos sobre un campo privado dejan la clase **exactamente igual de expuesta** que si el campo fuera público, solo que con más código y con la ilusión de haber cumplido. Peor: un setter público hace imposible mantener cualquier invariante que involucre dos campos a la vez. El error se detecta en el propio diagrama: si el tercer compartimento de una clase es una lista de `getX`/`setX`, esa clase no está encapsulada, está **anémica**.
:::

:::avanzado Tres matices que casi nadie menciona
**Uno**: encapsulamiento no es ocultamiento de información. El primero es el mecanismo (unir datos y comportamiento, controlar el acceso); el segundo es el criterio de Parnas sobre *qué* esconder —las decisiones de diseño que probablemente cambien—, y lo tratamos aparte en la sección 8. **Dos**: hay grados. Un getter de solo lectura sobre un dato que efectivamente es público del objeto es legítimo; lo que se prohíbe es la **mutación sin regla**. **Tres**: en la mayoría de lenguajes la visibilidad es **por clase y no por objeto**, de modo que una instancia puede tocar los campos privados de otra instancia de la misma clase; el encapsulamiento protege contra el resto del sistema, no contra uno mismo. En EcoTech el ejemplo más fuerte es que el hash y la sal de la contraseña en `Usuario` **no tienen getter en absoluto**: la única vía es `credencialesParaVerificar()`, precisamente para que todo uso sea rastreable con una búsqueda del código.
:::

### 2.3 Herencia (generalización)

**Herencia es la relación entre una clase general y una especializada, en la que la segunda hereda estructura y comportamiento de la primera y puede redefinirlos.** En UML se llama **generalización** y se dibuja con línea continua y triángulo hueco cerrado apuntando a la superclase. El criterio para usarla es doble y ambas partes importan: debe existir una relación **"es un tipo de" permanente** (un objeto no deja de pertenecer a su subclase mientras exista) y debe haber **sustituibilidad** (cualquier lugar que espere la clase base funciona con cualquier subclase sin saber cuál recibió). En EcoTech el único eje de herencia justificado es el **tipo de contrato** —`EmpleadoAsalariado`, `EmpleadoPorHoras`, `Contratista`— porque la empresa remunera de tres maneras estructuralmente distintas y esas tres formas son permanentes en el objeto.

:::trampa Heredar por reutilizar código o por parecido léxico entre sustantivos
El clásico es `Gerente extends Empleado`. Es incorrecto porque **ser gerente es un rol que se ocupa y se deja**: si el gerente cambia, con herencia habría que destruir la instancia y crear otra, perdiendo el legajo, las horas y el historial de la misma persona. La regla de detección es directa: **si un objeto puede dejar de pertenecer a la subclase sin dejar de ser el mismo objeto, no es herencia**, es un rol o un estado, y se modela como asociación o como atributo. El mismo error produce `Usuario extends Empleado` y las subclases por estado del tipo `ProyectoActivo extends Proyecto`.
:::

:::avanzado Tres cosas separan aquí una respuesta sobresaliente
**Primera**: la herencia es el acoplamiento más fuerte que existe entre dos clases —la subclase depende de la implementación de la base, no solo de su interfaz—, de ahí la máxima "favorecer composición sobre herencia" y de ahí que convenga un solo eje y no una jerarquía profunda. **Segunda**: distinguir herencia de implementación (reutilizar código) de herencia de interfaz o subtipado (prometer un contrato); lo que legitima la jerarquía de EcoTech es la segunda, y la reutilización es un efecto secundario. **Tercera**: enunciar el principio de sustitución de Liskov como la prueba formal del "es un", y saber cuál es la alternativa que se descartó —una sola clase `Empleado` con un campo `tipo` y un `switch` dentro de `calcularSueldo`, que reaparece en el generador de nómina, en el validador de altas y en los informes, y que produce errores de cálculo silenciosos cada vez que alguien olvida uno de esos puntos.
:::

### 2.4 Polimorfismo

**Polimorfismo es que un mismo mensaje produzca comportamientos distintos según la clase real del objeto que lo recibe, sin que quien lo envía necesite saber cuál es.** El mecanismo es el **enlace dinámico**: qué implementación se ejecuta se decide en tiempo de ejecución. Su beneficio observable es **la desaparición de los condicionales por tipo**. En EcoTech el motor de nómina recorre una lista de `Empleado` y llama `empleado.calcularRemuneracionMensual(horasAprobadas)`: tres fórmulas distintas —sueldo fijo; horas por tarifa con extras al 1,5x sobre 160 horas; horas por tarifa con tope mensual— y cero condicionales. Añadir una cuarta modalidad de contrato es añadir una clase, no editar cinco archivos. En la defensa, esta es la respuesta a *"¿qué gana el sistema con esa herencia?"*.

:::trampa Llamar polimorfismo a la sobrecarga
**Sobrecarga** son varios métodos con el mismo nombre y distintos parámetros en la misma clase: se resuelve en **compilación** por la firma y no aporta ninguna de las propiedades que se le atribuyen al polimorfismo en diseño. **Sobrescritura** es redefinir en la subclase un método de la base: se resuelve en **ejecución** por el tipo real del receptor, y es la que elimina los condicionales. El otro error es afirmar "uso polimorfismo" sin poder señalar un solo punto del modelo donde el llamador ignora el tipo concreto: si en algún lugar queda un `if` por tipo, el polimorfismo no está haciendo su trabajo.
:::

:::avanzado Los tres tipos, y los cuatro ejes del modelo
Nómbralos y distínguelos: **ad hoc** (sobrecarga), **paramétrico** (genéricos, como `Repositorio<T>`) y **de subtipo o de inclusión** (el dinámico, el que importa en POO). Y muestra que el polimorfismo aparece en varios ejes independientes, no solo en la remuneración: en la **jerarquía de errores**, donde `ErrorDominio` declara `codigoHttp` abstracto y la capa HTTP le pregunta al error por su propio código en vez de encadenar `instanceof`; en la **validación**, donde `Regla` tiene un único método `aplicar()` y el `Esquema` recorre la lista sin saber qué regla ejecuta; y en los **informes**, donde `Reporte.generar()` es un método plantilla que fija el algoritmo y deja los pasos a las subclases mientras `Exportador` tiene cuatro implementaciones, de modo que cinco informes por cuatro formatos son veinte combinaciones servidas por nueve clases pequeñas y ningún `switch`. Matiz final para la defensa en Python: allí el polimorfismo **no requiere herencia** (*duck typing*), y conviene mencionarlo justo al defender la viabilidad.
:::

---

## 3. Clase, objeto, instancia, atributo, método

El Paso 1 pide "describe al menos 4 elementos del problema, indicando para cada una sus atributos, posibles objetos y al menos 1 responsabilidad asociada al caso": te obliga a distinguir el molde del ejemplar y a usar los cuatro términos con precisión. La guía pide exponer *"utilizando vocabulario técnico preciso"* y esta es la sección donde se gana o se pierde.

### 3.1 Clase, objeto e instancia (y la identidad)

Una **clase** es la definición: el tipo que describe qué atributos y qué operaciones tendrán todos sus ejemplares, y que además actúa como fábrica de ellos. Un **objeto** es un ejemplar concreto en memoria, con tres cosas: **identidad** (es él y no otro), **estado** (los valores actuales de sus atributos) y **comportamiento** (las operaciones que sabe responder). **"Instancia" no es un tercer concepto**, sino la relación entre ambos: decir que un objeto es instancia de una clase es decir de qué molde salió. En la práctica objeto e instancia se usan como sinónimos, pero "instancia" pone el énfasis en la clase de la que proviene.

:::ejemplo Los tres términos sobre el mismo caso
`Empleado` es la **clase**. El empleado con legajo 0042, Ana Rivas, asalariada, del departamento de Investigación, es un **objeto**. Su **clase real** es `EmpleadoAsalariado`, aunque el motor de nómina lo trate como `Empleado`: eso último es polimorfismo en funcionamiento.
:::

:::trampa Hablar de la clase como si tuviera estado
"La clase `Empleado` tiene el nombre Ana" es un error de categoría. Y no pongas objetos concretos dentro del diagrama de clases: el diagrama de clases muestra **tipos**; los ejemplares van en un **diagrama de objetos**, con la notación `nombre:Clase` subrayada. El error más grave para este caso es **asumir que dos objetos con los mismos valores son el mismo objeto**: no lo son, y confundirlos es exactamente lo que produce la duplicidad de empleados de la que se queja la empresa.
:::

:::avanzado Separar identidad de igualdad de estado, y sacar de ahí una decisión
Dos filas con el mismo nombre no son la misma persona, y la misma persona puede aparecer con el nombre escrito de dos formas. Por eso el modelo asigna un **identificador único generado por el sistema (UUID)** y además **comprueba unicidad sobre atributos naturales** —documento, correo personal— antes de dar de alta. Esa es la diferencia entre "le puse un id porque siempre se pone" y "el id resuelve el primer síntoma del enunciado". Complemento: una **clase abstracta no produce instancias directas** (`Empleado` nunca se instancia; se instancian sus tres subclases) y los **miembros estáticos pertenecen a la clase** y no a ningún objeto, con lo cual la frase "todo atributo pertenece a un objeto" es falsa.
:::

### 3.2 Atributo, campo y propiedad

En **UML**, *atributo* es una característica estructural que un clasificador posee: va en el segundo compartimento con visibilidad, nombre, tipo y opcionalmente multiplicidad, valor por defecto y restricciones; y en el metamodelo *propiedad* (`Property`) es el concepto más general, porque tanto los atributos como los extremos de asociación son propiedades. En **programación** el reparto es otro: *campo* o *atributo* es el dato realmente almacenado, y *propiedad* es un miembro que se accede con sintaxis de dato pero ejecuta código al leerse o escribirse (`property` de Python, `get`/`set` de C# o TypeScript). Dicho corto: **todo atributo almacena; una propiedad puede calcular**. `fechaInicioContrato` es un atributo almacenado; `antiguedadEnAnios` es derivado, se marca en UML con una barra delante (`/antiguedad`) y en Python se implementa como `@property` de solo lectura.

:::trampa Poner en el diagrama atributos que en realidad son derivados
`edad` junto a `fechaNacimiento`. `totalHoras` junto a la colección de registros. `nombreCompleto` junto a `nombre` y `apellido`. Un derivado guardado como atributo es una **fuente garantizada de incoherencia**, porque puede quedar desactualizado respecto de aquello de lo que depende. El otro error frecuente es usar "atributo" y "propiedad" como sinónimos intercambiables a lo largo del informe, y listar getters y setters en el compartimento de operaciones: llenan el diagrama de ruido y delatan un modelo anémico.
:::

:::avanzado Marcar los derivados, y distinguir instancia de clase
No elimines los derivados: **márcalos** con `/nombreCompleto`. Documentan una consulta que el dominio necesita sin comprometerse a almacenarla, y permiten explicar que "almacenar o calcular" es una decisión de diseño con consecuencias: coste de cálculo frente a riesgo de desincronización. Y distingue **atributo de instancia** de **atributo de clase** (estático, subrayado en UML): cada empleado tiene su propio salario, pero un tope legal compartido o un contador de instancias pertenecen a la clase. En este modelo el ejemplo limpio es `Departamento.normalizarNombre()`, estático porque no necesita ningún departamento concreto para hacer su trabajo.
:::

### 3.3 Método, mensaje, firma y responsabilidad

Un **método** es la implementación de una operación que la clase ofrece; el **mensaje** es la invocación que un objeto envía a otro; la **firma** es el contrato visible (nombre, parámetros con sus tipos, tipo de retorno). Una **responsabilidad** es una obligación del objeto expresada en el lenguaje del dominio: "aprobar un parte de horas verificando quién lo aprueba", "calcular la remuneración del mes", "designar gerente". **La regla de oro del modelado**: los datos y las reglas que los gobiernan viven juntos; si una regla habla mayoritariamente del estado de una clase, esa regla es un método de esa clase y no de un servicio externo. Los nombres vienen del dominio (`aprobar`, `desasignar`, `designarGerente`), no de la mecánica de almacenamiento (`updateEstado`, `setFlag`).

:::trampa El modelo anémico, y su contrario
Poblar el tercer compartimento con CRUD y accesores —`crear`, `leer`, `actualizar`, `eliminar`, `getNombre`, `setSalario`— y creer que con eso la clase "tiene comportamiento". Eso es un **modelo anémico**: las clases quedan como contenedores de datos y las reglas se desplazan a una clase gestora, donde nadie las protege y donde se duplican; el síntoma en el diagrama es que ninguna operación tiene nombre de negocio. El error inverso también existe: meter en la entidad operaciones que no le corresponden, como un `login()` dentro de `Empleado`, que mezcla autenticación con datos laborales.
:::

:::avanzado "Tell, don't ask", y dónde está la frontera
En vez de preguntarle al objeto su estado para decidir fuera qué hacer, pídele que haga la operación y que decida él. Y ten preparados los dos casos límite del modelo, porque el docente puede señalar la aparente inconsistencia: `aprobar()` vive en `RegistroTiempo` porque la regla habla de su propio estado y de quién la ejecuta; en cambio la orquestación del alta de un empleado con control de duplicados vive en `ServicioEmpleados`, porque involucra varias entidades, el repositorio y el índice ciego, y **ninguna entidad es dueña natural de esa coordinación**. Poder trazar esa frontera —lógica de dominio dentro de la entidad, coordinación entre entidades en la capa de aplicación— es el matiz que distingue a quien ha modelado de quien ha copiado un diagrama.
:::

### 3.4 Entidad y objeto de valor: el criterio para elegir las clases

El Paso 1 exige identificar al menos 4 entidades "clasificándolas como entidades principales" y justificar oralmente cómo se seleccionaron. Sin un criterio explícito, esa justificación se convierte en "me parecieron importantes", que es justo lo que la acción oral del Paso 1 no da por buena cuando exige justificar *"cómo se seleccionaron las entidades principales"*. Una **entidad** es un sustantivo del dominio que cumple dos condiciones: **identidad propia** (dos objetos con los mismos valores no son el mismo objeto, y por tanto necesita un identificador) y **ciclo de vida** (nace, cambia de estado, termina). Un **objeto de valor** se define enteramente por sus valores, no tiene identidad ni existencia independiente y suele ser inmutable: una dirección, un rango de fechas, un importe con su moneda. El criterio no es un tecnicismo: **decide qué necesita identificador, qué necesita repositorio y qué se guarda dentro de otra cosa.**

:::trampa Convertir en entidad todo sustantivo del enunciado
Incluidos los roles (`Gerente`), los conjuntos cerrados de valores (`Rol`, `Permiso`, `Formato`) y las abstracciones organizativas sin ciclo de vida. `Rol` y `Permiso` son valores de un conjunto conocido, no cosas con historia: modelarlos como entidades editables obliga a añadir una tabla, un CRUD y una pantalla para expresar algo que cabe en veinte líneas y que además conviene que solo cambie con un despliegue revisado. El error espejo es **olvidar entidades que no son sustantivos evidentes**, como la asignación de un empleado a un proyecto.
:::

:::avanzado Dedica un apartado del informe a lo que descartaste
Modelar bien es sobre todo decidir qué dejar fuera, y una lista razonada de no-entidades demuestra criterio en un párrafo mejor que tres cajas más en el diagrama.

| Descartado | Por qué |
|---|---|
| `Gerente` | Es un rol ocupable y liberable, no un tipo permanente |
| `Rol`, `Permiso` | Conjuntos cerrados de valores, no cosas con historia |
| `Sistema`, `GestorGeneral` | Clase-dios: el antipatrón más frecuente de los modelos generados automáticamente |
| `DatosSensibles` | Objeto de valor: no existe fuera de la persona a la que pertenece |

En la defensa, *"¿por qué no hay una clase `Gerente`?"* es casi segura, y la respuesta correcta no es "no hacía falta" sino: *"porque si el gerente cambia habría que destruir y recrear la instancia, perdiendo legajo, horas e historial de la misma persona; por eso es una asociación dirigida `Departamento --gerente--> Empleado` con multiplicidad `0..1`, que además permite que el puesto esté vacante"*.
:::

---

## 4. El diagrama de clases UML

![Los tres compartimentos de una clase UML: nombre, atributos y operaciones, con sus marcadores de visibilidad](diagramas/anatomia-clase.svg)

El criterio 1.1.2 evalúa "la notación UML" y el Paso 2 pide "organización clara, coherente y comprensible". Los errores de notación en la caja son los más baratos de evitar y los más visibles al corregir.

### 4.1 Los compartimentos

Una clase se dibuja como un rectángulo dividido en compartimentos: **nombre**, **atributos**, **operaciones**. El nombre va centrado y en negrita, **en singular y en PascalCase** (`Empleado`, `RegistroTiempo`; nunca `empleados` ni `registro_tiempo`), y en *cursiva* si la clase es abstracta. Sobre el nombre pueden aparecer **estereotipos** entre comillas angulares —«interface», «enumeration», «abstract»— y debajo, opcionalmente, el paquete. Los compartimentos de atributos y operaciones se pueden **omitir enteros** en un diagrama de contexto, pero un compartimento **vacío** no es lo mismo que uno **omitido**: vacío afirma que no hay miembros, omitido dice que no se muestran. UML admite además compartimentos adicionales, por ejemplo para responsabilidades o restricciones.

:::trampa Mezclar compartimentos, pluralizar y colar el modelo de datos
Poner atributos y operaciones juntos; poner el nombre en plural (una clase describe un ejemplar, no la colección); dibujar dos compartimentos "para ahorrar espacio" cuando la clase sí tiene operaciones. Y el más caro de todos: meter en el diagrama de clases elementos que pertenecen al **modelo de datos** —claves foráneas, tablas intermedias, índices, identificadores autoincrementales—. El diagrama de clases modela **el dominio**, no el esquema de la base.
:::

:::avanzado Niveles de detalle declarados
Usa conscientemente distintos niveles de detalle en distintas figuras del mismo informe: una **vista general** con solo nombres y relaciones para que se entienda la arquitectura, y **vistas de detalle por subsistema** con atributos y operaciones completos. Un único diagrama con veinte clases y todos sus miembros es técnicamente correcto e **ilegible**, y la guía evalúa explícitamente que la organización sea comprensible. Declarar en el pie de cada figura qué nivel de detalle tiene y por qué es señal de dominio, no de pereza.
:::

### 4.2 Visibilidad: `+ - # ~`

Es la forma en que el encapsulamiento se hace **visible en el diagrama**: sin marcas de visibilidad, la afirmación "el modelo aplica encapsulamiento" no se puede verificar en la figura.

| Marcador | Significa | Alcance |
|:--:|---|---|
| `+` | público | Visible desde cualquier parte |
| `-` | privado | Solo dentro de la propia clase |
| `#` | protegido | La clase y sus subclases |
| `~` | de paquete | Dentro del mismo paquete |

La regla de diseño que los acompaña: **los atributos tienden a privados o protegidos; públicas son las operaciones que constituyen el contrato de la clase.** En EcoTech, `Persona` declara sus campos como protegidos (`#nombre`, `#apellido`, `#datosSensibles`) porque las subclases los necesitan; `EmpleadoAsalariado` declara `-salarioMensual` privado porque nadie más debe tocarlo; y las operaciones de negocio (`+aprobar`, `+designarGerente`, `+calcularRemuneracionMensual`) son públicas.

:::trampa La virgulilla olvidada y los atributos sin marcador
`~` es la visibilidad que más se cae en los exámenes orales: apréndetela aunque no la uses. Y en el diagrama, **omitir la visibilidad no significa "público"**: en UML significa que la visibilidad **no está especificada**, y un corrector lo lee como una omisión. El error de fondo más grave es marcar todo público por comodidad y luego afirmar en el texto que el modelo está encapsulado: la figura contradice al informe.
:::

:::avanzado Protegido no es "un privado más permisivo"
Abrir un campo a las subclases es **aumentar el acoplamiento de la jerarquía**: cualquier subclase futura puede depender de la representación interna de la base y romperse si esta cambia. Por eso la elección entre `#` y `-` se argumenta caso por caso: `Persona` usa `#` solo para lo que `Empleado` necesita manipular, y los campos de remuneración de cada subclase son privados porque son propios de esa modalidad. Otro matiz que suma: la visibilidad en UML también se aplica **a las clases dentro de un paquete y a los extremos de asociación**, no solo a los miembros.
:::

### 4.3 Sintaxis de atributos y operaciones

Escribir `nombre` en vez de `-nombre: String` es la diferencia entre un boceto y un diagrama UML. La forma canónica de un **atributo** es: visibilidad, barra si es derivado, nombre, dos puntos, tipo, multiplicidad entre corchetes si es colección, `=` y valor por defecto, restricciones entre llaves. La de una **operación**: visibilidad, nombre, paréntesis con los parámetros —cada uno con dirección opcional (`in`, `out`, `inout`), nombre, tipo y valor por defecto—, dos puntos, tipo de retorno, restricciones entre llaves.

```text
-activo: Boolean = true
#telefonos: String [0..*] {unique}
/nombreCompleto: String
-id: UUID {readOnly}
+calcularRemuneracionMensual(horasAprobadas: Number): Number
+aprobar(aprobadorId: String): void
+asignar(proyectoId: String, dedicacion: Integer): AsignacionProyecto {dedicacion <= 100}
```

Los tipos pueden ser primitivos (`String`, `Integer`, `Boolean`, `Date`), otras clases del modelo (`EstadoProyecto`, `SobreCifrado`) o colecciones.

:::trampa Paréntesis vacíos y sintaxis del lenguaje
Omitir los tipos —de atributos y de retorno— y dejar los paréntesis vacíos en métodos que evidentemente reciben datos. Un método sin parámetros ni tipo de retorno **no comunica nada verificable**, y la coherencia entre lo que la operación necesita y lo que la clase tiene es justo lo que la guía pide sustentar oralmente: *"la consistencia de los atributos y métodos frente a los requerimientos del sistema"*. El otro error es mezclar sintaxis de un lenguaje concreto (`public String getNombre()`, `def calcular(self)`): UML tiene su propia notación, y usar la del lenguaje delata que el diagrama se dibujó desde el código, que es exactamente la sospecha que tú tienes que desactivar.
:::

:::avanzado Restricciones entre llaves: el diagrama que lleva sus invariantes escritas
`{readOnly}` en un identificador, `{unique}` en una colección sin repetidos, `{ordered}` si el orden importa, y restricciones de dominio del tipo `{dedicacion <= 100}` o `{fechaFin > fechaInicio}`. Un diagrama con sus invariantes escritas comunica **reglas de negocio**, no solo estructura, y eso es lo que el enunciado reclama cuando se queja de que en las hojas de cálculo solo había campos. Complemento: la multiplicidad también se puede poner **en un atributo**, no solo en un extremo de asociación; saberlo evita crear asociaciones artificiales para expresar "una persona puede tener varios teléfonos".
:::

### 4.4 Miembros estáticos

Un **miembro estático pertenece a la clase y no a ninguna instancia**: existe una sola copia, compartida, y se puede usar sin haber creado ningún objeto. **En UML se representa subrayando** el nombre. Se usa para atributos propios del concepto y no del ejemplar (un contador de instancias, una constante compartida, un tope legal) y para operaciones que no necesitan el estado de ningún objeto: utilidades de normalización, validadores puros y, sobre todo, **métodos de fábrica**. En EcoTech, `normalizarNombre(String): String` es estático porque limpia y compara nombres de departamento sin necesitar un departamento.

:::aviso Mermaid no subraya
En la notación Mermaid que usa tu repositorio, el subrayado se escribe con el sufijo `$` y los métodos abstractos con `*`. Eso **hay que declararlo en una tabla de notación dentro del informe**, o el corrector lo leerá como una omisión de notación UML.
:::

:::trampa No marcarlos, o abusar de ellos
Una clase compuesta solo de métodos estáticos **no es una clase**: es un módulo procedural con sintaxis de objetos, y **no participa del polimorfismo**, porque los miembros estáticos se resuelven por el tipo declarado y no por el tipo real del objeto. Y no confundas "estático" con "constante": un atributo estático puede ser mutable, y entonces es **estado global compartido**, con todos sus problemas.
:::

:::avanzado El subrayado significa cosas distintas según el diagrama
En un **diagrama de clases** marca un miembro estático; en un **diagrama de objetos**, el subrayado del rótulo (`ana:EmpleadoAsalariado`) indica una instancia concreta. Y la interacción entre estático y polimorfismo da un argumento fuerte: un método de fábrica estático como `Empleado.crear(tipo, datos)` centraliza la decisión de qué subclase instanciar, y es **el único punto del sistema donde legítimamente hay un condicional por tipo**, porque en algún lugar hay que elegir la clase; el resto del sistema, a partir de ahí, es polimórfico. Reconocer ese único punto y defenderlo es un argumento de nivel alto.
:::

### 4.5 Clases abstractas, métodos abstractos e interfaces

Una **clase abstracta** define estructura y comportamiento común pero **no se puede instanciar**: existe para ser especializada. Un **método abstracto** declara la firma sin implementación y obliga a cada subclase concreta a proporcionarla. En UML, tanto el nombre de la clase abstracta como los de sus operaciones abstractas se escriben **en cursiva**; alternativamente se marca con la restricción `{abstract}` o el estereotipo «abstract», que es lo que hay que usar cuando la herramienta no soporta cursiva. Una **interfaz** es un contrato puramente declarativo —solo operaciones, sin estado—, se marca con «interface», y la clase que la cumple se une a ella con una **realización**.

| | Clase abstracta | Interfaz |
|---|---|---|
| Estado (atributos) | Sí | No |
| Métodos ya implementados | Sí | No |
| Cuántas se pueden tener | Una | Varias |
| Relación en UML | Generalización (línea continua) | Realización (línea discontinua) |

En EcoTech, `Empleado` es abstracta y declara `calcularRemuneracionMensual()` como abstracto: es el punto exacto donde el modelo dice *"toda modalidad de contrato debe saber calcular su remuneración, y cada una lo hace a su manera"*.

:::trampa Dibujar la abstracta igual que las concretas
Sin cursiva ni marca, el diagrama **afirma que `Empleado` se puede instanciar directamente**, cosa que el modelo prohíbe. También es frecuente confundir clase abstracta con interfaz (ver la tabla). Y hay un error de diseño clásico: crear una clase abstracta que **no declara ni un solo método abstracto**, con lo cual la abstracción no promete nada y la jerarquía solo sirve para reutilizar campos.
:::

:::avanzado Justificar una clase abstracta con una sola subclase
Es el caso de `Persona` en este modelo, y la pregunta va a caer. La respuesta débil es "por si acaso". La fuerte: `Persona` no existe para prever futuras subclases, sino para **separar dos cuerpos de reglas con ciclos de vida y regímenes de acceso distintos**. El dato personal está sujeto a normativa de privacidad, va cifrado y se enmascara según permisos; el dato laboral —legajo, contrato, remuneración— cambia por otras razones y lo consultan otros actores. Dos razones de cambio, dos clases.
:::

---

## 5. Las relaciones

![Las seis relaciones del diagrama de clases con su notación: asociación, agregación, composición, dependencia, generalización y realización](diagramas/relaciones-uml.svg)

El Paso 2 exige "determinar al menos 3 relaciones entre las clases del sistema, especificando su tipo y multiplicidad: Asociación. Dependencia. Agregación y/o composición. Generalización (herencia)". Cubre las cuatro categorías: son cuatro líneas y no hay razón para arriesgar un indicador por ahorrártelas.

### 5.1 Asociación y asociación dirigida

Una **asociación** es una relación estructural y **duradera** entre dos clases: sus objetos se conocen y ese vínculo persiste, normalmente porque uno guarda una referencia al otro como atributo. Se dibuja con **línea continua** y puede llevar tres adornos: un **nombre** de la relación en el centro, opcionalmente con un triángulo relleno que indica el sentido de lectura; **nombres de rol** en cada extremo, que dicen qué papel juega esa clase para la otra (el extremo `Empleado` de la relación con `Departamento` tiene el rol `gerente`); y **multiplicidades** en cada extremo. La **asociación dirigida** añade una **punta de flecha abierta** —dos trazos, no un triángulo— en el extremo navegable: desde la clase de origen se llega a la de destino, pero no al revés. En EcoTech, `Departamento --gerente--> Empleado` es dirigida porque el departamento necesita conocer a su gerente, pero el empleado no necesita saber que dirige un área.

:::trampa Líneas mudas y flechas confundidas
Dibujar todas las relaciones como líneas sin nombre, sin roles y sin multiplicidad: la figura dice "estas dos clases tienen algo que ver" y nada más. Confundir gráficamente la **punta abierta** de la asociación dirigida con el **triángulo cerrado** de la generalización: son relaciones completamente distintas y el error se lee como desconocimiento de la notación. Y no distinguir asociación de dependencia: **si una clase guarda a la otra como atributo, es asociación; si solo la usa de paso, es dependencia.**
:::

:::avanzado La navegabilidad como decisión, y cómo se materializa aquí
Cada dirección navegable es una dependencia que hay que mantener: limitar la navegación **reduce el acoplamiento y evita ciclos**, y eso es un argumento de diseño, no un adorno. Ten preparado además cómo se materializa la asociación en tu sistema: **se persiste como identificador** (`private _gerenteId: string | null`) y no como referencia directa al objeto, por tres razones concretas —evitar ciclos al serializar, evitar reescribir todos los departamentos cuando cambia un empleado, y encajar con un almacén clave-valor donde cada colección se guarda por separado—. La contrapartida, que hay que decir en voz alta antes de que la pregunten: **la integridad referencial deja de garantizarla el modelo y pasan a imponerla los servicios**, que comprueban que el identificador exista y apunte a una entidad activa antes de guardar. Nombrar la contrapartida, y no solo la ventaja, es lo que distingue una defensa de nivel 7.
:::

### 5.2 Agregación frente a composición

![La diferencia decisiva: rombo hueco para la agregación, rombo relleno para la composición, siempre en el extremo del todo](diagramas/agregacion-vs-composicion.svg)

Es **la pregunta oral más previsible de toda la defensa** y uno de los errores que las propuestas generadas por IA cometen con más regularidad, de modo que también alimenta el Paso 3. Ambas son relaciones **todo-parte** y ambas se dibujan con un **rombo en el extremo del TODO**, nunca en el de la parte.

| | Agregación | Composición |
|---|---|---|
| Rombo | Hueco (blanco) | Relleno (negro) |
| ¿La parte se comparte? | Sí, entre varios todos | No: un solo todo (`1` o `0..1`) |
| Ciclo de vida | Independiente | Ligado: al destruir el todo se destruyen las partes |
| Fuerza del compromiso | Documentación de intención | Semántica definida y verificable |

**La prueba decisiva es una sola pregunta**: qué debe ocurrir con la parte cuando se elimina el todo. En EcoTech, `Departamento`–`Empleado` es **agregación** porque disolver un departamento no elimina a su gente; si fuera composición, el modelo estaría afirmando que borrar un área borra a sus empleados, lo cual es falso en cualquier empresa.

:::trampa Elegir el rombo por intensidad emocional de la relación
"El registro de horas es muy del empleado, pongo composición." El criterio no es la intensidad del vínculo: es **el ciclo de vida**. Y el rombo **siempre va pegado al contenedor**; dibujarlo en el extremo de la parte invierte la afirmación. Usar composición para toda relación de pertenencia "porque se ve más fuerte" es exactamente el sesgo que reproducen los generadores automáticos: el rombo relleno abunda en los ejemplos publicados y por eso aparece.
:::

:::avanzado Tres capas de profundidad
**Primera**: en UML 2.5 no son dos tipos de relación distintos, sino un valor de la propiedad `aggregation` —del tipo enumerado `AggregationKind`— en el extremo de asociación que posee el todo: `none`, `shared`, `composite`; es decir, son asociaciones con un matiz semántico. **Segunda**: el propio estándar reconoce que la semántica precisa de la agregación compartida varía según el área de aplicación y el modelador, mientras que la de la composición sí está definida; en consecuencia, la composición es un compromiso verificable y la agregación es esencialmente documentación de intención. **Tercera, y es la que gana puntos aquí**: `Empleado`–`RegistroTiempo` se acerca conceptualmente a la composición —un parte de horas no significa nada sin su autor— pero se modela como agregación porque el sistema **no borra en cascada**: las bajas de empleado son lógicas y los registros sobreviven para que los informes históricos sigan cuadrando. Elegir agregación por una razón de **trazabilidad**, y poder enunciarla, es exactamente la respuesta de 7.
:::

### 5.3 Dependencia

Es la relación más débil: **la clase cliente usa a la proveedora de forma puntual y transitoria, sin guardarla como atributo**. Se dibuja con **línea discontinua y punta de flecha abierta**, del cliente al proveedor, y puede llevar un estereotipo que precisa el uso: «use», «create», «instantiate», «call». Los cuatro casos típicos son que la clase proveedora aparezca como **tipo de un parámetro**, como **tipo de retorno**, como **variable local** dentro de un método, o que se invoque sobre ella un **método estático**. El criterio de distinción con la asociación es mecánico: **si la relación se guarda en un atributo y persiste entre llamadas, es asociación; si solo existe durante la ejecución de un método, es dependencia.** En EcoTech el ejemplo natural es `ServicioReportes ..> Exportador` con estereotipo «use», o `ServicioEmpleados ..> ServicioCripto`.

:::trampa La relación que nadie dibuja
La dependencia es la única de las cuatro categorías que muchos estudiantes **no incluyen**, porque no aparece sola en un diagrama de dominio: hay que ir a buscarla. Perder un criterio explícito por una línea discontinua es caro y evitable. Los errores de notación: dibujarla con línea continua, o confundir su punta abierta con el **triángulo cerrado hueco** de la realización. Y usar dependencia donde corresponde asociación "porque parece más suave": si la clase guarda una referencia, la relación es estructural, y minimizarla oculta acoplamiento real.
:::

:::avanzado La dependencia como argumento de arquitectura
Úsala para hacer visible **la dirección del acoplamiento** y, con ella, argumentar **inversión de dependencias**: en un buen modelo el dominio no depende de la infraestructura, sino que la infraestructura realiza una interfaz que el dominio define. En este sistema esa frontera es `Repositorio<T>`: los servicios dependen de la interfaz y la implementación sobre Workers KV la realiza, de modo que en el diagrama la flecha apunta **hacia la abstracción** y no hacia el almacén. Poder decir *"esta flecha discontinua es lo que permitiría cambiar a PostgreSQL sin tocar una sola regla de negocio"* convierte un detalle de notación en un argumento de arquitectura, y de paso responde a la consideración técnica *"utiliza una base de datos"*, tratada en [Ambigüedades](02-ambiguedades-y-riesgos.html).
:::

### 5.4 Generalización y realización

Las dos se dibujan con **triángulo hueco cerrado** y confundirlas es un error de notación caro.

| Relación | Línea | Punta | Significa |
|---|---|---|---|
| Generalización | Continua | Triángulo hueco a la superclase | Hereda estructura y comportamiento; es sustituible |
| Realización | Discontinua | Triángulo hueco a la interfaz | Se compromete a implementar el contrato; no hereda estructura |

**Regla mnemotécnica exacta**: el triángulo hueco siempre apunta a lo más abstracto; la **línea continua** indica herencia de estructura, la **discontinua** indica solo cumplimiento de contrato. En el modelo, `EmpleadoAsalariado --|> Empleado --|> Persona --|> Entidad` son generalizaciones, y `RepositorioKV ..|> Repositorio<T>` es una realización.

:::trampa La punta al revés y las jerarquías profundas
Dibujar la generalización con la punta hacia la subclase: se lee "la subclase **es un tipo de** la superclase", y por eso **la punta va arriba**. Usar línea continua para la realización o discontinua para la herencia. Y acumular niveles de herencia sin necesidad: cada nivel añadido es acoplamiento, y tres niveles solo se sostienen si **cada uno introduce reglas propias**. En este modelo `Entidad` aporta identidad y serialización, `Persona` aporta el dato personal y su protección, `Empleado` aporta el vínculo laboral y declara la remuneración como abstracta: cada nivel justifica su existencia, y hay que poder decirlo así.
:::

:::avanzado Restricciones sobre el conjunto de subclases
La generalización admite `{disjoint}` u `{overlapping}`, `{complete}` o `{incomplete}`. En EcoTech, la partición por tipo de contrato es **`{disjoint, complete}`**: un empleado es de exactamente una de las tres modalidades y no hay otras. Eso es una regla de negocio verificable que el diagrama puede **declarar** en vez de dejar implícita. Matiz de defensa: la generalización es entre **clasificadores**, de modo que también existe entre interfaces y entre casos de uso; la realización, en cambio, **cruza niveles de abstracción**, y por eso es la relación que sostiene el principio de inversión de dependencias.
:::

---

## 6. Multiplicidades

![Notación de multiplicidad y su significado: 1, 0..1, 1..*, * y rangos concretos, con la regla de colocación](diagramas/multiplicidades.svg)

En este dominio las multiplicidades son **reglas de negocio literales del enunciado**:

> Cada empleado solo puede pertenecer a un departamento a la vez.

> Los empleados pueden ser asignados a uno o varios proyectos.

Una multiplicidad mal puesta es una regla de negocio mal declarada. La **multiplicidad** es el rango de objetos que pueden participar en un extremo de la asociación: límite inferior, dos puntos, límite superior, con el asterisco para "muchos, sin tope".

| Notación | Significa |
|:--:|---|
| `1` | Exactamente uno, obligatorio |
| `0..1` | Opcional, como máximo uno |
| `1..*` | Al menos uno |
| `*` | Abreviatura de `0..*`: cero o más |
| `2..5` / `3` | Rango concreto / valor exacto |

**La colocación es la parte que más se equivoca.** La multiplicidad se escribe **en el extremo de la línea junto a la clase a la que restringe**, y se lee tomando UN objeto de la clase **del otro extremo**.

:::ejemplo Cómo se lee, palabra por palabra
En la relación `Departamento` ◇—— `Empleado`: el `0..*` dibujado junto a **`Empleado`** se lee *"un departamento tiene de cero a muchos empleados"*; el `0..1` dibujado junto a **`Departamento`** se lee *"un empleado pertenece a como mucho un departamento"*. Si te equivocas de extremo, la figura afirma que un empleado pertenece a muchos departamentos, que es lo contrario de lo que dice el enunciado.
:::

:::trampa Invertir los extremos, poner 1 donde cabe la ausencia, y omitirlas
**Invertir** convierte la figura en una afirmación falsa sobre el negocio. **Poner `1` obligatorio del lado del departamento** prohíbe registrar a un empleado recién ingresado que todavía no ha sido asignado, y prohíbe conservar a un empleado dado de baja sin área; por eso la multiplicidad correcta ahí es `0..1`. **Omitirlas** incumple el criterio 1.1.2 sin discusión posible. Ojo con el matiz: en UML estándar **la generalización y la dependencia no llevan multiplicidad**; si se la pones, es un error de notación. La salida limpia es una tabla de relaciones con una fila que diga *"no aplica: relación de uso, no estructural"*.
:::

:::avanzado Cada multiplicidad es una regla que hay que justificar
Di en el informe **cuáles son consecuencia directa del texto del enunciado y cuáles son decisiones tuyas**. Ejemplo: `Departamento --gerente--> Empleado` se declara `0..1` en el lado del gerente porque **el puesto puede estar vacante**, y `0..*` en el lado del departamento porque en una empresa pequeña una misma persona podría dirigir más de un área; ninguna de las dos cosas está escrita en el enunciado, son decisiones defendibles y hay que presentarlas como tales. **El matiz técnico que remata**: distinguir multiplicidad de cardinalidad. La multiplicidad es la restricción de rango que declara el modelo; la cardinalidad es el número real de objetos vinculados en un momento dado. Los diagramas entidad-relación hablan de cardinalidad; **UML habla de multiplicidad**, y usar el término correcto en la exposición es una señal inmediata de precisión. Añadido: `{ordered}` y `{unique}` sobre el extremo precisan la semántica de la colección.
:::

---

## 7. La clase asociativa

Es la pieza que sostiene la mitad del modelo de EcoTech y la que **casi nunca aparece en un primer modelado ni en las propuestas generadas por IA**. Resuelve dos requisitos explícitos del enunciado —asignar empleados a varios proyectos y registrar horas con trazabilidad— y es, por tanto, **el hallazgo más rentable del Paso 3**.

**Cuando dos clases se relacionan de muchos a muchos y el vínculo tiene datos propios, esos datos no pertenecen a ninguna de las dos clases: pertenecen a la relación.** UML lo representa con una **clase de asociación**, dibujada como una clase normal unida por una **línea discontinua sin puntas** al centro de la línea de asociación. En EcoTech la relación `Empleado`–`Proyecto` es de muchos a muchos y el vínculo tiene tres datos propios: con qué **rol** participa esa persona en ese proyecto, qué **porcentaje de jornada** le dedica, y **desde cuándo y hasta cuándo**. Ninguno pertenece al empleado (cambian según el proyecto) ni al proyecto (cambian según la persona). De ahí nace `AsignacionProyecto`, y de ella dos capacidades que el enunciado pide: **validar que la suma de dedicaciones activas de un empleado no supere el 100 por ciento**, porque existe un objeto al que preguntárselo; y **conservar la trazabilidad de las horas**, porque al desasignar no se borra el vínculo sino que se cierra con `fechaDesasignacion`, y las horas cargadas en ese período conservan una asignación que las explica.

:::trampa La línea `*` a `*` pelada, y la "tabla intermedia"
Resolver el muchos a muchos con una simple línea de multiplicidad `*` a `*` entre `Empleado` y `Proyecto` es lo que produce casi siempre un generador automático: los atributos del vínculo se colocan a la fuerza en uno de los dos extremos —`porcentajeDedicacion` dentro de `Empleado`, por ejemplo—, donde **se duplican, se contradicen o se pierden**. El segundo error es reconocer que hace falta pero dibujarla como una clase intermedia con dos asociaciones y llamarla **"tabla intermedia"**, importando vocabulario del modelo relacional a un diagrama de clases. En un oral, esa palabra cuesta.
:::

:::avanzado La limitación exacta de la clase de asociación, y por qué aquí hay que reificar
Una clase de asociación admite **un único enlace por cada par de objetos**: si Ana y el Proyecto Solar solo pueden estar vinculados una vez, la clase de asociación basta. Pero en EcoTech **una persona puede salir de un proyecto y volver a entrar meses después**, y ambos períodos deben conservarse para que las horas históricas sigan explicándose; en ese momento el par (empleado, proyecto) deja de ser único y **la clase de asociación se queda corta**. La solución es **reificar**: convertir la asignación en una entidad de pleno derecho, con identidad propia (UUID) y dos asociaciones normales `1` a `0..*` hacia `Empleado` y hacia `Proyecto`. Poder explicar por qué el modelo final usa una **entidad reificada** y no la notación de clase de asociación —y que fue **una decisión, no un desconocimiento de la notación**— es el argumento más fuerte disponible en toda esta evaluación. Dilo con esas palabras.
:::

---

## 8. Principios de diseño

El Paso 4 lo pide cuantificado: *"Aplicar al menos 3 principios de diseño orientado a objetos (por ejemplo: cohesión, responsabilidad única, encapsulamiento, claridad) en la mayoría de las clases del modelo."*

:::aviso Este es un hueco real de tu repositorio
En las 7.400 líneas de `docs/` **los principios no están nombrados**. Las decisiones están tomadas y bien tomadas, pero nadie las etiquetó. Nombrarlos es trabajo de escritura, no de rediseño, y es un criterio entero. Lo mismo pasa con la matriz de trazabilidad y con los prompts: ver [Paso 4](06-paso-4-validacion-final.html) y [Paso 3](05-paso-3-evaluacion-critica-ia.html).
:::

### 8.1 Responsabilidad única

La formulación de Robert C. Martin: **una clase debe tener una y solo una razón para cambiar**; y su reformulación posterior, más útil: **una clase debe responder ante un solo actor o interesado**. No significa "una clase con un solo método" ni "una clase que hace una sola cosa" en sentido literal, porque casi toda clase útil hace varias cosas relacionadas. El criterio operativo es preguntarse **quién pide los cambios**: si un cambio en las reglas de nómina y un cambio en las reglas de control de acceso obligan a tocar la misma clase, esa clase responde ante dos actores y hay que separarla. Aplicado al modelo: `Usuario` guarda credenciales y rol, `Empleado` guarda el vínculo laboral, `Persona` guarda el dato personal y `ServicioAutenticacion` coordina el inicio de sesión. Cuatro responsabilidades, cuatro razones de cambio, cuatro piezas.

:::trampa Confundirlo con granularidad, o incumplirlo con una clase-dios
Trocear el modelo en clases anémicas de un solo campo **empeora** el diseño, porque dispersa reglas que deberían estar juntas. Y el error de fondo: crear una clase `Sistema`, `GestorGeneral` o `GestorEmpleados` que concentra todos los métodos del dominio y acaba siendo un módulo procedural con sintaxis de objetos. La señal de alarma es literal: **una clase cuyo nombre termina en Manager, Gestor, Helper o Util y cuyo tercer compartimento no cabe en la caja.**
:::

:::avanzado Argumentarlo con escenarios de cambio, no con adjetivos
En la defensa: *"si mañana la empresa añade una cuarta modalidad de contrato, cambia una clase nueva y nada más; si cambia la política de contraseñas, cambian `Usuario` y el servicio de autenticación, y ninguna entidad de negocio se entera; si cambia el formato de exportación, cambia un `Exportador`"*. Tres escenarios, tres impactos acotados: eso **es** demostrar SRP. Matiz que casi nadie hace: **reconocer dónde se relajó a propósito**. Que una entidad concentre validación e invariantes junto a sus datos es deliberado, porque separar las reglas del dato es precisamente lo que produce el modelo anémico.
:::

### 8.2 Cohesión y acoplamiento

La **cohesión** mide cuán relacionados están entre sí los elementos de una misma clase; se busca **alta**, y la forma más alta es la funcional: todos los atributos y operaciones contribuyen a una única tarea bien definida. El **acoplamiento** mide cuánto depende una clase de otra; se busca **bajo**, en el sentido de dependencias pocas, explícitas y **dirigidas hacia abstracciones estables**. Las dos van juntas: al partir una clase incoherente en piezas cohesivas suele bajar el acoplamiento, y al intentar bajarlo a la fuerza —pasando quince parámetros primitivos en vez de un objeto— se destroza la cohesión. **Indicio práctico de baja cohesión**: los atributos se usan en subconjuntos disjuntos, unos métodos tocan solo un grupo de campos y otros solo el otro. Esa clase pide ser dos.

:::trampa Usarlos como etiquetas de adorno
*"El modelo presenta alta cohesión y bajo acoplamiento"* sin señalar **ni una clase concreta ni una dependencia concreta** es una frase vacía y se lee como tal. Y no creas que el objetivo es acoplamiento cero: si dos clases no dependen de nada, no colaboran, y un sistema sin colaboración no es un sistema. **El acoplamiento no se elimina, se dirige.**
:::

:::avanzado Grados y tipos, y la asimetría clave
De menos a más dañino: por **datos** (pasar un valor, el más benigno), por **estructura**, por **control** (pasar una bandera que decide qué rama ejecutar dentro del otro, señal de que falta polimorfismo) y por **contenido** (tocar el interior del otro, el peor). La asimetría que hay que saber decir: **acoplarse a una abstracción estable es barato; acoplarse a una implementación volátil es caro**, que es exactamente el argumento de `Repositorio<T>`. Y el matiz de defensa: **la herencia es la forma más fuerte de acoplamiento entre dos clases**, porque la subclase depende de la implementación de la base y no solo de su interfaz; por eso el modelo usa un único eje de herencia y resuelve todo lo demás con asociación y composición de servicios.
:::

### 8.3 Encapsulamiento como principio: el ocultamiento de información

Ya lo viste como **pilar** (mecanismo). Aquí va como **principio de diseño** (criterio de qué esconder), y conviene poder tratarlo dos veces sin repetirse. La formulación útil es la de **Parnas**: hay que ocultar tras una interfaz estable **aquellas decisiones de diseño que probablemente cambien**, de modo que su cambio no se propague. No es esconder por esconder: es elegir qué es volátil y encapsularlo, y los candidatos son siempre los mismos —la representación interna de los datos, el mecanismo de persistencia, el formato de intercambio, el algoritmo concreto de un cálculo y todo lo que provenga de una tecnología externa—. En este modelo hay tres aplicaciones limpias: el **bloque de datos sensibles** viaja cifrado dentro de `Persona` y su lectura queda condicionada a un permiso, con enmascarado por defecto en los listados; el **cálculo de la remuneración** queda tras un método abstracto, de modo que las tres fórmulas son intercambiables sin que el llamador se entere; y la **persistencia** queda tras `Repositorio<T>`, de modo que el dominio no menciona Workers KV en ninguna parte.

:::trampa Reducirlo a la visibilidad, y tratar la seguridad como una capa posterior
Un campo privado con setter público **no oculta nada**: poner guiones en el diagrama no cumple el principio. Y el error de omisión típico en este enunciado es tratar el cifrado y el control de acceso como algo que se añade después. **No se pueden añadir después**: que el documento de identidad del empleado sea un `String` plano en el diagrama es una decisión de diseño con consecuencias que ninguna capa superior arregla.
:::

:::avanzado Dos preguntas distintas, y dónde NO poner el cifrado
Encapsulamiento pregunta **"quién puede tocar esto"**; ocultamiento de información pregunta **"quién debería siquiera saber que esto existe"**. Un getter público que devuelve una lista mutable respeta la primera y viola la segunda, porque expone la representación interna y permite modificarla por la puerta de atrás; la corrección es devolver una copia o una vista de solo lectura. Y un matiz específico de este proyecto que da mucho crédito: **dónde no poner el cifrado**. Cifrar dentro de la entidad la ataría a un servicio criptográfico y a un almacén de claves, rompiendo su cohesión y haciéndola imposible de probar sin infraestructura; por eso la entidad guarda un **sobre cifrado como objeto de valor** y el cifrado vive en un servicio. Saber justificar dónde se pone una **responsabilidad transversal** es más difícil, y vale más, que decir que se encapsuló.
:::

### 8.4 Ley de Demeter

También llamada **principio de mínimo conocimiento**: un método debe hablar solo con sus amigos inmediatos. Formalmente, un método de un objeto solo debería invocar operaciones de **el propio objeto**, de los objetos **recibidos como parámetros**, de los que **él mismo crea**, de sus **atributos directos** y de los objetos de ámbito global accesibles. Lo que prohíbe es navegar por la estructura interna de otros objetos para llegar a un tercero, el llamado **tren de llamadas**: `empleado.getDepartamento().getGerente().getEmail()`. Es dañino porque quien escribe esa línea queda acoplado a **tres clases y a la forma en que están conectadas**, de modo que cualquier cambio en esa cadena lo rompe aunque no haya tocado nada suyo. La corrección es **pedir en vez de preguntar**: que el objeto haga la operación, o que exponga una consulta con nombre de negocio.

:::trampa "No más de un punto por línea"
Es una caricatura y produce dos daños: hace pensar que las **interfaces fluidas** —encadenar métodos que devuelven el mismo objeto, como en un constructor de consultas— la violan, cuando no la violan porque no se navega por estructuras ajenas; y lleva a envolver todo en delegaciones triviales, inflando las interfaces con **métodos pasamanos**, que es la crítica clásica al principio aplicado sin criterio. El otro error es aplicarla a estructuras de datos puras y objetos de transferencia, cuyo propósito explícito es exponer campos.
:::

:::avanzado La ley de Demeter como detector de responsabilidades mal ubicadas
No es una regla de estilo: **cada tren de llamadas señala una operación que debería existir y no existe**. Si un servicio de informes escribe `registro.getEmpleado().getDepartamento().getNombre()`, lo que falta es que el informe reciba los datos ya resueltos o que exista una consulta con nombre. Y un matiz que este proyecto permite defender muy bien: **como las relaciones se persisten como identificadores y no como referencias a objetos, los trenes de llamadas son estructuralmente imposibles** —no hay por dónde navegar—, de modo que la ley se cumple por construcción. La contrapartida honesta, que hay que decir: la resolución de esos identificadores queda a cargo de los servicios, que deben comprobar que apunten a entidades existentes y activas.
:::

### 8.5 Principio abierto/cerrado

**Un módulo debe estar abierto a la extensión y cerrado a la modificación**: se debe poder añadir comportamiento nuevo sin editar el código que ya funciona y está probado. El mecanismo en POO es **abstracción más polimorfismo**: se define un punto de variación —una clase base abstracta o una interfaz— y cada comportamiento nuevo entra como una implementación nueva. Este modelo tiene tres puntos de variación explícitos en la estructura —más un cuarto en la validación, que se ve en 9.2—, y **el síntoma de que el principio se está violando es siempre el mismo**: un `switch` o una cadena de `if` por tipo que hay que ampliar cada vez.

| Eje de variación | Extender significa | Sin tocar |
|---|---|---|
| Modalidad de contrato | Añadir una subclase de `Empleado` | El motor de nómina |
| Formato de exportación | Añadir un `Exportador` y registrarlo en la fábrica | Los informes |
| Tipo de informe | Añadir una subclase de `Reporte` que rellena los pasos del método plantilla | Los exportadores |

:::trampa "Nunca modificar el código", o proclamarlo sin nombrar el eje
Lo primero es imposible e indeseable: lo cerrado es el módulo **frente a un eje de variación previsto**, no el proyecto entero. Lo segundo es más frecuente en un informe de esta asignatura: afirmar que el diseño es abierto/cerrado **sin señalar cuál es el eje de variación**, con lo que la afirmación no es verificable. Si no puedes nombrar qué cambio concreto entra sin tocar nada, el principio no está aplicado.
:::

:::avanzado Las dos formulaciones, y el coste de abrir un eje
Hay dos formulaciones históricas y conviene decir cuál usas: la de **Meyer**, donde se extiende por herencia y lo cerrado es la interfaz ya publicada; y la de **Martin**, polimórfica, donde se depende de abstracciones y se extiende añadiendo implementaciones. Este modelo aplica la segunda. Y reconoce el coste: **ningún diseño puede estar abierto contra todos los ejes de cambio a la vez**, porque cada punto de variación añade una abstracción, y abrir ejes que nunca van a variar es **generalidad especulativa**; la respuesta madura es que se abrieron exactamente cuatro ejes —los tres de la tabla más el de la validación— porque los cuatro están anunciados en el enunciado como variables, y se dejaron cerrados los demás. Si sobra tiempo, menciona los otros principios SOLID que lo sostienen: **sustitución de Liskov** como condición para que el polimorfismo funcione, **segregación de interfaces** e **inversión de dependencias**, esta última visible en `Repositorio<T>`.
:::

### 8.6 Por qué composición sobre herencia

La máxima "favorecer la composición de objetos sobre la herencia de clases" no es una moda: se sigue de todo lo anterior. **Uno**, la herencia es el acoplamiento más fuerte disponible: la subclase depende de la implementación de la base y un cambio en la base puede romper subclases que nadie tocó. **Dos**, la herencia es estática: se fija al crear el objeto y no cambia mientras el objeto exista, por eso los roles y los estados no se modelan con herencia. **Tres**, la herencia solo tiene un eje: si necesitas clasificar por dos criterios a la vez —modalidad de contrato y modalidad de teletrabajo, digamos— la jerarquía explota combinatoriamente y la composición no. **Cuatro**, la composición se prueba mejor: puedes sustituir la pieza compuesta por una doble, no puedes sustituir la superclase. La consecuencia en este modelo se dice en una frase: **un solo eje de herencia —el tipo de contrato, que es una clasificación real, permanente y disjunta del dominio— y todo lo demás resuelto con asociación, con clases de asociación reificadas y con composición de servicios.**

:::trampa Repetir la máxima como eslogan
"Favorezco composición sobre herencia" sin poder señalar **una** jerarquía que descartaste por eso es una frase de manual. La versión defendible nombra el caso: *"`Gerente` no hereda de `Empleado`; el rol se compone como una asociación dirigida desde `Departamento`, porque el rol cambia y la clase no"*.
:::

:::avanzado La herencia que sí se defiende
La regla no dice "nunca heredes": dice que la herencia hay que ganársela, y se la gana cuando hay **subtipado real** —sustituibilidad de Liskov— y una **clasificación permanente y disjunta** del dominio. Ten preparada la comparación completa: la alternativa a la jerarquía de contratos era una sola clase `Empleado` con un campo `tipo` y un `switch` en `calcularSueldo`; ese `switch` reaparece en el generador de nómina, en el validador de altas y en los informes, y produce errores de cálculo **silenciosos** cada vez que alguien olvida uno de esos puntos. Decisión tomada, alternativa descartada, consecuencia observable: esa es la tríada con la que se responde toda pregunta de la defensa.
:::

---

## 9. La asignatura se llama POO **Seguro**

El enunciado dedica tres requisitos completos a la seguridad —autenticación y autorización, seguridad de datos sensibles, validación de entradas— y dos de los cinco síntomas de la empresa son de seguridad y trazabilidad. No es un anexo: **es estructura del modelo**.

### 9.1 Hash y cifrado no son lo mismo

Es la confusión más cara de esta unidad, porque el enunciado dice *"utilizando técnicas de cifrado adecuadas"* y eso invita a cifrarlo todo, incluidas las contraseñas. **Cifrar contraseñas es un error de diseño**, no una variante aceptable.

| | Hash (resumen) | Cifrado |
|---|---|---|
| ¿Se puede deshacer? | No: es de una sola dirección | Sí, con la clave |
| ¿Para qué sirve? | **Verificar** sin conocer el original | **Recuperar** el original más tarde |
| ¿Hay clave? | No; lleva **sal**, que no es secreta | Sí, y hay que custodiarla |
| Uso correcto aquí | Contraseñas, tokens de sesión, índices ciegos | Documento, teléfono, dirección, email personal |
| En este sistema | PBKDF2-SHA256 con sal por usuario | AES-GCM 256 con IV por sobre |

**La regla de decisión es una sola pregunta**: *¿el sistema necesita volver a leer este dato en claro alguna vez?* Si **no**, hash: una contraseña nunca hay que leerla, solo hay que **comparar** si la que llega produce el mismo resumen, y por eso `Usuario` guarda `hashContrasena` y `salContrasena` sin getter para ninguno de los dos. Si **sí**, cifrado: el documento de identidad hay que poder mostrarlo a quien tiene permiso, y por eso viaja en un `SobreCifrado` (`v`, `iv`, `ct`) que es un objeto de valor.

Y hay un tercer caso, el más interesante de defender: **necesito comparar, no leer, sobre un dato que sí es cifrable**. Detectar que la misma persona se cargó dos veces exige comparar documentos, pero guardarlos en claro anularía el cifrado. La solución es el **índice ciego**: un HMAC-SHA256 determinista sobre el valor normalizado —recortado y en minúsculas—, que hace colisionar `"Ana@Eco.com "` con `"ana@eco.com"`, que es justo lo que se quiere, y no revela el original. Es HMAC y no SHA-256 a secas porque un documento nacional tiene un espacio de búsqueda pequeño: sin clave, cualquiera con el volcado los recuperaría por fuerza bruta en minutos.

:::trampa "Ciframos las contraseñas" y "el hash es un cifrado seguro"
Ambas frases suspenden la pregunta. Cifrar una contraseña significa que **existe una clave que la devuelve en claro**, y quien obtenga esa clave obtiene todas las contraseñas del sistema; el hash no tiene vuelta atrás por diseño, y esa es la propiedad que se quiere. Segundo error: llamar "encriptar" a todo; en castellano técnico **cifrar** es el término correcto, y *hash* se traduce como **resumen** o se deja en inglés. Tercer error: creer que la **sal** es un secreto. No lo es, se guarda junto al hash; su función es que dos usuarios con la misma contraseña produzcan hashes distintos, de modo que un volcado no revele quién comparte clave y no sirvan las tablas precalculadas.
:::

:::avanzado Reconocer los límites del propio esquema
Una postura crítica incluye saber qué **no** hace tu diseño, y eso puntúa. **PBKDF2 no es memoria-dura**: Argon2id o scrypt resistirían mejor la fuerza bruta con GPU, pero el runtime disponible no los ofrece, así que es una restricción de plataforma declarada y no una elección. **Las 100.000 iteraciones están por debajo de la recomendación de OWASP** (210.000 para PBKDF2-HMAC-SHA256), también porque el runtime rechaza recuentos superiores; decirlo tú antes de que lo pregunten convierte una debilidad en evidencia de criterio. **El campo `v` del sobre cifrado es previsión de formato, no migración implementada**: hoy no hay ninguna rama que lo lea. Y **el índice ciego solo permite igualdad exacta**: no hay búsqueda parcial, "empieza por" ni ordenación sobre datos sensibles, y está asumido, porque descifrar N sobres en cada búsqueda no solo sería caro sino que el tiempo de respuesta variaría según cuántos se abren, **que es un canal lateral por temporización**. Esa última frase, dicha en una defensa, vale más que tres párrafos de teoría.
:::

### 9.2 Validación de entradas

El enunciado lo pide literalmente: *"Implementa una rigurosa validación de todas las entradas del usuario para prevenir ataques comunes."* Bien modelada, la validación es **polimorfismo aplicado a la seguridad**, y es el mejor ejemplo de que los requisitos no funcionales son estructurales: una clase abstracta `Regla` con un único método `aplicar(valor)` que devuelve el valor **normalizado** o lanza un fallo; subclases concretas (`ReglaTexto`, `ReglaNumero`, `ReglaFecha`, `ReglaContrasena`, `ReglaIdentificador`); y un `Esquema` que recorre una lista de reglas **sin saber cuál está aplicando**, acumula todos los fallos y los lanza juntos.

Dos propiedades que hay que saber nombrar. **Lista blanca estricta, no lista negra**: el esquema construye la salida solo con los campos declarados, de modo que un `{"rol":"ADMIN_RRHH"}` colado en un perfil produce un error de campo no reconocido y no una asignación silenciosa; eso cierra el *mass assignment* por estructura y no por parche. Y **normalizar es parte de validar**: `ReglaTexto` elimina los caracteres de control C0 y DEL de toda entrada de texto, y sin CR ni LF no se puede partir una cabecera HTTP ni fabricar un asiento falso en la traza de auditoría. Añadir una `ReglaCUIT` no obliga a tocar ni el `Esquema` ni el resto: abierto/cerrado otra vez, sobre un cuarto eje de variación.

:::trampa Poner la validación "en la interfaz de usuario"
La validación del cliente es comodidad para el usuario, **no un control de seguridad**: quien ataca no usa tu formulario. Si en el diagrama la validación aparece solo en la capa de presentación, el modelo declara una vulnerabilidad. El segundo error es modelarla como una **lista negra** de cosas prohibidas: las listas negras siempre se quedan cortas, las blancas fallan cerrado. Y el tercero, muy propio de esta unidad: dejar la validación fuera del diagrama porque "es un detalle de implementación", cuando es una jerarquía de clases con polimorfismo, es decir, **exactamente lo que la evaluación pide dibujar**.
:::

:::avanzado Dónde vive cada control, y por qué la entidad no puede confiar
Distingue **validación de entrada** —el dato tiene la forma correcta: es texto, cabe en 128 caracteres, no trae controles— de **invariante de dominio** —la regla de negocio se cumple: la dedicación acumulada no pasa del 100 por ciento, nadie aprueba sus propias horas—. La primera vive en el borde, en el `Esquema`; la segunda vive **dentro de la entidad**, y tiene que estar ahí aunque el borde ya haya validado, porque la entidad no puede asumir que todos sus llamadores pasaron por el borde. Por la misma razón las entradas de auditoría pasan por su esquema aunque las escriban otros servicios y no un usuario. Doble control, dos motivos distintos, dos ubicaciones distintas: eso no es redundancia, es defensa en profundidad, y saber nombrarla así es un punto.
:::

### 9.3 Cómo se modela todo esto en UML

La pregunta práctica es cómo se ve la seguridad en un diagrama de clases. Cinco mecanismos, todos ya vistos en este documento:

| Requisito del enunciado | Mecanismo UML | Cómo se lee en la figura |
|---|---|---|
| Datos personales seguros | Objeto de valor `SobreCifrado` como tipo del atributo | `#datosSensibles: SobreCifrado` en vez de `String` |
| Contraseñas seguras | Atributos privados **sin getter** más operación con nombre | `-hashContrasena`, `-salContrasena`, `+credencialesParaVerificar()` |
| Autorización por módulos | «enumeration» de permisos más asociación `Usuario`–`Rol` | Estereotipo y multiplicidad, no una clase editable |
| Validación de entradas | Jerarquía `Regla` abstracta más `Esquema` que la recorre | Generalización más asociación `1..*` |
| Trazabilidad de horas | Máquina de estados más `RegistroAuditoria` inmutable | «enumeration» `EstadoRegistro` y `{readOnly}` |

:::trampa El booleano donde hacía falta un estado
`aprobado: Boolean` en `RegistroTiempo` es el error más silencioso de esta evaluación: pierde **quién** aprobó, **cuándo** y **por qué se rechazó**, que es literalmente el síntoma que el enunciado denuncia —*"falta de trazabilidad en el registro de horas trabajadas"*—. Lo correcto es una enumeración con el ciclo `BORRADOR → ENVIADO → APROBADO/RECHAZADO`, más los atributos `aprobadoPor` y `fechaAprobacion`, más la invariante de que nadie aprueba sus propias horas. Un booleano no soporta ninguna de las tres cosas.
:::

:::avanzado La seguridad como estructura, y el argumento contra la IA
Aquí se cruzan el Paso 3 y la seguridad, y sale uno de los mejores hallazgos disponibles: **los modelos generados por IA tratan los requisitos no funcionales como una capa posterior**. Dibujan `Empleado` con `documento: String` y `salario: float` y dan por hecho que el cifrado y los permisos "se añaden después". No se añaden después: que el documento sea un `String` plano en el diagrama es una decisión de diseño con consecuencias que ninguna capa superior arregla, y poder decir esa frase señalando la figura generada es exactamente el criterio propio que evalúa el 1.1.3.
:::

---

## 10. Repaso rápido: el vocabulario que se penaliza

La guía exige exponer *"utilizando vocabulario técnico preciso"*, y la imprecisión es lo primero que se castiga en un oral. Esta tabla es para repasar el día antes.

| No digas | Di |
|---|---|
| "flecha" | generalización, realización, dependencia, asociación dirigida |
| "cardinalidad" | multiplicidad (cardinalidad es de los diagramas E-R) |
| "relación" a secas | agregación, composición, asociación, con su nombre |
| "tabla intermedia" | clase de asociación, o entidad reificada |
| "el sistema hace…" | la clase concreta que lo hace |
| "encriptar" | cifrar (y *hash* es resumen, no cifrado) |
| "clase padre / clase hija" | superclase y subclase, o clase general y especializada |
| "atributo privado con get y set" | operación de negocio; ese patrón es un modelo anémico |
| "método sobrecargado polimórfico" | sobrescritura (la sobrecarga no es polimorfismo dinámico) |
| "le puse un ID" | identidad propia; el UUID resuelve el síntoma de duplicidad |

:::clave Las diez frases que tienes que poder decir sin leer
1. Abstracción **selecciona y nombra**; encapsulamiento **oculta y protege invariantes**.
2. La herencia exige un "es un tipo de" **permanente** y **sustituibilidad**.
3. El polimorfismo se demuestra señalando **dónde desapareció un condicional por tipo**.
4. Una entidad tiene **identidad y ciclo de vida**; un objeto de valor, ninguna de las dos.
5. El rombo va **en el extremo del todo**, y se elige por **ciclo de vida**, no por intensidad.
6. La multiplicidad se lee **tomando un objeto del otro extremo**.
7. Un muchos-a-muchos con datos propios es una **clase de asociación**; si el par se repite, se **reifica**.
8. Responsabilidad única se demuestra con **escenarios de cambio**, no con adjetivos.
9. Abierto/cerrado exige **nombrar el eje de variación**.
10. Cifrado es reversible y el hash no: la pregunta es **si el sistema necesita leer ese dato otra vez**.
:::

---

## 11. Hacia dónde sigue

Este documento es la teoría; la aplicación está repartida así:

- Qué exige cada criterio, indicador por indicador: [Qué pide la evaluación](01-que-pide-la-evaluacion.html).
- Las tensiones de la guía —Python, base de datos, rúbrica ausente, entrega de un solo archivo—: [Ambigüedades y riesgos](02-ambiguedades-y-riesgos.html).
- Cómo se aplican los pilares al análisis conceptual: [Paso 1](03-paso-1-analisis-poo.html).
- Cómo se dibuja el diagrama con esta notación: [Paso 2](04-paso-2-modelo-uml.html).
- Cómo se documentan los prompts y se clasifican los hallazgos: [Paso 3](05-paso-3-evaluacion-critica-ia.html).
- Los tres principios, la matriz de trazabilidad y la viabilidad en Python: [Paso 4](06-paso-4-validacion-final.html).
- Cómo se monta el archivo único que se sube al AAI: [El informe técnico](07-el-informe-tecnico.html).
- Las preguntas previsibles y cómo se responden: [La defensa oral](08-defensa-oral.html).

:::nota Una última cosa sobre este documento
Si al leer una sección piensas "esto ya lo sabía", pruébate: cierra el archivo y explícalo en voz alta con el ejemplo de EcoTech, no con el ejemplo del manual. La distancia entre reconocer una definición y poder sostenerla con un caso propio es exactamente la distancia que mide la defensa oral.
:::
