# Cómo armar el informe técnico

Los cuatro pasos producen material: entidades, tablas, diagramas, prompts, hallazgos, principios, una matriz. El informe es el único sitio donde ese material se convierte en nota. Lo que no esté dentro del archivo que subes al AAI, para efectos de la corrección, no existe.

Este documento no te dice qué escribir —eso está en [Paso 1](03-paso-1-analisis-poo.html) a [Paso 4](06-paso-4-validacion-final.html)—, sino **dónde va cada cosa, con qué rótulo, con qué formato y en qué orden**. Es trabajo de montaje, y es el más barato de toda la evaluación: no exige entender nada nuevo, exige no perder por descuido puntos que ya te ganaste.

:::clave Lo que se evalúa aquí
La guía cobra tres cosas sobre el documento en sí, con independencia de su contenido técnico:

> - Utilizar un lenguaje técnico claro, preciso y coherente.
> - Incorporar elementos visuales relevantes (diagramas, tablas, esquemas).
> - Asegurar una correcta organización del documento (portada, índice, numeración, referencias si aplica).

Y una cuarta, implícita pero decisiva: que el evaluador **encuentre** cada criterio. Un informe con todo adentro pero mal rotulado se corrige como un informe incompleto.
:::

---

## El problema de las dos estructuras

Tienes dos documentos oficiales que describen la forma del informe, y describen cosas distintas.

La **plantilla** fija un índice cerrado de cinco apartados con numeración romana:

> I. Introducción / II. Objetivo / III. Desarrollo / IV. Conclusiones / V. Referencias bibliográficas

La **guía** enumera seis bloques de contenido, y ninguno se llama "Desarrollo":

> Redactar un informe técnico que incluya:
> - Introducción: Contextualización del problema abordado y objetivos del proyecto.
> - Análisis del problema: Síntesis del levantamiento conceptual realizado en el Paso 1.
> - Diseño del sistema: Presentación del modelo inicial y del modelo final. Explicación del diagrama de clases UML definitivo.
> - Uso de herramientas de IA: Presentación de prompts utilizados. Resultados obtenidos. Evaluación crítica de los aportes de la IA.
> - Mejoras aplicadas: Justificación de cambios realizados al modelo. Aplicación de principios de diseño orientado a objetos.
> - Conclusiones: Reflexión sobre el proceso de aprendizaje. Importancia del enfoque POO en la solución del problema.

Ningún documento dice cuál manda. Y no hace falta elegir.

![La estructura del informe: los seis bloques que pide la guía dentro de los cinco apartados de la plantilla](diagramas/estructura-informe.svg)

De los seis bloques de la guía, dos ya tienen apartado propio en la plantilla —Introducción y Conclusiones coinciden nombre por nombre—. Los **cuatro restantes se convierten en subtítulos dentro de "III. Desarrollo"**, con el nombre literal que les da la guía. La plantilla no se opone: es una plantilla institucional genérica y ella misma avisa de que *"cada docente DEBE modificar, ajustar o completar los apartados del informe según las características o tipo de informe"*.

| Bloque que pide la guía | Dónde aterriza en la plantilla | De qué paso sale |
|---|---|:--:|
| Introducción | I. Introducción | Contexto del enunciado |
| — | II. Objetivo (solo la plantilla lo pide) | Aprendizaje esperado |
| Análisis del problema | 3.1, dentro de III. Desarrollo | Paso 1 |
| Diseño del sistema | 3.2, dentro de III. Desarrollo | Pasos 2 y 4 |
| Uso de herramientas de IA | 3.3, dentro de III. Desarrollo | Paso 3 |
| Mejoras aplicadas | 3.4, dentro de III. Desarrollo | Pasos 3 y 4 |
| Conclusiones | IV. Conclusiones | Cierre |
| — | V. Referencias bibliográficas | APA 6 |

:::clave Por qué los nombres literales importan tanto
Quien corrige lo hace con la rúbrica al lado y el índice abierto. Si busca "Uso de herramientas de IA" y en el índice solo encuentra "Desarrollo", tiene que leer catorce páginas para decidir si el criterio está cubierto. A veces las lee. A veces marca "no evidenciado".

Rotula los cuatro subtítulos con las palabras exactas de la guía y configura la tabla de contenidos a **tres niveles**, para que 3.1 a 3.4 aparezcan en el índice. Son diez minutos de trabajo que convierten tu índice en un mapa de la rúbrica.
:::

:::aviso Plan B si el docente exige los seis bloques como apartados de nivel 1
Promueves 3.1 a 3.4 a apartados romanos, absorbes "Objetivo" dentro de la Introducción —que es donde la guía lo pone— y regeneras el índice. Para que eso cueste minutos y no horas, escribe el informe con **estilos nativos de Word** (Título 1, Título 2, Título 3), nunca con negritas y tamaños aplicados a mano. Promover un nivel es entonces un cambio de estilo, no una reescritura.
:::

---

## El esqueleto completo

Este es el árbol del documento, con la numeración de la plantilla y los subtítulos de la guía. Cópialo como estructura de encabezados antes de escribir una sola línea de contenido: es mucho más rápido llenar cajas que reordenar párrafos.

