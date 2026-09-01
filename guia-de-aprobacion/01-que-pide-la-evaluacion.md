# Qué pide la evaluación, exactamente

La ES1 es la primera evaluación sumativa de TI3021, vale **15% de la nota final**
de la asignatura y se desarrolla a lo largo de **4 semanas**. Aunque el proyecto
del semestre es grupal (2 a 3 estudiantes), esta evaluación es **individual**:
cada persona entrega su propio diagrama de clases UML y su propio análisis
crítico. No hay entrega compartida, no hay "el diagrama del grupo". A partir de
la Unidad 2 el trabajo vuelve a ser grupal, pero esta no.

El entregable tiene dos mitades, y las dos se califican. La primera es un
**informe técnico** (un archivo Word o PDF, subido al AAI) que documenta el
análisis conceptual, el diagrama de clases UML, el uso documentado de una
herramienta de IA y la justificación de las decisiones de diseño. La segunda es
una **defensa oral** frente al docente. La guía no le dedica una sección propia a
la defensa: la reparte como la última viñeta de cada uno de los cuatro pasos, que
es exactamente por qué tanta gente no la ve venir.

> Esta evaluación corresponde a la ES1 (15%), que consiste en un Informe técnico
> del diseño y desarrollo de una solución de software en Python representada
> mediante un diagrama de clases UML, acompañado de un análisis crítico del
> proceso de modelado, incluyendo el uso de herramientas de IA, que deberán
> presentar de forma oral al docente.

:::clave Lo que se evalúa, en una frase
Un informe técnico individual, con un diagrama de clases UML propio, que
demuestre que entendiste los fundamentos de la POO, que usaste IA y la
corregiste, y que puedes defender cada decisión en voz alta.
:::

Este documento es tu checklist maestro. Ábrelo el día antes de entregar y
verifica cada línea. No te dice qué escribir: te dice qué se cuenta al corregir.

---

## El mapa: cuatro pasos, un informe, una defensa

![Los cuatro pasos de la evaluación y la sección del informe donde aterriza cada uno](diagramas/mapa-evaluacion.svg)

La guía organiza el trabajo en cuatro pasos. Cada paso está amarrado a un
criterio de evaluación (1.1.1 a 1.1.4), produce evidencia escrita que aterriza en
una sección concreta del informe, y termina con una acción oral que se rinde en
la defensa. Léelo así:

- **Paso 1 (1.1.1)** produce el análisis conceptual: entidades, atributos, responsabilidades y su vínculo con los fundamentos POO. Aterriza en la sección *Análisis del problema* del Desarrollo.
- **Paso 2 (1.1.2)** produce tu primer modelo estructural en notación UML: clases, atributos, métodos, relaciones con tipo y multiplicidad. Aterriza en *Diseño del sistema*.
- **Paso 3 (1.1.3)** produce la evidencia de IA: dos iteraciones, dos prompts, los resultados y la evaluación crítica. Aterriza en *Uso de herramientas de IA* y en *Mejoras aplicadas*.
- **Paso 4 (1.1.4)** produce el diagrama definitivo, los principios de diseño aplicados y la matriz de trazabilidad. Aterriza en *Diseño del sistema* (el diagrama definitivo) y en *Mejoras aplicadas* (los principios y la matriz de trazabilidad).

El orden importa por una razón que no es burocrática: el Paso 3 te pide
**contrastar** la propuesta de la IA con tu análisis propio. Si generas el modelo
con IA antes de hacer el Paso 1, no tienes con qué contrastar y el Paso 3 se
queda sin contenido. La secuencia es parte de lo que se evalúa.

:::trampa El error de secuencia más caro
Empezar pidiéndole el diagrama a una IA y después inventar el "análisis propio"
hacia atrás. Se nota: el análisis conceptual queda idéntico al modelo de la IA y
la tabla de hallazgos críticos se vuelve cosmética ("le faltaba un atributo").
La guía es explícita al respecto: *"La entrega de resultados generados
exclusivamente por IA, sin análisis ni ajustes, será considerada insuficiente."*
:::

---

## Los cuatro criterios de evaluación

Los criterios son el enunciado oficial de lo que se mide. Están redactados en la
cabecera de la guía y cada paso desarrolla uno.

### 1.1.1 — Análisis conceptual

> Analiza los fundamentos de la programación orientada a objetos en contextos de
> análisis conceptual.

Se evalúa que sepas mirar un dominio en prosa (el caso de EcoTech) y sacar de ahí
entidades, atributos, comportamientos y responsabilidades, conectándolos con
abstracción, encapsulamiento, herencia y polimorfismo. Todavía no hay diagrama:
hay razonamiento. Lo que se busca es que expliques **por qué** algo es una
entidad y no un atributo, y **qué** pilar de la POO responde a cada dolor del
caso.

### 1.1.2 — Modelo estructural UML

> Elabora un diagrama de clases a la problemática planteada, considerando la
> notación UML y las relaciones estructurales entre clases.

Aquí se mide notación: los tres compartimentos de la clase, la visibilidad, los
tipos, las flechas correctas y las multiplicidades escritas. Un diagrama bonito
con la flecha equivocada puntúa peor que uno feo con la flecha correcta. Si tienes
dudas sobre qué relación usar, revisa [el Paso 2](04-paso-2-modelo-uml.html).

### 1.1.3 — Ajuste crítico de lo generado por IA

> Aplica criterios técnicos de modelado orientado a objetos al ajustar diagramas
> de clases generados por herramientas de IA.

El verbo es **ajustar**. No se evalúa que uses IA (eso se da por hecho y se
espera), sino que detectes lo que hizo mal y lo corrijas con un criterio técnico
que puedas nombrar. Sin prompts documentados, este criterio no tiene evidencia
que corregir.

### 1.1.4 — Diseño final fundamentado

> Diseña un diagrama de clases UML, considerando los fundamentos de programación
> y el análisis crítico de recomendaciones generadas por herramientas de IA.

Es la síntesis: un diagrama final que se pueda comparar con el inicial y en el
que se vea el delta; principios de diseño aplicados y nombrados; y una matriz que
demuestre que el modelo responde a los requerimientos del enunciado, no a tu
gusto.

---

## La tabla de mínimos numéricos

Esta es la pieza más valiosa del documento. La guía usa la fórmula "al menos N"
diez veces. Esos son los números que alguien cuenta con el dedo al corregir. Si
un número no se cumple, no hay argumento que lo compense.