```text
PORTADA
ÍNDICE (Contenido)

I.   INTRODUCCIÓN

II.  OBJETIVO
     2.1  Objetivo general
     2.2  Objetivos específicos

III. DESARROLLO
     3.1  Análisis del problema
          3.1.1  Entidades relevantes del dominio
          3.1.2  Atributos, objetos y responsabilidades
          3.1.3  Conceptos del problema y fundamentos de la POO
          3.1.4  Cómo el enfoque orientado a objetos estructura la solución
     3.2  Diseño del sistema
          3.2.1  Catálogo de clases: atributos y métodos
          3.2.2  Relaciones estructurales y multiplicidades
          3.2.3  Modelo inicial y modelo final
          3.2.4  Explicación del diagrama de clases UML definitivo
     3.3  Uso de herramientas de IA
          3.3.1  Herramienta, versión y contexto de uso
          3.3.2  Iteración 1: prompt y resultado obtenido
          3.3.3  Iteración 2: prompt y resultado obtenido
          3.3.4  Evaluación crítica de los aportes de la IA
     3.4  Mejoras aplicadas
          3.4.1  Justificación de los cambios realizados al modelo
          3.4.2  Aplicación de principios de diseño orientado a objetos
          3.4.3  Validación: matriz de trazabilidad
          3.4.4  Viabilidad técnica de la implementación en Python

IV.  CONCLUSIONES

V.   REFERENCIAS BIBLIOGRÁFICAS

ANEXOS
     Anexo A.  Transcripción íntegra de prompts y respuestas
     Anexo B.  Catálogo extendido de hallazgos sobre los modelos de IA
     Anexo C.  Matriz de trazabilidad completa
     Anexo D.  Validación adicional: prototipo funcional (opcional)
```

:::ambiguedad Nadie fija la extensión
Ni la guía ni la plantilla dicen cuántas páginas debe tener el informe. Lo único acotado es la Introducción: *"mediante una página"*. Todas las extensiones que siguen son **orientativas**, calculadas para que cada mínimo exigido quepa con holgura sin inflar el documento. El cuerpo queda entre 18 y 24 páginas, más anexos. Si tu docente da un rango distinto, manda su rango.
:::

### Portada — 1 página

Ocho campos, todos de la plantilla. La única decisión real es la quinta fila.

| Campo | Qué escribir |
|---|---|
| Asignatura | Programación Orientada a Objeto Seguro (TI3021) |
| Sección | La tuya |
| Nombre del docente | Nombre completo |
| Nombre y apellidos | El tuyo, completo |
| Integrantes del grupo | Ver el aviso de abajo |
| Fecha de entrega | La fecha agendada, no la fecha en que escribiste |
| Nombre del trabajo | Informe Técnico ES1 — Optimización del Sistema de Gestión Interna en EcoTech Solutions mediante Modelado Orientado a Objetos |
| Unidad de aprendizaje | Unidad 1: Modelado Orientado a Objetos |

:::ambiguedad "Integrantes del grupo" en una evaluación individual
La plantilla pide integrantes; la guía es tajante: *"cada estudiante deberá entregar de forma personal e independiente su propio diagrama de clases UML y el análisis crítico correspondiente"*. La salida que cumple las dos: escribe tu nombre y agrega entre paréntesis **"Evaluación individual — Unidad 1. Proyecto grupal a partir de la Unidad 2"**. Si ya tienes grupo asignado, lístalo debajo con el rótulo "Grupo del proyecto semestral". Está desarrollado en [Ambigüedades](02-ambiguedades-y-riesgos.html), riesgo 7.
:::

### Índice — 1 página propia

La plantilla lo exige en página independiente de la Introducción y actualizado *"en su totalidad"*. El detalle que delata un informe sin terminar es el índice de ejemplo, que trae las cinco entradas apuntando a la página 3. Si tu índice dice que Referencias está en la página 3, no lo actualizaste.

### I. Introducción — 1 página

Es la única sección con extensión fijada por la plantilla. Dos contenidos obligados por la guía: *"Contextualización del problema abordado y objetivos del proyecto"*.

| Qué va ahí | De dónde sale | Extensión |
|---|---|:--:|
| El problema de EcoTech Solutions: crecimiento acelerado, hojas de cálculo y sistemas aislados, y sus cinco consecuencias (duplicidad, errores de asignación, falta de trazabilidad de horas, reportes poco confiables, riesgo sobre datos personales) | Enunciado de la guía | 2 párrafos |
| Qué hace este informe y cómo está organizado | Tu propio recorrido | 1 párrafo |
| Anuncio en una línea de los objetivos, que se detallan en el apartado II | Apartado II | 1 línea |

**Redáctala al final.** La plantilla lo recomienda —*"se recomienda redactar este apartado al finalizar el cuerpo del informe"*— y tiene razón: una introducción escrita antes describe el informe que pensabas hacer, no el que hiciste.

### II. Objetivo — media página

Sección que exige la plantilla y que la guía no lista. No la elimines: el índice de la plantilla la contempla y quitarla se ve como plantilla mal usada.

| Subtítulo | Qué va ahí | Extensión |
|---|---|:--:|
| 2.1 Objetivo general | Una sola oración, calcada del Aprendizaje Esperado: diseñar un modelo de solución a la problemática de EcoTech Solutions mediante un diagrama de clases UML, considerando fundamentos de POO y el uso consciente y crítico de herramientas de IA | 3 líneas |
| 2.2 Objetivos específicos | Cuatro objetivos, uno por criterio de evaluación (1.1.1 a 1.1.4), cada uno con verbo en infinitivo | 8 líneas |

:::avanzado Un truco que casi nadie usa
Escribe los cuatro objetivos específicos con las palabras de los criterios 1.1.1 a 1.1.4 —analizar, elaborar, aplicar, diseñar— y anota el código del criterio entre paréntesis al final de cada uno. El evaluador lee tu apartado II y ya sabe que leíste la tabla de criterios. Cuesta cero y fija el marco de todo lo que viene.
:::

### 3.1 Análisis del problema — 3 a 4 páginas

Sale íntegro del [Paso 1](03-paso-1-analisis-poo.html). La guía lo describe como *"síntesis del levantamiento conceptual realizado en el Paso 1"*: síntesis, no volcado. Lo extenso va a anexos.

| Subtítulo | Qué va ahí | Mínimo que se cuenta | Págs. |
|---|---|:--:|:--:|
| 3.1.1 Entidades relevantes del dominio | Listado de las entidades identificadas, con una línea de justificación cada una y la marca de cuáles son principales | 4 entidades | 1 |
| 3.1.2 Atributos, objetos y responsabilidades | Tabla de cuatro columnas: elemento, atributos, objeto de ejemplo, responsabilidad | 4 filas | 1 |
| 3.1.3 Conceptos del problema y fundamentos de la POO | Tabla concepto del enunciado → pilar de la POO → justificación | 3 conceptos | 1 |
| 3.1.4 Cómo el enfoque OO estructura la solución | Prosa: qué resuelve el paradigma sobre las hojas de cálculo, y cómo el modelo afecta al sistema | — | 0,5 a 1 |

### 3.2 Diseño del sistema — 4 a 5 páginas

Es la sección más pesada y la que concentra los dos diagramas obligatorios. Sale del [Paso 2](04-paso-2-modelo-uml.html) para el modelo estructural y del [Paso 4](06-paso-4-validacion-final.html) para el definitivo.

| Subtítulo | Qué va ahí | Mínimo que se cuenta | Págs. |
|---|---|:--:|:--:|
| 3.2.1 Catálogo de clases | Una tabla por clase o una tabla general con nombre, atributos con tipo y visibilidad, métodos y responsabilidad | 3 clases principales, y las 4 obligatorias del enunciado | 1,5 |
| 3.2.2 Relaciones y multiplicidades | Tabla clase origen, clase destino, tipo de relación, multiplicidad en los dos extremos, justificación | 3 relaciones con tipo y multiplicidad | 1 |
| 3.2.3 Modelo inicial y modelo final | Las dos figuras, rotuladas sin ambigüedad y con fecha, más el párrafo que explica qué cambió entre una y otra | 2 modelos visibles | 1 a 1,5 |
| 3.2.4 Explicación del diagrama definitivo | Recorrido clase por clase y relación por relación del modelo final | — | 1 |

:::aviso El modelo inicial aparece en dos secciones y solo se pega una vez
La guía pide el modelo inicial en "Diseño del sistema" y los resultados de la IA en "Uso de herramientas de IA". Es la misma imagen. Pégala **una sola vez**, numérala como figura, y desde la otra sección remite por número: "el modelo generado en la iteración 2 se presenta en la Figura 4". Duplicar la lámina infla el informe y hace dudar de cuál es cuál.

Antes de decidir dónde va, resuelve qué llamas "modelo inicial": ¿el tuyo del Paso 2 o el que generó la herramienta? La guía usa las dos lecturas en sitios distintos. Elige una, **decláralo por escrito en el informe** y sé consistente. Está en [Ambigüedades](02-ambiguedades-y-riesgos.html), riesgo 11.
:::

:::trampa El diagrama que no se lee en papel carta
Con márgenes de 2,5 cm quedan unos 16,6 cm de ancho útil (21,59 cm de carta menos 2,5 cm por lado). Un diagrama de catorce clases con todos sus atributos no cabe legible ahí. La prueba real: abre el **PDF exportado al 100% de zoom**, no la imagen ampliada en pantalla. Si no se lee, parte el modelo en una vista general sin atributos más vistas de detalle por subsistema, y rotula cada una como "vista parcial del mismo modelo". Exporta a 300 ppp o en vectorial.
:::

### 3.3 Uso de herramientas de IA — 4 a 5 páginas

Sale del [Paso 3](05-paso-3-evaluacion-critica-ia.html). Es la sección que la guía describe con más detalle y la que más informes entregan incompleta, porque exige haber guardado el material mientras trabajabas.

| Subtítulo | Qué va ahí | Mínimo que se cuenta | Págs. |
|---|---|:--:|:--:|
| 3.3.1 Herramienta, versión y contexto | Nombre de la herramienta, versión, fechas de uso, y para qué la usaste y para qué no | — | 0,5 |
| 3.3.2 Iteración 1 | El prompt **transcrito literalmente**, con el contexto del problema y las instrucciones de formato, más el resultado obtenido | 1 prompt + 1 resultado con 3 clases, atributos, métodos y relaciones | 1,5 |
| 3.3.3 Iteración 2 | Ídem, y qué cambiaste del prompt y por qué | 1 prompt + 1 resultado | 1,5 |
| 3.3.4 Evaluación crítica | Tabla de hallazgos: aspecto (clase / atributo / relación), qué observaste, contraste con tu análisis del Paso 1, decisión tomada | 4 elementos clasificados | 1 a 1,5 |