| Requisito | Mínimo que exige la guía | Dónde se evidencia | Cita textual |
|---|:--:|---|---|
| Entidades del dominio identificadas | **4** | 3.1 Análisis del problema, listado o tabla de entidades principales | *"Identifica al menos 4 entidades relevantes del dominio (empleados, departamentos, proyectos, etc.), clasificándolas como entidades principales de la problemática."* |
| Elementos del problema descritos con atributos, objetos y responsabilidad | **4** (cada uno con atributos + posibles objetos + al menos 1 responsabilidad) | 3.1 Análisis del problema, tabla de 4 columnas | *"Describe al menos 4 elementos del problema, indicando para cada una sus atributos, posibles objetos y al menos 1 responsabilidad asociada al caso."* |
| Conceptos del problema vinculados a fundamentos POO | **3** | 3.1 Análisis del problema, tabla concepto → pilar POO → justificación | *"Relaciona al menos 3 conceptos del problema con fundamentos de POO (encapsulamiento, abstracción, herencia, entre otros)."* |
| Clases principales definidas | **3** | 3.2 Diseño del sistema y diagrama UML | *"Identificar y definir al menos 3 clases principales del sistema."* |
| Atributos y métodos por clase | **todas** las clases del modelo | Diagrama UML + catálogo de clases | *"Establecer atributos y métodos relevantes para cada clase."* |
| Relaciones entre clases con tipo y multiplicidad | **3** relaciones, del repertorio de **4** tipos listados | Diagrama UML + tabla de relaciones | *"Determinar al menos 3 relaciones entre las clases del sistema, especificando su tipo y multiplicidad: Asociación. Dependencia. Agregación y/o composición. Generalización (herencia)."* |
| Iteraciones de propuesta generada con IA | **2** (cada una con al menos 3 clases, atributos, métodos y relaciones) | 3.3 Uso de herramientas de IA | *"Presenta al menos 2 iteraciones de una propuesta inicial de modelo de clases (con al menos 3 clases, atributos, métodos y relaciones) utilizando una herramienta de IA."* |
| Prompts documentados textualmente | **2** (con contexto del problema e instrucciones de formato) + su resultado | 3.3 Uso de herramientas de IA, transcritos literales; los completos pueden ir en anexo | *"Documenta al menos 2 prompts utilizados (incluyendo el contexto del problema y las instrucciones de formato) y el resultado obtenido para cada iteración."* |
| Hallazgos del análisis crítico del modelo de IA | **4**, clasificados en clases / atributos / relaciones | 3.3 Uso de herramientas de IA, tabla de hallazgos contrastada con el Paso 1 | *"Analiza el modelo generado por IA, identificando al menos 4 elementos (errores, similitudes o diferencias), clasificándolos según el aspecto del modelo (clases, atributos o relaciones)."* |
| Principios de diseño OO aplicados | **3**, en la **mayoría** de las clases | 3.4 Mejoras aplicadas, tabla principio → clase → evidencia | *"Aplicar al menos 3 principios de diseño orientado a objetos (por ejemplo: cohesión, responsabilidad única, encapsulamiento, claridad) en la mayoría de las clases del modelo."* |
| Requerimientos trazados a clases (matriz de trazabilidad) | **3** | 3.4 Mejoras aplicadas, matriz de trazabilidad | *"Validar la coherencia del modelo con los requerimientos del sistema, elaborando una matriz de trazabilidad que relacione al menos 3 requerimientos del sistema con las clases correspondientes."* |

:::aviso "Al menos" no es "exactamente"
Los mínimos son piso, no techo, y un piso bajo. Tres relaciones es el mínimo,
pero el enunciado obliga a modelar empleados, departamentos, proyectos y
registros de tiempo: con esas cuatro clases ya te salen más de tres relaciones
naturales. Cumplir el mínimo justo suele ser señal de que no leíste el
enunciado completo. Al mismo tiempo, no infles: cada elemento que agregues
tienes que poder defenderlo oralmente.
:::

### Los mínimos que no vienen numerados pero se cuentan igual

Hay exigencias sin la fórmula "al menos N" que son igual de contables. Estas se
esconden en las *Consideraciones Técnicas*, en la sección del informe y en la
plantilla.

| Requisito | Mínimo real | Dónde se evidencia | Cita textual |
|---|:--:|---|---|
| Clases obligatorias del enunciado | **4**: empleados, departamentos, proyectos, registros de tiempo | Diagrama UML | *"Implementa clases para representar empleados, departamentos, proyectos y registros de tiempo."* |
| Herencia y polimorfismo visibles | **1** jerarquía + **1** método polimórfico, en el diagrama | Diagrama UML + justificación | *"Utiliza herencia y polimorfismo de manera efectiva para evitar duplicación de código."* |
| Modelos presentados en el informe | **2**: el inicial y el final | 3.2 Diseño del sistema, lado a lado o en secuencia | *"Presentación del modelo inicial y del modelo final."* |
| Dolores del caso abordados | **5** (duplicidad, errores de asignación, trazabilidad de horas, reportes confiables, seguridad de datos) | Introducción y Análisis del problema | *"Duplicidad de información de empleados. Errores en la asignación de personal a proyectos. Falta de trazabilidad en el registro de horas trabajadas. Problemas en la generación de reportes confiables. Riesgos en la seguridad de los datos personales."* |
| Elementos visuales | **3** tipos: diagramas, tablas y esquemas | Todo el Desarrollo | *"Incorporar elementos visuales relevantes (diagramas, tablas, esquemas)."* |
| Organización del documento | **4**: portada, índice, numeración, referencias | Documento completo | *"Asegurar una correcta organización del documento (portada, índice, numeración, referencias si aplica)."* |
| Apartados numerados de la plantilla | **5**: I. Introducción, II. Objetivo, III. Desarrollo, IV. Conclusiones, V. Referencias bibliográficas | Índice y cuerpo del informe | La plantilla numera cinco apartados; el **II. Objetivo** no lo lista la guía pero sí la plantilla, y suprimirlo se lee como plantilla mal usada |
| Referencias en APA 6 | **2** de la bibliografía de la asignatura + la herramienta de IA usada | Sección V | Sánchez Palacio (2025) y Jiménez de Parga (2021), listados en la guía |
| Etapas del proceso evidenciadas | **7** (entendimiento, análisis POO, modelado, propuesta con IA, evaluación crítica, refinamiento, validación) | Estructura del Desarrollo | *"Las etapas para desarrollar son: ..."* |