:::trampa Parafrasear el prompt
La guía dice *"documenta al menos 2 prompts utilizados (incluyendo el contexto del problema y las instrucciones de formato)"*. Un prompt resumido en tercera persona —"se le solicitó a la herramienta un diagrama de clases"— no es el prompt utilizado. Va el texto tal cual, en un recuadro monoespaciado, con la fecha. Si el prompt es largo, va completo en el Anexo A y en el cuerpo va el fragmento con la remisión a la página del anexo.
:::

### 3.4 Mejoras aplicadas — 3 a 4 páginas

Sale de los pasos 3 y 4. Es donde se demuestra que el modelo final es tuyo y no de la herramienta.

| Subtítulo | Qué va ahí | Mínimo que se cuenta | Págs. |
|---|---|:--:|:--:|
| 3.4.1 Justificación de los cambios | Tabla antes / después / criterio técnico, solo con cambios **estructurales** (clases, relaciones, multiplicidades, visibilidad, responsabilidades) | 5 cambios recomendados | 1 a 1,5 |
| 3.4.2 Principios de diseño | Tabla principio → clase → evidencia concreta (el atributo, el método o la relación donde se ve) | 3 principios, en más de la mitad de las clases | 1 |
| 3.4.3 Matriz de trazabilidad | Tabla requisito del enunciado → clase → método o atributo que lo cumple | 3 requisitos exigidos; el enunciado trae 10 | 1 |
| 3.4.4 Viabilidad técnica en Python | Tabla de correspondencia UML → Python y un esqueleto de código que hayas ejecutado | — | 0,5 a 1 |

:::clave Por qué 3.4.4 existe aunque la guía no lo liste como sección
La ES1 se define como el informe de *"una solución de software en Python"* y el Paso 4 cierra pidiendo *"defendiendo la viabilidad técnica del diseño definitivo en Python"*. Un diagrama de clases es independiente del lenguaje, pero esa afirmación hay que poder demostrarla, y la demostración en papel pesa más que en la defensa. Media página con la tabla de correspondencias —clase, herencia, atributo privado, método abstracto, asociación con multiplicidad— y un esqueleto de veinte líneas cierra el punto. Está trabajado en [Paso 4](06-paso-4-validacion-final.html).
:::

### IV. Conclusiones — 1 a 1,5 páginas

La guía exige dos contenidos explícitos y la plantilla añade el registro. Escribe un subtítulo por cada uno de los dos puntos de la guía, o al menos un párrafo claramente identificable, para que se puedan marcar por separado.

| Qué va ahí | Origen |
|---|---|
| Reflexión sobre el proceso de aprendizaje: qué entendiste que antes no, qué error propio corregiste | Guía |
| Importancia del enfoque POO en la solución del problema de EcoTech | Guía |
| Postura crítica sobre el uso de IA en el desarrollo de software | Paso 4, viñeta oral |
| Ideas fuerza, aportes personales, y propuestas de profundización que no alcanzaste a abordar | Plantilla |

:::trampa Conclusiones que resumen el informe
"En este informe se analizó el problema, se diseñó un diagrama de clases y se evaluó críticamente la propuesta de IA" no es una conclusión: es el índice otra vez. La plantilla pide *"ideas principales y algunas ideas personales"*. La prueba: si tu párrafo de conclusiones se pudiera pegar en el informe de otro compañero sin cambiar una palabra, no concluye nada.
:::

### V. Referencias bibliográficas — media página

Mínimo, las dos fuentes de la bibliografía de la asignatura más la herramienta de IA que usaste. Formato y ejemplos en la sección de APA, más abajo.

### Anexos — 4 a 8 páginas

No los exige la guía, pero la guía sí pide *"incorporar elementos visuales relevantes"* y la plantilla, *"recopilar también distintos insumos gráficos"*, y son la salida limpia cuando el cuerpo desborda. La regla es una sola: **los anexos amplían, nunca sustituyen**. Ningún mínimo exigido puede vivir solo en un anexo; en el cuerpo va al menos la síntesis con la remisión.

---

## Las reglas de forma

Todas salen de la plantilla, que es la única fuente que las declara. La guía, por su cuenta, solo exige *"portada, índice, numeración, referencias si aplica"*.

| Elemento | Regla | Cita de la plantilla |
|---|---|---|
| Formato de archivo | Word o PDF | "tiene dos opciones para entregar el informe: documento de Word o convertirlo en PDF" |
| Papel | Tamaño carta | "Papel tamaño carta" |
| Márgenes | 2,5 cm en los cuatro lados | "superior e inferior de 2,5 cm. izquierdo y derecho de 2,5 cm" |
| Alineación | Justificada | "Párrafos: alineación justificada" |
| Interlineado del cuerpo | Sencillo | "interlineado sencillo" |
| Fuente | Arial o Calibri (Cuerpo) | "Tipo de letra o fuente: Arial o Calibri (Cuerpo)" |
| Títulos | 14, negrita | "Tamaño títulos: 14 y en negrita" |
| Subtítulos | 12, negrita | "Tamaño subtítulos: 12 y en negrita" |
| Texto | 11, normal | "Tamaño textos: 11 normal" |
| Referencias | Interlineado doble y sangría francesa | "Ejemplo de referencias bibliográficas (interlineado doble y sangría francesa)" |
| Ortografía | Revisada | "No olvides respetar las reglas ortográficas y de redacción" |

### La contradicción del interlineado, y cómo se resuelve

La plantilla pide interlineado **sencillo** en los párrafos y, doce líneas más abajo, interlineado **doble** en el ejemplo de referencias. Parece un descuido y no lo es: es exactamente la convención APA. El cuerpo del documento va sencillo; la sección V, y solo la sección V, va a doble espacio con sangría francesa.

La forma de que eso no se te desarme al maquetar:

1. Crea un estilo de párrafo propio en Word y llámalo `Referencia APA`.
2. Configúralo con interlineado **Doble**, espaciado anterior y posterior en 0 pto.
3. En Sangría, elige Especial → **Francesa**, en **1,25 cm** (el equivalente métrico de la media pulgada que pide APA).
4. Deja la alineación **a la izquierda**, no justificada: APA no justifica las referencias, y con sangría francesa el justificado abre huecos feos entre palabras.
5. Aplica ese estilo únicamente a las entradas de la sección V.

:::ambiguedad La plantilla define dos niveles de título y tú necesitas tres
"Títulos 14" y "subtítulos 12" cubren los apartados romanos y los subtítulos 3.1 a 3.4. Para el tercer nivel (3.1.1, 3.2.3) la plantilla no dice nada. Usa **11 en negrita**: se distingue del texto normal, no compite con el subtítulo de 12 y mantiene la jerarquía visual coherente. Lo importante no es el número elegido sino que sea el mismo en las veinte apariciones, y eso solo se garantiza con estilos nativos.
:::

### Figuras y tablas

La guía cobra los apoyos visuales como criterio propio: *"Incorporar elementos visuales relevantes (diagramas, tablas, esquemas)"*. Son tres tipos, y conviene que los tres estén presentes de forma reconocible.

- Numera las figuras de corrido: **Figura 1, Figura 2…**, con el pie **debajo** de la imagen.
- Numera las tablas aparte: **Tabla 1, Tabla 2…**, con el título **encima**.
- Refiere cada figura y cada tabla desde el texto al menos una vez ("como muestra la Figura 3"). Una imagen que el texto nunca menciona se lee como relleno.
- Los diagramas van como **imagen exportada**, no como objeto incrustado de una herramienta de dibujo: los objetos incrustados se desplazan al convertir a PDF en otro equipo.

### El lenguaje técnico

Es el primero de los tres criterios de forma que cobra la guía —*"Utilizar un lenguaje técnico claro, preciso y coherente"*— y el único que no se arregla maquetando: se arregla nombrando siempre igual las mismas cosas. Un informe que llama `RegistroTiempo` a una clase en el diagrama, "registro de horas" en 3.2.4 y "parte de horas" en la matriz de trazabilidad obliga al evaluador a reconstruir la equivalencia, y lo que se lee no es riqueza de vocabulario sino un modelo poco asentado.

- **Un nombre por cosa.** Cada clase se escribe con la misma grafía en el diagrama, en las tablas y en la prosa. Elige un formato y mantenlo: nombre de clase en cursiva o en monoespaciado, siempre en singular.
- **No confundas los niveles.** Clase, objeto e instancia no son sinónimos; atributo no es "campo"; método no es "función". El Paso 1 y el Paso 2 se corrigen leyendo justo estas palabras.
- **Nombra el tipo de relación cuando el tipo importa.** "Se relaciona con" no dice nada: va "asocia", "agrega", "compone" o "hereda de", y la multiplicidad al lado.
- **Coherencia con el enunciado.** Los requisitos se citan con su título literal ("Registro de Tiempo", "Asignación de Empleados a Proyectos"), que es lo que el evaluador busca por coincidencia de texto.
- **Prueba concreta.** Busca en el documento el nombre de cada clase del modelo final. Si alguna aparece con dos grafías distintas, unifícalas antes de exportar.

---

## APA 6: cómo se cita

La plantilla nombra una norma concreta y anticuada:

> Para realizar un listado de las fuentes bibliográficas utilizadas para la recopilación de información, con el título "Referencias bibliográficas", según Norma APA 6° Edición

Curiosamente, la propia guía no la aplica en su bibliografía: cita sin ciudad y con el marcador de edición en inglés, "(1st ed.)". Tú aplícala igual, porque es la única norma nombrada y cumplirla es gratis.

### Un libro en APA 6

El patrón, para un libro con un solo autor:

```text
Apellido, N. N. (Año). Título del libro en cursiva (n.ª ed.). Ciudad, País: Editorial.
```

Cuatro detalles que distinguen APA 6 de APA 7 y que un evaluador con la norma al lado revisa:

- **La ciudad de publicación va**, seguida del país. APA 7 la eliminó; APA 6 la exige.
- El título del libro va **en cursiva**, y solo con mayúscula inicial (y en nombres propios).
- La edición va entre paréntesis después del título, **sin cursiva**, y solo si no es la primera.
- Para fuentes en línea, APA 6 usa **"Recuperado de"** antes de la URL.

En el texto se cita autor y año entre paréntesis: (Jiménez de Parga, 2021), y con página cuando citas textual: (Jiménez de Parga, 2021, p. 45).

### Las dos referencias que da la propia guía, formateadas

La guía las entrega así, sin ciudad:

> Sánchez Palacio, A. (2025). ChatGPT y OpenAI: desarrollo y uso de herramientas de inteligencia artificial generativa. RA-MA Editorial.
> Jiménez de Parga, C. (2021). UML: arquitectura de aplicaciones en Java, C++ y Python (1st ed.). Ra-Ma.