:::aviso Tres mínimos que tu repositorio NO cubre
Si ya tienes el sistema EcoTech implementado y documentado, tienes cubierto el
análisis, el modelo y buena parte de la crítica al modelado. Pero hay tres
mínimos que **no existen** en ese material y que tienes que producir a mano:

1. **Los 2 prompts documentados.** No hay ni uno registrado. Tienes que hacer las dos iteraciones de verdad, con una herramienta real, y pegar el texto literal del prompt y del resultado.
2. **La matriz de trazabilidad.** No existe como tal. Hay que construirla: requerimiento del enunciado → clase(s) → método(s) que lo satisfacen.
3. **Los 3 principios de diseño nombrados.** El diseño los aplica, pero en ninguna parte dice "cohesión", "responsabilidad única" o "encapsulamiento" ligado a una clase concreta. Nombrar el principio y señalar dónde vive es justamente lo que se evalúa.

Los tres son trabajo real, no copia. Y los tres son los que más caen en la
defensa oral.
:::

---

## Qué se evalúa por escrito y qué se evalúa oralmente

La guía no tiene un apartado "defensa oral". Mete una acción oral como **última
viñeta de cada paso**, con verbos distintos a los del resto ("Expone oralmente",
"Explica de manera lógica y fluida", "Expone mediante argumentos técnicos",
"Concluye la presentación defendiendo"). Son cuatro bloques de defensa, uno por
criterio, y cada uno se puede preguntar por separado.

| Paso | Se entrega por escrito | Se rinde oralmente | Cita textual de la acción oral |
|:--:|---|---|---|
| 1 | Entidades, tabla de elementos, vínculo con pilares POO, explicación del enfoque OO | Justificar **cómo elegiste** las entidades y cómo abstracción y encapsulamiento responden al caso | *"Expone oralmente, utilizando vocabulario técnico preciso, el análisis conceptual del problema, justificando de forma clara cómo se seleccionaron las entidades principales..."* |
| 2 | Clases con atributos y métodos, relaciones con tipo y multiplicidad, diagrama UML | Explicar la **arquitectura** del diagrama y el propósito de cada relación estructural | *"Explica de manera lógica y fluida la arquitectura del diagrama de clases UML proyectado, sustentando verbalmente la elección y el propósito de las relaciones estructurales..."* |
| 3 | 2 iteraciones, 2 prompts, resultados, 4 hallazgos clasificados, diagrama ajustado | Argumentar **qué le cambiaste a la IA y por qué**, con criterio propio | *"Expone mediante argumentos técnicos las modificaciones, correcciones y adaptaciones aplicadas sobre el modelo inicial sugerido por la Inteligencia Artificial, demostrando criterio propio..."* |
| 4 | Diagrama final, 3 principios, matriz de trazabilidad, fundamentación técnica | Defender la **viabilidad técnica del diseño en Python** y tu postura crítica sobre la IA, respondiendo preguntas | *"Concluye la presentación defendiendo la viabilidad técnica del diseño definitivo en Python, respondiendo con seguridad y fundamentos sólidos a las preguntas del docente o comisión..."* |