Ajustadas a APA 6, con sangría francesa e interlineado doble, y ordenadas alfabéticamente por apellido:

```text
Jiménez de Parga, C. (2021). UML: arquitectura de aplicaciones en Java,
     C++ y Python. Madrid, España: Ra-Ma.

Sánchez Palacio, A. (2025). ChatGPT y OpenAI: desarrollo y uso de
     herramientas de inteligencia artificial generativa. Madrid,
     España: RA-MA Editorial.
```

Los títulos van en cursiva en tu documento; aquí no se ve porque el bloque es monoespaciado. Y fíjate en dos decisiones que tomé y que tienes que verificar tú:

- **Quité "(1st ed.)"**. APA 6 solo consigna la edición cuando no es la primera, y además el marcador iría en castellano, "(1.ª ed.)".
- **Agregué la ciudad**, que la guía omite y APA 6 exige. Ra-Ma es una editorial española con sede en Madrid, pero **verifícalo en la portada del ejemplar o en el catálogo de la Red de Bibliotecas INACAP** antes de escribirlo. Si no logras confirmarlo, la salida honesta es omitir la ciudad, no inventarla: una referencia incompleta se descuenta menos que una referencia falsa.

### El problema de citar una IA en APA 6

APA 6 se publicó en 2009, con copyright 2010. No contempla la inteligencia artificial generativa, sencillamente porque no existía. No hay entrada canónica, y no la va a haber: la norma está congelada. Al mismo tiempo, esta evaluación tiene el uso de IA como eje declarado y te obliga a documentarlo. Entregar un informe sobre uso crítico de IA que no cita la herramienta usada es una incoherencia que salta a la vista.

:::clave La solución práctica: tratarla como software
APA 6 sí tiene una categoría que encaja, la de programas y aplicaciones informáticas. El patrón es:

```text
Titular de los derechos. (Año). Nombre del software (versión)
     [Descriptor entre corchetes]. Recuperado de URL
```

Aplicado, y adaptando el descriptor a lo que la herramienta realmente es:

```text
OpenAI. (2025). ChatGPT (GPT-4o) [Software de inteligencia artificial
     generativa]. Recuperado de https://chat.openai.com
```

Y en el texto: (OpenAI, 2025).

Sustituye titular, nombre, versión, año y URL por los de **la herramienta que usaste de verdad**. Si no sabes la versión exacta, escribe la fecha de consulta, que es el dato que de verdad hace trazable una salida generativa.
:::

La entrada bibliográfica, por sí sola, no cumple lo que pide la guía. La trazabilidad real vive en **3.3.1**: herramienta, versión, fechas de uso, y para qué la usaste y para qué no. La referencia en la sección V es el complemento formal de esa declaración, no su reemplazo.

:::aviso Plan B si el docente pide APA 7
La conversión es mecánica: quitar la ciudad, reemplazar "Recuperado de" por la URL desnuda, y usar el formato que APA sí definió para modelos de lenguaje, con el descriptor `[Large language model]` o su traducción y sin "Recuperado de". Mantén las referencias en un archivo aparte para reconvertirlas de una pasada en vez de editarlas dentro del informe.
:::

---

## Higiene de plantilla

La plantilla viene con instrucciones dirigidas a ti y ejemplos de otra asignatura. Todo eso se borra. Es el defecto más visible de un informe y el más barato de evitar: una búsqueda de dos minutos.

### Textos que hay que eliminar

| Dónde | Texto que hay que borrar |
|---|---|
| Bajo el índice | "Una vez finalizado el informe, actualiza esta tabla de contenidos, ubicando el mouse sobre ella, y pulsando el botón derecho del mouse…" |
| Bajo el índice | "NOTA: Cada docente DEBE modificar, ajustar o completar los apartados del informe según las características o tipo de informe." |
| Introducción | "Presentación de la temática desarrollada en el informe, mediante una página que debe incluir información…" |
| Conclusiones | Las dos viñetas de instrucción, "Presentar una síntesis, donde se expongan ideas principales…" y "También es posible incorporar reflexiones…" |
| Referencias | "Ejemplo de referencias bibliográficas (interlineado doble y sangría francesa):" |
| Referencias | Las dos referencias de ejemplo: Audesirk sobre biología y Vargas y Palacios sobre educación para la salud |
| Final | Todo el bloque "Aspectos de forma y estilo", incluida la URL de la Red de Bibliotecas |
| Final | "No olvides respetar las reglas ortográficas y de redacción" (aparece dos veces) |
| Final | "Una vez finalizado el informe, elimina las instrucciones y ejemplos. Recuerda completar el pie de página…" |

:::trampa Un informe de programación que cita un libro de biología
La referencia de Audesirk sobre "Biología: La vida en la Tierra" es el ejemplo de la plantilla, y sobrevive con una frecuencia asombrosa hasta la entrega final. Es la señal más inequívoca de que nadie leyó su propio documento antes de subirlo, y está en la sección que el evaluador mira al final, justo antes de poner la nota.
:::

**Búsqueda de control.** Con Ctrl+B en Word, busca estas cadenas. Todas deben dar cero resultados: `elimina`, `NOTA:`, `Audesirk`, `Ejemplo`, `puede ser modificado`, `No olvides`. Busca además `Nombre del docente` y `Nombre del trabajo`: esos dos son rótulos de la portada y siguen ahí, pero cada uno tiene que aparecer con su valor escrito al lado, no en blanco.

### La tabla de contenidos

1. Escribe todo el informe con **estilos nativos** (Título 1 para los apartados romanos, Título 2 para 3.1 a 3.4, Título 3 para el tercer nivel). Si aplicaste negrita y tamaño a mano, el índice saldrá vacío.
2. Referencias → Tabla de contenido → Insertar tabla de contenido → **Mostrar niveles: 3**.
3. Al terminar de escribir, y otra vez después de cualquier cambio: clic derecho sobre la tabla → Actualizar campos → **Actualizar toda la tabla**. No "solo los números de página": si cambiaste un título, esa opción no lo trae.
4. Verifica a mano tres números de página al azar contra el documento.
5. Deja el índice en página propia con un salto de página explícito, no con líneas en blanco.

### El pie de página y la portada

La plantilla cierra pidiendo dos cosas concretas:

> Recuerda completar el pie de página y los datos de la portada con el nombre del Área académica y nombre de tu carrera.

Van, tal como aparecen en la cabecera de la guía de evaluación:

- **Área Académica:** Tecnologías de Información y Ciberseguridad
- **Carrera:** Analista Programador

En el pie va también el **número de página**. Activa "Primera página diferente" para que la portada no lleve numeración, y verifica que el índice y la Introducción queden con el número correcto: la plantilla asume que la Introducción empieza en la página 3.

---

## Qué hacer con el repositorio

Si ya tienes un sistema implementado y desplegado, tienes mucho más material del que esta unidad pide. Eso es una ventaja y un riesgo, y los dos se administran con la misma decisión: **el informe se sostiene solo, y el repositorio es un anexo de validación**.

:::aviso Un enlace no es una evidencia entregada
La guía cierra la vía alternativa en mayúsculas —*"NO SE RECIBIRÁN ENTREGAS POR CORREO"*— y la plantilla define el entregable de forma cerrada: un documento de Word o un PDF. Ninguna de las dos fuentes contempla anexos digitales ni repositorios.

Nada garantiza que el evaluador abra tu enlace, y menos que lo puntúe. Si el único sitio donde vive tu matriz de trazabilidad es un archivo `.md` en GitHub, la matriz no está entregada. Los ítems más fácilmente delegables a un enlace son justamente los que la rúbrica cuenta uno por uno: prompts, salidas, hallazgos, relaciones con multiplicidad, principios, filas de la matriz.
:::

### Cómo citarlo sin que cargue con la evidencia

1. **Primero, migra al informe todo lo que puntúa.** Tablas escritas en el documento, diagramas exportados como imagen, prompts transcritos. Si desborda, el desborde va a los anexos **del mismo archivo**, no afuera.
2. **Después, y solo después, agrega el Anexo D.** Media página a una página, con este contenido: qué es el sistema, en qué está construido, que **no es un requisito de la Unidad 1**, y dos o tres capturas que muestren el modelo funcionando.
3. **Declara la diferencia de lenguaje tú mismo.** La ES1 se define como una solución "en Python" y tu prototipo está en TypeScript. Escríbelo: el diagrama de clases es independiente del lenguaje de implementación, el diseño se traduce a Python —y esa traducción está en 3.4.4—, y el prototipo se construyó en otra pila por razones de despliegue. Anunciar la discrepancia con su justificación es una decisión de diseño defendible; que la descubra el evaluador es una inconsistencia.
4. **Haz lo mismo con la persistencia.** El enunciado pide *"utiliza una base de datos"* y tu prototipo usa un almacén de clave-valor. En un diagrama de clases eso ni siquiera aparece, pero si mencionas el prototipo, menciona también esto y por qué no afecta al modelo estructural.
5. **El enlace va en una nota al pie del Anexo D**, etiquetado como "material ampliado (opcional)". Nunca en la portada como si fuera parte del entregable, y nunca en el cuerpo con la fórmula "el detalle completo está en el repositorio".
6. **Agrégalo a Referencias como software**, con el mismo patrón que la herramienta de IA:

```text
Apellido, N. (2026). EcoTech Solutions: sistema de gestión interna
     [Software]. Recuperado de https://github.com/[usuario]/ecotech-solutions
```

:::trampa La sobre-entrega que parece hecha por una IA
Un sistema completo, doce documentos técnicos y veinticinco diagramas, entregados en una unidad que solo pide **modelar**, generan una pregunta razonable en cualquier evaluador: ¿esto lo hizo el estudiante?

El antídoto no es esconder el trabajo, es **mostrar el proceso**. Un informe que exhibe versiones fechadas, decisiones con su alternativa descartada, un error propio detectado y corregido, y una tabla de hallazgos donde tú corriges a la herramienta, se lee como trabajo humano. Un informe pulido sin ninguna huella de proceso se lee como salida generada, aunque no lo sea.

Y hay una segunda red: la defensa oral. Está en los cuatro pasos precisamente para esto. Si entiendes lo que entregaste, la sobre-entrega juega a tu favor. Si no, se cae en la primera repregunta. Prepárala con [La defensa oral](08-defensa-oral.html).
:::

---

## Antes de subir

Este checklist es de **montaje**, no de contenido. Los mínimos de contenido —las 4 entidades, los 2 prompts, las 3 relaciones, los 3 principios— están en el checklist de [Qué pide la evaluación](01-que-pide-la-evaluacion.html). Pasa ese primero; este después, con el documento ya escrito.