:::clave La defensa oral es el control de autoría
Todo lo escrito lo puede producir una IA en veinte minutos. La conversación con
el docente, no. Por eso este material te enseña a hacer el trabajo, no te lo
hace: cuando veas una respuesta modelo, es un ejemplo del que aprender la forma
y el nivel, y tienes que rehacerlo con tu propio análisis. Si entregas algo que
no puedes explicar, la defensa lo expone en la primera pregunta.
:::

Asistir a la defensa no es opcional, y la guía lo dice sin rodeos:

> Aquellos que no asistan a las fechas de evaluación recibirán una calificación
> mínima, a menos que justifiquen su ausencia de acuerdo con los protocolos
> establecidos en el Reglamento Académico.

:::aviso Dos condiciones, no una
El informe subido **y** la defensa rendida. Si faltas a la fecha, avisa al
docente por correo antes, no después, y con la justificación que exige el
Reglamento Académico.
:::

---

## Los requisitos del sistema del enunciado

Estos son los requisitos que la empresa EcoTech Solutions pone sobre la mesa. Los
necesitas por dos razones: son la fuente de las entidades del Paso 1 y son la
columna izquierda de la matriz de trazabilidad del Paso 4. La guía enumera **diez
requisitos del sistema** y, aparte, **cinco consideraciones técnicas**. En total,
quince anclajes contra los cuales validar tu modelo, cuando el mínimo exigido por
la matriz es tres.

| ID | Requisito del sistema | Qué obliga a que exista en el modelo |
|:--:|---|---|
| R1 | Registro de Empleados | Nombre, dirección, teléfono, correo, fecha de inicio de contrato y salario, más un ID único **asignado automáticamente** (no lo escribe el usuario) |
| R2 | Gestión de Departamentos | Crear, editar, buscar y eliminar departamentos; cada uno con nombre y un gerente asociado |
| R3 | Asignación de Empleados a Departamentos | Asignar y reasignar, con la restricción de **un solo departamento a la vez** por empleado: es una multiplicidad, no una frase |
| R4 | Registro de Tiempo | Fecha, cantidad de horas y descripción de tareas; cada registro amarrado a **un empleado y un proyecto** |
| R5 | Gestión de Proyectos | Crear, editar y eliminar proyectos; nombre, descripción y fecha de inicio |
| R6 | Asignación de Empleados a Proyectos | Asignar y desasignar; un empleado puede estar en **uno o varios** proyectos: relación muchos a muchos |
| R7 | Generación de Informes | Informes de empleados, proyectos, departamentos y registros de tiempo, exportables en distintos formatos (PDF o Excel) |
| R8 | Autenticación y Autorización Seguras | Contraseñas seguras y acceso limitado a los módulos autorizados: separa identidad de persona |
| R9 | Seguridad de Datos Sensibles | Almacenamiento cifrado de datos personales y cumplimiento de privacidad |
| R10 | Validación de Entradas Seguras | Validación rigurosa de todas las entradas del usuario |

| ID | Consideración técnica | Qué obliga |
|:--:|---|---|
| CT1 | Paradigma POO | Diseñar y desarrollar el sistema con orientación a objetos |
| CT2 | Clases obligatorias | Empleados, departamentos, proyectos y registros de tiempo |
| CT3 | Herencia y polimorfismo | Usados **de manera efectiva para evitar duplicación de código**, visibles en el diagrama |
| CT4 | Base de datos | *"Utiliza una base de datos para almacenar la información del sistema."* Se representa en el modelo, por ejemplo como capa de persistencia o repositorio |
| CT5 | Interfaz de usuario | Una interfaz para interactuar de manera intuitiva; represéntala o justifica por qué la separas del dominio |