| # | Verificación | Prueba concreta | Listo |
|:--:|---|---|:--:|
| 1 | La portada tiene los 8 campos completos | Ningún "Nombre del docente" sin rellenar | |
| 2 | La portada aclara que la Unidad 1 es individual | Nota junto a "integrantes del grupo" | |
| 3 | El pie de página trae área académica, carrera y número de página | Visible en la página 5, ausente en la portada | |
| 4 | El índice está actualizado en su totalidad | Referencias no dice "página 3" | |
| 5 | El índice muestra 3 niveles y lista 3.1 a 3.4 | Los cuatro nombres literales de la guía aparecen | |
| 6 | El índice está en página propia | Salto de página antes de la Introducción | |
| 7 | Los 4 subtítulos del Desarrollo usan las palabras exactas de la guía | "Uso de herramientas de IA", no "Aplicación de IA" | |
| 8 | Todas las instrucciones de la plantilla están borradas | Búsqueda de `elimina`, `NOTA:`, `Audesirk` sin resultados | |
| 9 | Papel carta y márgenes de 2,5 cm en los cuatro lados | Configurar página → Márgenes | |
| 10 | Fuente Arial o Calibri en todo el documento | Ctrl+E, mirar el cuadro de fuente: no debe salir en blanco | |
| 11 | Títulos 14 negrita, subtítulos 12 negrita, texto 11 normal | Revisión visual de los estilos | |
| 12 | Cuerpo justificado con interlineado sencillo | Ctrl+E y revisar párrafo | |
| 13 | Sección V con interlineado doble y sangría francesa de 1,25 cm | Solo esa sección | |
| 14 | Referencias en APA 6, ordenadas alfabéticamente | Jiménez de Parga antes que Sánchez Palacio | |
| 15 | Las 2 fuentes de la asignatura están citadas | Con ciudad verificada o deliberadamente omitida | |
| 16 | La herramienta de IA está citada como software | Con versión o fecha de consulta | |
| 17 | Figuras numeradas con pie debajo, tablas con título encima | Numeración corrida, sin saltos | |
| 18 | Cada figura y cada tabla se menciona en el texto | "como muestra la Figura 3" | |
| 19 | Los diagramas se leen en el PDF al 100% de zoom | Prueba sobre el PDF, no sobre la imagen original | |
| 20 | Los tres tipos de apoyo visual están presentes | Diagramas, tablas y al menos un esquema | |
| 21 | Ningún mínimo exigido vive solo en un anexo o en un enlace | Cada criterio tiene evidencia en el cuerpo | |
| 22 | El repositorio, si aparece, está rotulado como anexo opcional | Nunca en la portada | |
| 23 | La discrepancia de lenguaje está declarada por escrito | Si mencionas el prototipo | |
| 24 | Ortografía y tildes revisadas con el corrector activo | Cero subrayados rojos | |
| 25 | Cada clase se llama igual en el diagrama, en las tablas y en la prosa | Búsqueda del nombre de cada clase: una sola grafía | |
| 26 | Exportado a PDF **desde tu equipo final** | Las imágenes no se movieron | |
| 27 | Revisaste el PDF exportado, no el Word | El PDF es lo que se corrige | |
| 28 | Nombre de archivo identificable | `TI3021_ES1_ApellidoNombre_Seccion.pdf` | |
| 29 | Subido al AAI con horas de margen, no minutos | Corte a las 23:00 y bloqueo duro | |
| 30 | Guardaste el comprobante de carga | Captura de pantalla de la confirmación | |

:::clave La prueba de la página
Para cada fila marcada tienes que poder decir el número de página donde está la evidencia. Si respondes "está en alguna parte", no está. La corrección se hace con el documento abierto y la rúbrica al lado, en una pasada.
:::

:::aviso Las últimas dos horas no son para escribir
Reserva las dos horas anteriores a la entrega solo para maquetar, exportar, revisar el PDF y subir. Si a las 21:00 todavía estás redactando la sección 3.4, algo se va a entregar mal maquetado, y la maquetación es justamente lo que se revisa de una mirada. La guía lo dice sin rodeos: *"Se recomienda evitar realizar la carga en el último minuto, dado que existe la posibilidad de fallas en el sistema y problemas de conexión"*. Una vez cerrado el plazo, la tarea se bloquea y no hay vía por correo.
:::

---

## Lo que este documento no puede resolver

:::nota La Rúbrica N°1 no está adjunta
La guía manda revisar el instrumento que efectivamente pone la nota —*"Instrumento de evaluación: Rúbrica N°1"*— y esa rúbrica vive en el AAI, no en el paquete que tienes. Todo lo que aquí se trata como criterio de corrección está inferido de las viñetas **"Acciones para desarrollar"** de cada paso, que están redactadas como filas de rúbrica, y de las reglas explícitas de la plantilla.

Búscala en el AAI antes de maquetar. Si la rúbrica fija una estructura, una extensión o una norma de citación distintas, **manda la rúbrica** y este documento se ajusta a ella.
:::

**Lo que sigue.** Con el informe montado, queda lo que vale uno de cada cinco indicadores de la evaluación y no se entrega en papel: [La defensa oral](08-defensa-oral.html), con el guion por bloques y las preguntas que caen casi siempre. Si al llenar el esqueleto te faltó material de algún paso, vuelve al paso correspondiente antes que a la maqueta: es más rápido escribir una tabla que rediseñar un documento alrededor de un hueco.