:::trampa Los requisitos R8, R9 y R10 son los olvidados
Casi todos modelan empleados, departamentos, proyectos y horas, y ahí paran.
Autenticación, cifrado y validación quedan fuera del diagrama y aparecen como
un párrafo suelto. La asignatura se llama Programación Orientada a Objeto
**Seguro**: esos tres requisitos son el motivo del apellido. Modelarlos —
aunque sea con una clase de usuario separada del empleado y una jerarquía de
reglas de validación — te distingue de inmediato.
:::

:::avanzado Traza más de tres
La matriz pide tres requerimientos. Trazar los diez (o los quince, sumando las
consideraciones técnicas) convierte la matriz en una herramienta de
autoevaluación: cualquier fila sin clase asignada es un hueco de tu modelo que
descubriste tú antes que el docente. Es también la mejor defensa oral posible
frente a la pregunta "¿y dónde queda el requisito de exportar informes?".
:::

---

## La forma del entregable

Esta parte no da puntos por sí sola, pero puede costarte la evaluación completa.

> En la plataforma AAI se habilitará la tarea para que carguen la documentación
> en la fecha correspondiente hasta las 23:00hrs. del día agendado. Una vez
> finalizado el plazo, se bloqueará el acceso a subir la tarea.

> NO SE RECIBIRÁN ENTREGAS POR CORREO.

:::aviso Un archivo, subido al AAI, antes de las 23:00
Un enlace a GitHub **no es evidencia entregada**. Si tu trabajo vive en un
repositorio, lo que se corrige es lo que quedó dentro del Word o del PDF: los
diagramas exportados como imagen, las tablas escritas en el documento, los
prompts transcritos. Todo lo que quede fuera del archivo, para efectos de la
corrección, no existe.
:::

Reglas de formato que exige la plantilla, y que se revisan de una mirada:

- Formato de archivo: documento de Word o PDF.
- Papel tamaño carta, márgenes de 2,5 cm en los cuatro lados.
- Párrafos justificados, interlineado sencillo.
- Fuente Arial o Calibri: títulos 14 en negrita, subtítulos 12 en negrita, texto 11 normal.
- Portada con asignatura, sección, docente, tu nombre completo, integrantes del grupo (indicando que la Unidad 1 es individual), fecha de entrega, nombre del trabajo y nombre de la unidad.
- Pie de página con el Área Académica (Tecnologías de Información y Ciberseguridad) y la carrera (Analista Programador).
- Índice actualizado, en página independiente de la Introducción.
- Referencias en APA 6, con interlineado doble y sangría francesa.
- **Eliminar todas las instrucciones y ejemplos de la plantilla** antes de entregar. Si queda el texto "Una vez finalizado el informe, elimina las instrucciones", ya partiste mal.

Un nombre de archivo que no dependa de la suerte:

```text
TI3021_ES1_ApellidoNombre_Seccion.pdf
```

:::nota Sobre la Rúbrica N°1
La guía menciona un instrumento de evaluación, la Rúbrica N°1, y te pide
revisarlo en el AAI. Si no está publicada, lo único que puedes usar como rúbrica
son las viñetas de **"Acciones para desarrollar"** de cada paso: son las que
contienen todos los mínimos numéricos de este documento. Búscala igual en el AAI
antes de entregar; si aparece, manda cualquier discrepancia entre la rúbrica y
esta guía al docente por correo, y hazlo con días de anticipación.
:::

---

## Checklist final de entrega

Imprímelo o cópialo. Marca la última columna sólo cuando puedas señalar la página
del informe donde está la evidencia.

| # | Verificación | Prueba concreta | Listo |
|:--:|---|---|:--:|
| 1 | 4 entidades del dominio identificadas y clasificadas como principales | Listado o tabla en Análisis del problema | |
| 2 | 4 elementos descritos con atributos, posibles objetos y ≥1 responsabilidad | Tabla de 4 columnas, 4 filas mínimo | |
| 3 | 3 conceptos del problema vinculados a fundamentos POO | Tabla concepto → pilar → justificación | |
| 4 | Explicación de cómo el enfoque OO estructura la solución | Párrafos de cierre del Paso 1 | |
| 5 | 3 clases principales definidas, con atributos y métodos | Catálogo de clases + diagrama | |
| 6 | Las 4 clases obligatorias del enunciado están en el modelo | Empleado, Departamento, Proyecto, RegistroTiempo (o tus nombres) | |
| 7 | 3 relaciones con **tipo y multiplicidad escritos** en el diagrama | Etiquetas visibles: `1`, `0..1`, `1..*`, `*` | |
| 8 | Herencia y polimorfismo visibles en el diagrama, no sólo mencionados | Triángulo de generalización + método redefinido | |
| 9 | Diagrama UML legible, exportado como imagen dentro del documento | Se lee sin hacer zoom al 400% | |
| 10 | 2 iteraciones de propuesta generada con IA, cada una con ≥3 clases | Dos versiones distintas, no la misma con maquillaje | |
| 11 | 2 prompts transcritos literalmente, con contexto e instrucciones de formato | Texto copiable, herramienta y fecha indicadas | |
| 12 | Resultado obtenido de cada prompt, presentado en el informe | Diagrama o texto devuelto por la IA | |
| 13 | 4 hallazgos críticos clasificados en clases / atributos / relaciones | Tabla con columna de aspecto | |
| 14 | Cada hallazgo contrastado con tu análisis del Paso 1 | La tabla cita tu propia entidad o relación | |
| 15 | Modelo inicial **y** modelo final, ambos presentes en el informe | Dos imágenes, con el delta explicado | |
| 16 | 3 principios de diseño nombrados y localizados en clases concretas | Tabla principio → clase → evidencia | |
| 17 | Los principios se aplican en la **mayoría** de las clases | Cuenta: más de la mitad del modelo | |
| 18 | Matriz de trazabilidad con ≥3 requerimientos ligados a clases | Tabla requerimiento → clase → método | |
| 19 | Fundamentación técnica de las decisiones de diseño | Por qué agregación y no composición, etc. | |
| 20 | Conclusiones con reflexión de aprendizaje **e** importancia del enfoque POO | Los dos puntos que pide la guía, explícitos | |
| 21 | Introducción con contextualización del problema y objetivos | Una página, redactada al final | |
| 22 | Apartado **II. Objetivo** redactado (objetivo general + específicos) | 1 objetivo general + 4 específicos, uno por criterio 1.1.1 a 1.1.4 | |
| 23 | Portada completa y pie de página con área y carrera | 8 campos de la plantilla | |
| 24 | Índice actualizado, en página propia | Numeración de páginas correcta | |
| 25 | Referencias en APA 6 con las 2 fuentes de la asignatura + la IA usada | Sangría francesa, interlineado doble | |
| 26 | Instrucciones y ejemplos de la plantilla eliminados | Búsqueda de "elimina este texto" sin resultados | |
| 27 | Formato: carta, márgenes 2,5, justificado, Arial/Calibri, tamaños | Revisión visual de 30 segundos | |
| 28 | Archivo Word o PDF subido al AAI antes de las 23:00 del día agendado | Confirmación de carga en la plataforma | |
| 29 | Defensa oral preparada: los 4 bloques, uno por paso | Puedes explicar cada decisión sin leer | |

:::clave La prueba de la página
Para cada fila marcada tienes que poder decir el número de página. Si respondes
"está en alguna parte", no está. La corrección se hace con el documento abierto,
no con tu memoria del trabajo.
:::

---

## Antes de seguir

Este checklist asume que la guía es coherente consigo misma. No del todo lo es:
pide una solución "en Python", habla de "una base de datos", exige modelar en una
unidad donde algunos ya implementaron, y menciona una rúbrica que puede no estar
adjunta. Cada una de esas tensiones tiene una respuesta defendible y una manera
de hundirte.

Antes de escribir una línea del informe, revisa
[las ambigüedades y los riesgos](02-ambiguedades-y-riesgos.html) de esta guía:
ahí está qué hacer con cada una de ellas, y por qué la respuesta importa más en
la defensa oral que en el papel.
