# Ambiguedades de la guia y como resolverlas

La guía de la ES1 y la plantilla de informe no fueron escritas juntas. Se contradicen en varios puntos, dejan otros en blanco y en al menos un caso mencionan un paso que no existe. Nada de eso es culpa tuya, pero todo eso lo pagas tú si lo descubres el día de la entrega.

Este documento aísla dieciocho tensiones reales entre lo que dice una fuente y lo que dice la otra. Cada una viene con la cita textual que la genera, una lectura recomendada y un plan B por si el docente la interpreta al revés. Están ordenadas por riesgo: las once primeras son las que pueden costarte criterios completos o la evaluación entera.

:::nota Cómo usar este documento
No es una lista de tareas. Es un mapa de decisiones que vas a tener que tomar igual, con o sin este texto. Lo que hace la lista es que las tomes ahora, con tiempo, en vez de a las 22:40 del día de entrega.

Cinco de estas ambigüedades se cierran con un solo correo al docente. Están marcadas al final, en "Las cinco preguntas que valen un correo". Escríbelo esta semana.
:::

---

## Tabla de riesgo

| # | Ambigüedad | Riesgo | Qué se pierde si sale mal |
|---|---|:--:|---|
| 1 | Python contra TypeScript | Alto | El indicador oral del Paso 4 y el marco de lectura completo |
| 2 | Prompts no documentados | Alto | Dos indicadores binarios del Paso 3 |
| 3 | El entregable es un archivo, no un repositorio | Alto | Toda evidencia que quede fuera del PDF |
| 4 | Fecha en blanco, corte a las 23:00, bloqueo duro | Alto | El 15% completo |
| 5 | La Rúbrica N°1 no está adjunta | Alto | Puntos en criterios que no sabías que existían |
| 6 | Sobre-entrega: parece hecho por IA | Alto | Credibilidad, y con ella la defensa |
| 7 | Individual contra grupal y la portada | Alto | Puede escalar a falta académica |
| 8 | Plantilla de 5 apartados contra guía de 6 bloques | Alto | Criterios marcados como no evidenciados |
| 9 | El diagrama tiene que ser legible en papel carta | Alto | Los criterios 1.1.2 y 1.1.4, que se juegan en la lámina |
| 10 | Defensa oral sin formato, duración ni ponderación | Alto | Uno de cada cinco indicadores, en los cuatro pasos |
| 11 | "El modelo inicial": ¿el tuyo o el de la IA? | Alto | La evidencia de que hubo criterio propio |
| 12 | "Base de datos" contra Workers KV | Medio-alto | Credibilidad técnica por una sola frase |
| 13 | Qué cuenta como "requerimiento" en la matriz | Medio-alto | Un indicador por forma, no por fondo |
| 14 | 3 relaciones contra 4 tipos, y la multiplicidad | Medio-alto | El indicador de notación del Paso 2 |
| 15 | Si Mermaid cuenta como "notación UML" | Medio-alto | El punto donde tu modelo es más fuerte |
| 16 | La asignatura es POO **Seguro** y falta la teoría | Medio-alto | Un diferenciador barato que casi nadie hará |
| 17 | Plantilla "opcional" y sin personalizar | Medio | El criterio de presentación completo |
| 18 | APA 6, "referencias si aplica" y cómo citar la IA | Medio | Los puntos más mecánicos de toda la rúbrica |

---

## Riesgo alto

### 1. Python contra TypeScript

La guía nombra Python dos veces, y las dos veces lo ata al entregable. Primero al definir qué es la ES1:

> Esta evaluación corresponde a la ES1 (15%), que consiste en un Informe técnico del diseño y desarrollo de una solución de software en Python representada mediante un diagrama de clases UML

Y después, peor, en el último indicador del Paso 4, que es el cierre de la defensa oral:

> Concluye la presentación defendiendo la viabilidad técnica del diseño definitivo en Python, respondiendo con seguridad y fundamentos sólidos a las preguntas del docente o comisión

Contra eso, tu sistema está íntegramente en TypeScript sobre Cloudflare Workers, y la palabra "Python" no aparece ni una sola vez en las 7.421 líneas de `docs/`. Hay un agravante que conviene mirar de frente: el diagrama de `docs/03-modelo-uml.md` arrastra tipos que no existen ni en UML ni en Python (`Partial`, `unknown`, `Promise~Uint8Array~`, `number` y `boolean` en minúscula). Eso no solo delata el lenguaje: delata que el modelo se derivó del código, y no al revés, que es justamente el orden inverso al que evalúa esta unidad.

:::clave Cómo conviene resolverlo
Un diagrama de clases UML no tiene lenguaje, y el aprendizaje esperado de la unidad es *diseñar un modelo*, no implementarlo. Entonces:

1. Neutraliza los tipos del diagrama del informe: `String`, `Integer`, `Real`, `Boolean`, `Date`, `List<T>`. `Promise~Uint8Array~` pasa a `bytes`; `Partial` y `unknown` pasan a firmas explícitas.
2. Agrega dentro de "Diseño del sistema" una subsección corta titulada literalmente **Viabilidad técnica en Python**, que traduzca decisión por decisión: clase abstracta a `abc.ABC` con `@abstractmethod`, encapsulamiento a atributo `_privado` con `@property`, clase de asociación a `@dataclass` con identidad propia, polimorfismo a método abstracto redefinido en cada subclase, estados a `Enum`. Usar la palabra del bullet cumple el bullet.
3. Menciona el TypeScript **una sola vez**, rotulado como prototipo de validación del modelo, en un anexo o una nota al pie. Sin disculparte y sin insistir.
:::

:::aviso Plan B si el docente exige Python de verdad
Ya está hecho: [`python/modelo.py`](python/modelo.py), en esta misma guía, es el modelo del diagrama traducido a Python ejecutable, sin dependencias, que se corre con `python3 modelo.py`. Su último bloque imprime tres remuneraciones distintas —asalariado, por horas y contratista— desde un único bucle y sin un solo `if` sobre el tipo de contrato, que es justo la demostración que cierra esta objeción. Ejecútalo antes de la defensa y entiende qué imprime.

Si prefieres llevar algo más corto, recórtalo a las seis clases del núcleo (Entidad, Persona, Empleado abstracta y las tres subclases de contrato), solo firmas y `@abstractmethod`. En cualquiera de las dos formas, la objeción se convierte en demostración: eso es exactamente "viabilidad técnica del diseño definitivo en Python".

Si en cambio el docente responde que el lenguaje da lo mismo en esta unidad, no vuelvas a mencionarlo. Insistir solo llama la atención sobre el desajuste.
:::

### 2. Los prompts no están documentados en ninguna parte

Este es el punto más barato de perder de toda la evaluación, porque es binario: el prompt está o no está. La guía lo pide dos veces, y en el Paso 3 lo pide con dos componentes obligatorios:

> Documenta al menos 2 prompts utilizados (incluyendo el contexto del problema y las instrucciones de formato) y el resultado obtenido para cada iteración.

> Debes documentar el uso de la herramienta (prompt y resultado).

En el repositorio, `grep -ri prompt docs/` devuelve **cero resultados** en los doce archivos. `docs/02-evaluacion-critica-ia.md` tiene el análisis crítico más que cubierto —tres propuestas con sus diagramas y un catálogo de errores clasificados, frente a los "al menos 4 elementos" que pide la guía—, pero parafrasea la petición en vez de citarla y no reproduce ninguna salida cruda. Hay un segundo problema encima: el documento atribuye las propuestas al enunciado ("El enunciado señala que se emplearon herramientas de inteligencia artificial"), así que ni siquiera se lee como uso propio de IA. Y "Propuesta A / B / C" son alternativas, no *iteraciones*: iterar implica refinar el prompt a la vista del resultado anterior.

:::clave Cómo conviene resolverlo
Genera de verdad, ahora, dos iteraciones, y captúralas literalmente. Cada bloque lleva cinco elementos: herramienta y versión, fecha, prompt textual completo en caja de código, salida obtenida tal cual, y análisis.

- **Iteración 1**, prompt amplio: pega el enunciado de EcoTech Solutions (ese es el "contexto del problema") y cierra con la instrucción de formato ("devuélvelo como diagrama de clases en Mermaid, con visibilidad de atributos y multiplicidades en todas las relaciones"). Los dos componentes que exige el bullet tienen que ser visibles en el texto del prompt.
- **Iteración 2**, prompt correctivo: cita los defectos que detectaste en la salida 1 y pide la corrección. Eso es lo que convierte dos prompts en una iteración.

Con eso, todo el material de `docs/02` entra al informe como lo que siempre fue: la sección de crítica. La cadena queda completa y verificable: prompt → salida → crítica clasificada → modelo final refinado.
:::

:::aviso Plan B si no alcanzas a re-ejecutar
Documenta la reconstrucción con honestidad explícita: "prompt reconstruido a partir del registro de trabajo del [fecha]". La guía castiga entregar resultados de IA sin análisis, no el uso honesto y declarado. Lo que no conviene bajo ninguna circunstancia es dejar `docs/02` como está: hoy atribuye las propuestas al enunciado, y si el docente pregunta "¿estos diagramas los generaste tú?", te obliga a improvisar una explicación que contradice tu propio documento entregado.
:::

### 3. El entregable es un archivo, no un repositorio

La guía cierra por escrito, en mayúsculas, la única vía alternativa de entrega:

> NO SE RECIBIRÁN ENTREGAS POR CORREO.

Y la plantilla define el formato de forma cerrada:

> Formato: tiene dos opciones para entregar el informe: documento de Word o convertirlo en PDF.

Ninguna de las dos fuentes contempla anexos digitales, enlaces ni repositorios. Es tentador escribir "el detalle completo está en el repositorio" y ahorrar veinte páginas, pero nada garantiza que el evaluador abra ese enlace, y menos que lo puntúe. Delegar en un enlace la evidencia de un criterio equivale a no entregarla. Los ítems más fácilmente delegables son justamente los que la rúbrica cuenta uno por uno: prompts, salidas, hallazgos, relaciones con multiplicidad, principios de diseño, filas de la matriz.

:::clave Cómo conviene resolverlo
Audita el informe contra la lista de mínimos explícitos de la guía y verifica que cada uno sea visible **dentro del PDF**: 4 entidades, 4 elementos del problema con atributos, objetos y responsabilidad, 3 conceptos ligados a fundamentos POO, 3 clases, 3 relaciones con tipo y multiplicidad, 2 iteraciones de IA, 2 prompts con su resultado, 4 elementos analizados y clasificados, 3 principios de diseño, 3 requerimientos trazados.

Si el volumen desborda el cuerpo, no recortes hacia afuera: recorta hacia los anexos **del mismo archivo**. "Anexo A. Transcripción íntegra de prompts y respuestas", "Anexo B. Catálogo de hallazgos sobre los modelos generados por IA", "Anexo C. Matriz de trazabilidad completa". El cuerpo sintetiza y remite por número de página. El documento sigue siendo uno solo y autosuficiente.

Los enlaces se incluyen etiquetados como "material ampliado", jamás como sustituto de una evidencia puntuada. Nombra el archivo para que el docente lo identifique sin abrirlo: `ES1_TI3021_Apellido_Nombre.pdf`.
:::

:::aviso Plan B si el docente sí acepta el repositorio
Agrégalo igual al pie de la portada como "anexo de validación (opcional)", pero el informe tiene que sostenerse sin abrirlo. Si te pide el código como archivo, súbelo como segundo archivo en la misma tarea con prefijos que ordenen la lectura (`01_Informe_....pdf`, `02_Codigo_....zip`). Revisa antes el límite de tamaño de la tarea del AAI: un PDF con diagramas a 300 ppp pasa fácil de 20 MB.
:::

### 4. La fecha está en blanco, el corte es a las 23:00 y el bloqueo es duro

La guía fija la consecuencia con máxima dureza pero deja el dato en blanco. La casilla de la cabecera está literalmente vacía:

> `| Duración | 4 semanas | Fecha |  |`

Y el plazo se define por referencia a algo externo:

> En la plataforma AAI se habilitará la tarea para que carguen la documentación en la fecha correspondiente hasta las 23:00hrs. del día agendado.

> Una vez finalizado el plazo, se bloqueará el acceso a subir la tarea.

Este es el único riesgo de la lista que anula el 15% completo con independencia de la calidad del trabajo. Un informe excelente subido a las 23:01 vale lo mismo que ninguno, y el correo está excluido por escrito.

:::clave Cómo conviene resolverlo
La fecha válida es la que muestra la tarea en el AAI, no la guía (que la trae vacía) ni lo dicho de palabra en clase. Verifícala en la plataforma hoy y anótala.

Fíjate un plazo propio 24 horas antes del real y sube en ese momento una versión completa aunque mejorable. Si el AAI permite reemplazo, refinas después. Al subir, confirma la carga desde la propia plataforma: recarga la página de la tarea, mira el archivo listado con su tamaño, y descárgalo y ábrelo desde ahí para comprobar que no se corrompió y que no subiste el archivo equivocado. Guarda la captura del comprobante con hora.
:::

:::aviso Plan B si el AAI falla en la ventana final
Captura la pantalla del error con la hora visible, escribe de inmediato al docente adjuntando esa captura y el informe, y reintenta apenas se restablezca. El correo no vale como entrega, pero sí como constancia de que el trabajo estaba terminado a tiempo: la propia guía lo habilita para situaciones a validar ("Es necesario que informen oportunamente al docente a través de correo electrónico para validar su situación"). Nunca asumas que el correo cierra el asunto. Hay que subirlo igual.
:::

### 5. La Rúbrica N°1 asigna la nota, se manda a revisarla y no está adjunta

La guía nombra el instrumento dos veces y en las dos lo trata como obligatorio:

> Se recomienda revisar: Bibliografía de la asignatura. Material de clases. Plantilla del informe. Rúbrica de evaluación (Rúbrica N°1)

> En el AAI revisa los siguientes recursos: Plantilla informe (opcional) Instrumento de evaluación: Rúbrica N°1

La guía describe **acciones**; la rúbrica define **niveles de logro** y ponderaciones. Sin ella estás optimizando contra el documento equivocado. Hay además señales de que la guía está truncada respecto de una versión más larga: anuncia un Paso 6 que no existe, y numera dos secciones seguidas como "I".

:::clave Cómo conviene resolverlo
Baja la Rúbrica N°1 del AAI **antes** de maquetar y convierte sus descriptores en los subtítulos y tablas del informe. Es la forma más eficiente de no perder puntos.

Mientras no la tengas, lo único usable como rúbrica son las viñetas "Acciones para desarrollar" de cada paso. La cuenta es limpia y conviene tenerla presente: 4 pasos × 5 acciones = 20 indicadores, y en cada paso la última acción es oral. Trata cada viñeta como un indicador con nota propia, y trata los mínimos numéricos ("al menos 4", "al menos 3", "al menos 2") como el descriptor de logro básico: cumplir el mínimo es suficiente, superarlo con justificación técnica es destacado.

Práctica concreta: incluye al inicio del informe una **tabla de correspondencia** "acción de la guía → sección y página", para que el evaluador encuentre cada indicador sin buscarlo.
:::

:::aviso Plan B si la rúbrica aparece tarde o con requisitos nuevos
Si aparece agrupada por criterio con menos indicadores, la tabla de correspondencia no estorba y sigue facilitando la corrección. Si aparece con exigencias no descritas (extensión máxima, formato del diagrama, autoevaluación), la prioridad es **re-empaquetar**: portada, orden, formato, anexos. Nunca rehacer el modelo, que es lo más caro y lo que ya está sólido.

Si nunca aparece, pídela por escrito al docente y deja constancia con fecha.
:::

### 6. Sobre-entrega: un sistema desplegado puede parecer hecho por IA

La Unidad 1 pide modelar. El aprendizaje esperado es explícito:

> Diseña un modelo de solución a una problemática planteada para facilitar su codificación, mediante un diagrama de clases UML

*Facilitar* la codificación, no codificar. Ninguno de los cuatro pasos pide código, despliegue ni interfaz. Tú llegas con 16.399 líneas de TypeScript, 81 pruebas, un generador de PDF propio y un exportador XLSX. Y ni la guía ni la plantilla fijan extensión: la única cota cuantitativa del paquete es "una página" para la Introducción.

El problema no es la calidad. Es que la guía advierte:

> Importante: La entrega de resultados generados exclusivamente por IA, sin análisis ni ajustes, será considerada insuficiente.

Un volumen enorme y uniforme, en una asignatura cuyo eje es el uso crítico de IA, invita exactamente a esa sospecha. Y el repositorio no ayuda: los diez commits llevan trailer de coautoría de un modelo, están firmados el mismo día en una ventana de diez horas, y el remoto es público.

:::trampa El error de cálculo
"Más es más" es falso aquí y es asimétrico. Prácticamente todos los puntos disponibles se obtienen con un informe correcto de extensión razonable. Lo que se pierde con un volumen desmedido —que el evaluador no encuentre los indicadores, o que dude de la autoría— es más grave que lo que se gana. Además, mostrar el sistema abre un frente de preguntas que la rúbrica no ofrecía y que sí se pueden contestar mal: consistencia eventual de KV, escrituras concurrentes, iteraciones de PBKDF2. Estás arriesgando terreno donde no hay puntos que ganar.
:::

:::clave Cómo conviene resolverlo
Informe autocontenido de 15 a 25 páginas de cuerpo, más anexos ordenados y citados desde el cuerpo. Regla de admisión: **nada entra al cuerpo si no responde a una acción explícita de los pasos 1 a 4 o del apartado de informe técnico**. La arquitectura, la API, el modelo KV, el manual y el despliegue quedan fuera: no pertenecen a esta unidad.

La implementación entra como evidencia en dos lugares exactos donde la guía tiene gancho, y en ninguno más. Primero, "Validar la coherencia del modelo con los requerimientos": el modelo se validó ejecutándolo, y la prueba de nómina liquida tres tipos de contrato en un solo `reduce` sin un `if`, lo que demuestra que el polimorfismo del diagrama funciona y no solo que se dibujó. Segundo, "defendiendo la viabilidad técnica del diseño definitivo": la viabilidad no se argumenta, se constata.

La regla mental útil: el sistema es la respuesta a "¿funciona tu modelo?", no a "¿qué modelaste?".

Sobre la autoría, ten la frase escrita y ensayada antes de la defensa, no la improvises. La posición es sólida: los trailers de coautoría son divulgación honesta y voluntaria, que es literalmente lo que la guía pide, y el estándar de la guía no es "sin IA" sino "documentado, criticado y refinado por el estudiante".
:::

:::aviso Plan B si el docente cuestiona la autoría o el alcance
La propiedad del trabajo no se demuestra con el log de git, se demuestra defendiendo el contenido en vivo. Ofrécele que elija cualquiera de las decisiones de `docs/04` y explícala de memoria con su alternativa descartada y la consecuencia de haber elegido mal. Quien puede explicar por qué la asignación es una clase de asociación y no una N:M simple, o por qué departamento–empleado es agregación y no composición, está demostrando exactamente el dominio que la evaluación quiere medir.

Si considera que implementar fue salirse del alcance, acéptalo sin defenderte y reconduce en una frase: "la unidad pedía modelar y el modelo es el entregable; el sistema fue la forma de comprobar que el modelo se sostenía". Discutir el alcance con quien fija el alcance no tiene retorno.
:::

### 7. Individual contra grupal, y la portada que pide "integrantes"

Tres fuentes apuntan en direcciones distintas. La guía es enfática:

> El proyecto que se desarrollará durante el semestre es de carácter grupal (2 a 3 estudiantes). No obstante, durante la Unidad 1 (Modelado Orientado a Objetos), de forma individual deberás evidenciar tu propio análisis conceptual y diseño de diagrama de clases UML

> cada estudiante deberá entregar de forma personal e independiente su propio diagrama de clases UML y el análisis crítico correspondiente

La plantilla, en cambio, pide en la portada:

> Nombre y apellidos / Nombre de los integrantes del grupo:

Y la sección de entrega vuelve a abrir todo:

> El informe se trabajará de forma individual según las instrucciones dadas por el docente.

Este es el único ítem de la lista que puede escalar de descuento de puntos a problema de integridad académica. Una portada con tres nombres en una evaluación individual es una invitación a que el docente compare informes entre compañeros.

:::clave Cómo conviene resolverlo
Entrega como trabajo individual y déjalo explícito. Elimina el rótulo "Nombre de los integrantes del grupo" y deja un único campo **Estudiante:** con un solo nombre, y debajo una línea **Modalidad: evaluación individual (Unidad 1)**. La plantilla te autoriza a modificarla: dice "puede ser modificado" y la nota interna manda ajustar los apartados según el tipo de informe.

Deja huella personal no replicable en el informe: tus prompts con fecha y herramienta, tu modelo M0 hecho a mano, y las decisiones justificadas con tu voz. Si conversaste el análisis con compañeros, decláralo en una nota al pie. Eso es lo que convierte colaboración en transparencia.
:::

:::aviso Plan B si el docente exige identificar al equipo
No fusiones los dos datos. Pon una línea separada e inequívoca: "Grupo del proyecto semestral (Unidades 2 a 4): [nombres]. Autoría de este informe: individual, [tu nombre]". La desambiguación tiene que quedar por escrito en el documento, no confiada a que el docente recuerde la regla.

Si te cuestiona la similitud con un compañero, la nota metodológica declarada de antemano y el registro cronológico (M0 anterior a los prompts, prompts fechados, delta trazable) es la defensa: documentaste el proceso, no solo el resultado.
:::

### 8. La plantilla tiene 5 apartados y la guía pide 6 bloques

Dos listas de verificación incompatibles. La plantilla fija un índice cerrado:

> I. Introducción / II. Objetivo / III. Desarrollo / IV. Conclusiones / V. Referencias bibliográficas

La guía enumera otra cosa:

> Redactar un informe técnico que incluya: Introducción ... Análisis del problema ... Diseño del sistema ... Uso de herramientas de IA ... Mejoras aplicadas ... Conclusiones

Fíjate en el detalle fino: la guía mete los objetivos **dentro** de la Introducción ("Contextualización del problema abordado y objetivos del proyecto"), mientras la plantilla los saca a una sección propia. Y ninguno de los dos documentos dice cuál manda.

![Los cinco apartados de la plantilla contra los seis bloques de la guía, y cómo encajan uno dentro del otro](diagramas/estructura-informe.svg)

El riesgo es de rotulación, no de contenido: si el evaluador busca en el índice "Uso de herramientas de IA" y solo encuentra "Desarrollo", puede marcar el criterio como no evidenciado aunque el contenido esté adentro.

:::clave Cómo conviene resolverlo
Conserva la carcasa de la plantilla (portada, numeración romana, estilos, pie de página) y abre **III. Desarrollo** en cuatro subtítulos con los nombres **literales** de la guía:

- 3.1 Análisis del problema
- 3.2 Diseño del sistema
- 3.3 Uso de herramientas de IA
- 3.4 Mejoras aplicadas

Configura la tabla de contenidos a dos niveles para que los cuatro aparezcan en el índice. Esos nombres literales funcionan como anclajes para quien corrige con la rúbrica en la mano.

"II. Objetivo" se llena con el objetivo general y los específicos, y la Introducción los anuncia en una línea: así cumples las dos exigencias sin duplicar texto.
:::

:::aviso Plan B si el docente exige los seis apartados de la guía como nivel 1
Promueves los cuatro subtítulos a secciones I a VI, absorbes "Objetivo" dentro de la Introducción y regeneras el índice. Para que ese cambio cueste minutos y no horas, escribe el informe con **estilos nativos de Word** (Título 1 / Título 2), nunca con formato manual: promover o degradar un nivel es entonces un cambio de estilo, no una reescritura.
:::

### 9. El diagrama tiene que ser legible en papel carta con márgenes de 2,5 cm

La plantilla fija el soporte físico:

> Papel tamaño carta. Márgenes estándar (superior e inferior de 2,5 cm. izquierdo y derecho de 2,5 cm).

Eso deja unos 16,6 cm de ancho útil (21,59 cm de carta menos 2,5 cm por lado). La guía, por su parte, evalúa explícitamente la comprensibilidad:

> Elaborar un diagrama de clases mediante notación UML, asegurando una organización clara, coherente y comprensible del modelo.

Tu diagrama de dominio tiene 14 clases y unas 22 relaciones. A 16,6 cm de ancho, los nombres de atributos quedan por debajo de un tamaño legible. Las dos exigencias empujan en sentidos opuestos y ningún documento reconoce el conflicto. Y es un fallo que no se puede compensar en la defensa: si el informe ya se cerró, la lámina ilegible ya se penalizó.

:::clave Cómo conviene resolverlo
Renuncia a la lámina única gigante y publica una jerarquía de vistas, rotulando cada una como "vista parcial del mismo modelo" para que no se lean como tres modelos distintos:

1. **Vista general**, sin atributos ni métodos: solo clases, relaciones y multiplicidades, en una página en orientación horizontal (Word permite una sección apaisada dentro de un documento vertical).
2. **Vistas de detalle por subsistema**, cada una a ancho de página: personas y contratos, organización, proyectos y asignaciones, horas y auditoría.
3. **Una tabla por clase** con nombre, atributos, métodos y responsabilidad, que hace consultable lo que la imagen comprime.

Exporta a PNG o SVG a 300 ppp o más. Regla práctica de verificación: abre el **PDF final al 100% de zoom**, no la imagen ampliada en pantalla. Si no se lee ahí, va partido.

Declara además cuál es EL diagrama de clases final. Que sea el núcleo de once clases —Entidad, Persona, Empleado, las tres subclases de contrato, Departamento, Proyecto, AsignacionProyecto, RegistroTiempo y FabricaEmpleados— porque así contiene los cuatro tipos de relación que enumera la guía y puedes señalarlos uno por uno en la exposición. `FabricaEmpleados` no está de adorno: es la única que aporta la **dependencia** (`FabricaEmpleados ..> Empleado : crea`); sin ella el núcleo cubre solo tres de los cuatro tipos. Ver el punto 14.
:::

:::aviso Plan B si el docente exige una única lámina completa
Mantenla como anexo en página horizontal ampliada, o en dos páginas empalmadas con marcas de unión, y conserva las vistas de detalle en el cuerpo. Para la defensa, lleva la versión vectorial en pantalla con zoom: resuelve la legibilidad sin tocar el informe ya entregado.

Si al revés te pide recortar aún más, el recorte defendible es a seis clases, pero di en voz alta lo que cuesta: se pierde el polimorfismo que la propia guía exige en "Utiliza herencia y polimorfismo de manera efectiva para evitar duplicación de código". Anunciar el costo convierte una concesión en un argumento.
:::

### 10. La defensa oral no tiene formato, duración ni ponderación declarados

La guía anuncia un paso que no existe:

> Con el informe técnico finalizado, en el Paso 6 deberás presentar los resultados del proyecto de forma oral, demostrando dominio técnico y capacidad de comunicación.

La sección III solo contiene los pasos 1 a 4. No se dice si la defensa es individual o grupal, cuánto dura, si hay proyector ni si hay comisión. Al mismo tiempo, **cada uno de los cuatro pasos cierra con una acción evaluable que es oral**, o sea uno de cada cinco indicadores. Y la inasistencia tiene consecuencia declarada:

> Aquellos que no asistan a las fechas de evaluación recibirán una calificación mínima

Un informe excelente con una defensa improvisada pierde alrededor de un quinto de la nota.

:::clave Cómo conviene resolverlo
Asume que se evalúa dentro de la misma nota y acción por acción, no como impresión global. Prepara cuatro bloques de 2 a 3 minutos, uno por paso, con el mismo orden y el mismo vocabulario que usan las viñetas:

1. Cómo seleccionaste las entidades principales y cómo abstracción y encapsulamiento responden al caso.
2. Por qué cada relación estructural es la que es, y cómo atributos y métodos responden a los requerimientos.
3. Qué le corregiste a la IA y con qué criterio técnico.
4. Viabilidad técnica del diseño y postura crítica sobre el uso de IA.

Un guion cronometrado de 8 a 10 minutos y un banco de 15 preguntas probables con su respuesta preparada. Lleva el diagrama final impreso en tamaño carta y verificado como legible.

Hay una ambigüedad derivada que conviene cerrar por duplicado: no está dicho si las acciones redactadas en clave oral se evalúan solo en la defensa o también deben quedar por escrito. Déjalas **por escrito en el informe y úsalas como guion**. Cuesta poco y cubre las dos lecturas.
:::

:::aviso Plan B si la oral resulta ser otra cosa
Si tiene nota aparte, el mismo guion sirve sin cambios. Si es grupal, cada estudiante defiende su propio diagrama: el guion se reparte por pasos pero las decisiones que defiendes son las tuyas, lo que además te protege frente al criterio de individualidad. Si el docente resuelve que es una conversación breve sobre el informe, el guion se convierte en el resumen ejecutivo con el que abres esa conversación. Nada se pierde.
:::

### 11. "El modelo inicial": ¿el tuyo del Paso 2 o el generado por la IA?

El Paso 2 te exige construir un diagrama propio **antes** de tocar la IA, y lo dice sin ambigüedad: "Una vez construido tu modelo, en el Paso 3 deberás contrastarlo con una propuesta generada por una herramienta de IA". Pero el Paso 4 dice:

> Elaborar la versión final del diagrama de clases UML incorporando mejoras estructurales respecto al modelo inicial generado

El participio "generado" apunta al modelo de la IA; "modelo inicial" apunta al tuyo. Y la sección de informe complica más, porque pide solo dos artefactos cuando el proceso produce al menos tres:

> Diseño del sistema: Presentación del modelo inicial y del modelo final.

Esto no es una duda menor de rotulación. Es el eje del riesgo de reprobación: un informe con dos diagramas (IA y final) es indistinguible de "edité lo que me dio la IA", que es justo lo que la guía declara insuficiente.

:::clave Cómo conviene resolverlo
Presenta **cuatro** artefactos rotulados y fechados, y una tabla comparativa:

- **M0**: tu modelo propio del Paso 2, hecho a mano, deliberadamente más simple que el final.
- **M1** y **M2**: las dos iteraciones de IA.
- **MF**: el modelo final.

La tabla de tres columnas (M0 / IA / MF) muestra qué conservaste de tu análisis, qué tomaste de la IA y qué descartaste. Esa tabla cubre a la vez la presentación del modelo inicial y final, el análisis de los elementos del Paso 3 y las mejoras estructurales del Paso 4. Y satisface las dos lecturas de "modelo inicial" sin tener que elegir una.

Para evitar el solapamiento entre la "versión final" que menciona el Paso 3 y la del Paso 4: trata la del Paso 3 como *versión ajustada tras la crítica*, y la del Paso 4 como *versión final validada contra los requerimientos*, donde lo que se agrega es la aplicación explícita de los principios de diseño y la matriz de trazabilidad.
:::

:::aviso Plan B si el docente solo quiere dos diagramas
M0 no molesta: se presenta como "modelo preliminar del análisis conceptual (Paso 2)" dentro de la sección Análisis del problema, y la sección Diseño mantiene el par IA/final que él espera. El tercero pasa a anexo y la tabla comparativa se queda: es la tabla, no los diagramas, la que evidencia las mejoras estructurales.
:::

---

## Riesgo medio-alto

### 12. "Utiliza una base de datos" contra Workers KV

Las Consideraciones Técnicas del enunciado son literales:

> Utiliza una base de datos para almacenar la información del sistema.

> Desarrolla una interfaz de usuario para que los usuarios puedan interactuar con el sistema de manera intuitiva.

Tu sistema usa Workers KV. La discrepancia técnica es discutible y defendible —Workers KV *es* una base de datos, NoSQL de clave-valor—, y sobre todo es irrelevante para esta unidad: un diagrama de clases no dibuja el motor de datos.

El problema serio es otro, y es una sola frase. `docs/04-justificacion-diseno.md` §4.13 afirma:

> **Contexto.** Fue un requisito del encargo desplegar sin base de datos.

El encargo dice exactamente lo contrario. Un docente que compare esa línea con la guía concluye que inventaste una restricción para justificar la pila elegida, y esa sospecha contamina la credibilidad de las otras catorce justificaciones del documento, que son buenas y honestas.

Hay además una tensión menor pero real: incluir clases de persistencia y de interfaz en el diagrama de dominio rompe la separación de capas que el propio Paso 4 premia al pedir cohesión y responsabilidad única. Cumplir una exigencia rompe la otra.

:::clave Cómo conviene resolverlo
Dos movimientos separados.

**Primero, corrige la frase.** La restricción no vino del encargo académico sino del entorno de despliegue: un Worker no es un proceso de larga vida y un pool de conexiones a Postgres no tiene dónde vivir en ese modelo. Ese argumento ya está bien escrito en `docs/08` §1; basta reemplazar "requisito del encargo" por "consecuencia del modelo de ejecución elegido".

**Segundo, en el informe no defiendas KV en absoluto.** La persistencia está fuera del alcance de la Unidad 1. Si el tema aparece, tu carta fuerte es la tabla de `docs/08` §1: enumerar qué garantías de SQL hubo que reponer a mano (`JOIN`, `FOREIGN KEY`, `UNIQUE`, `CHECK`, transacción, índice) demuestra bastante más comprensión del modelo relacional que haber usado MySQL sin pensarlo. Frase útil: "no tener SQL me obligó a saber exactamente qué hace SQL por uno".

Para la tensión de capas: diagrama principal de dominio puro, más un segundo diagrama de paquetes que muestre la abstracción de persistencia (patrón Repositorio) y la frontera de interfaz, con un párrafo que justifique la separación invocando responsabilidad única y cohesión. Así la misma decisión que era un riesgo se convierte en evidencia directa para dos de los tres principios que exige el Paso 4.
:::

:::aviso Plan B si el docente exige base relacional
La conversión ya está a un paso: las colecciones KV son tablas, los atributos `*Id` son claves foráneas, y `Repositorio<T>` es la frontera que permite el cambio sin tocar una regla de negocio. Lleva impreso un esquema DDL de una página derivado del diagrama de clases: cuesta poco y cierra la discusión mostrando que el modelo soporta ambos almacenes.

Si lo exige como entregable, ofrece la migración a una base relacional como compromiso para la Unidad 2 en lugar de discutir la decisión ahora.

Si te pide todo en un solo diagrama, fusiona usando estereotipos UML (`<<repository>>`, `<<boundary>>`, `<<service>>`): la separación queda visible dentro de un único artefacto y el argumento de capas se conserva intacto.
:::

### 13. Qué cuenta como "requerimiento del sistema" en la matriz de trazabilidad

El Paso 4 pide:

> Validar la coherencia del modelo con los requerimientos del sistema, elaborando una matriz de trazabilidad que relacione al menos 3 requerimientos del sistema con las clases correspondientes.

El enunciado enumera diez requisitos con título propio, más cinco consideraciones técnicas. Un mínimo de 3 sobre 15 candidatos invita a cubrir poco, y lo natural es escoger los tres funcionales más fáciles, dejando fuera precisamente los tres requisitos de seguridad que le dan nombre a la asignatura.

Además, la matriz que ya tienes no traza lo que se pide. `docs/01` §1.5 tiene por cabecera "Problema del enunciado | Mecanismo | Dónde", y sus celdas de destino son rutas de código. Ni las filas son los requisitos del enunciado, ni la columna de destino son clases. El contenido está; el etiquetado no coincide.

:::clave Cómo conviene resolverlo
Rehaz la matriz con tres columnas y los **títulos literales** del enunciado como filas, para que el evaluador pueda verificar por coincidencia de texto sin interpretar:

| Requisito (título literal) | Clases UML que lo realizan | Operación que lo cumple |
|---|---|---|
| Registro de Tiempo | RegistroTiempo, AsignacionProyecto, Empleado, Proyecto | `RegistroTiempo.enviar()`, `aprobar()`, `AsignacionProyecto.estabaVigenteEn(fecha)` |

Diez filas, no tres. Y un bloque adicional para las Consideraciones Técnicas, donde la de herencia y polimorfismo se responde con la jerarquía Entidad → Persona → Empleado y sus tres subclases por contrato.

Una advertencia de coherencia: decide la cobertura **antes** de imprimir. Si "Generación de Informes" va a estar en la matriz, la clase `Reporte` tiene que aparecer en algún diagrama presentado, aunque sea como una única caja `<<abstract>>` colgando del núcleo. Trazar hacia una clase que el evaluador no ve en ningún diagrama es peor que no trazarla.
:::

:::aviso Plan B si el docente lee "requerimientos" como los cinco problemas de la empresa
La matriz de `docs/01` §1.5 ya sirve y basta con cambiar la columna "Dónde" de rutas de código a nombres de clase UML. Lleva las dos versiones impresas: ocupan media página cada una y eliminan la discusión en el momento, en vez de obligarte a argumentar cuál interpretación es la correcta.

Si la extensión aprieta, la matriz se colapsa a las tres filas exigidas en el cuerpo y el resto pasa a anexo con referencia cruzada. Cubrir más nunca resta, pero el mínimo tiene que estar visible en el cuerpo.
:::

### 14. "Al menos 3 relaciones" seguidas de una lista de cuatro tipos

El bullet pide un número y a continuación enumera cuatro categorías:

> Determinar al menos 3 relaciones entre las clases del sistema, especificando su tipo y multiplicidad: Asociación. Dependencia. Agregación y/o composición. Generalización (herencia).

Dos ambigüedades encadenadas. Primera: no queda claro si son tres relaciones cualesquiera o una de cada tipo listado. Segunda, y más peligrosa: pide "su tipo y multiplicidad" para todas, pero en UML estándar **la generalización y la dependencia no llevan multiplicidad**. Si la anotas, es un error de notación que un docente de UML detecta al instante. Si no la anotas, parece incumplimiento.

Nota además que en el indicador oral del mismo paso la dependencia desaparece de la lista ("asociación, agregación, composición o herencia"), lo que confirma que la propia guía no tiene el punto resuelto.

:::clave Cómo conviene resolverlo
Cubre los cuatro tipos. Son cuatro líneas de diagrama, no hay razón para arriesgar un indicador completo. La dependencia es la que sistemáticamente se olvida porque no aparece sola en un diagrama de dominio: hay que buscarla. `FabricaEmpleados ..> Empleado : crea` te la resuelve, o un generador de informes que usa una clase como parámetro sin almacenarla.

Entrega una tabla de relaciones con columnas: relación, tipo, multiplicidad, regla del enunciado que la justifica. En las filas de dependencia y generalización escribe explícitamente **"no aplica: la multiplicidad solo se define en asociaciones —agregación y composición incluidas—, porque solo ahí tiene sentido contar cuántas instancias participan; la dependencia es una relación de uso entre clasificadores y la generalización relaciona clasificadores, no objetos"**.

Esa frase es la jugada completa: convierte una posible omisión en evidencia de dominio de la notación, que es exactamente lo que mide el criterio 1.1.2.
:::

:::aviso Plan B si el docente pide multiplicidad en todas
Le muestras la tabla y argumentas desde el estándar UML. Es una discusión que se gana con la notación en la mano y que da puntos de dominio técnico en la oral. Si resulta que solo pedía tres relaciones, te sobra una y no resta nada.
:::

### 15. Si un diagrama Mermaid cuenta como "notación UML"

La guía exige notación UML estándar pero no especifica herramienta ni formato:

> Elaborar un diagrama de clases mediante notación UML, asegurando una organización clara, coherente y comprensible del modelo.

Mermaid `classDiagram` es *UML-like*, no UML canónico. El caso concreto que te afecta: **no dibuja una clase de asociación en su forma estándar** —la línea discontinua desde la clase al centro de la asociación— y esa pieza es justamente la que distingue tu modelo de las propuestas ingenuas. `AsignacionProyecto` es el eje del diagrama, y es la parte que Mermaid no sabe representar.

Riesgo operativo añadido: Mermaid no se renderiza dentro de Word. Pegar el código sin renderizar produce bloques de texto ilegibles y arrastra puntos de forma.

:::clave Cómo conviene resolverlo
Exporta el diagrama **final** desde una herramienta que dibuje correctamente la clase de asociación —PlantUML, StarUML, draw.io— o inserta la imagen y añade a mano la línea discontinua. Los diagramas secundarios pueden seguir siendo Mermaid renderizado a imagen.

Incluye una **leyenda de notación empleada** al lado del diagrama final: qué significa cada flecha, cada rombo, cada `+ - #`. Es media página, se ve profesional, y ancla el criterio 1.1.2 sin que el evaluador tenga que suponer que sabes lo que dibujaste.

Todos los diagramas van pegados como PNG o SVG, verificando que el texto de las cajas se lee impreso. Nunca como bloque de código.
:::

:::aviso Plan B si el docente acepta Mermaid sin objeción
No pierdes nada: la leyenda de notación y las imágenes exportadas siguen siendo mejores para imprimir y para la defensa, donde conviene llevar el diagrama en papel. Si te pregunta por qué la clase de asociación está dibujada así, tienes la respuesta lista, que es más de lo que tendrías si no lo hubieras pensado.
:::

### 16. La asignatura es POO **Seguro** y falta la teoría de seguridad

Tres de los diez requisitos del enunciado son de seguridad, y dos de ellos contienen una trampa terminológica:

> Implemente un sistema de autenticación robusto con contraseñas seguras y que asegure que los usuarios solo tengan acceso a los módulos del sistema para las que están autorizados.

> Almacena datos personales de empleados de forma segura utilizando técnicas de cifrado adecuadas y sigue las regulaciones de privacidad de datos aplicables.

La guía dice "cifrado" en una línea y "contraseñas seguras" en otra. Modelar una contraseña **cifrada** —o sea reversible— en vez de **hasheada** es un error grave en esta asignatura, y un docente de POO Seguro lo detecta en tres segundos mirando el diagrama. Son dos mecanismos distintos para dos problemas distintos: hash no reversible para autenticar, cifrado reversible para proteger datos personales que hay que poder leer después.

El segundo hueco: la guía dice "regulaciones de privacidad de datos aplicables", y `grep` sobre `docs/` no devuelve ni una mención a la normativa chilena.

:::clave Cómo conviene resolverlo
En el diagrama, atributos `hashContrasena` y `salContrasena`, nunca `contrasena`, con una nota UML: "derivación PBKDF2 o Argon2, no reversible". Y aparte, el sobre cifrado para los datos personales, ese sí reversible, con AES-GCM. Que la diferencia sea visible en la lámina, no solo en el texto.

En el informe, un párrafo que nombre la Ley 19.628 sobre protección de la vida privada y la Ley 21.719 que la reemplaza, y que derive de ellas **requisitos de modelado concretos**: minimización de datos, limitación de finalidad, y una clase `RegistroAuditoria` para la trazabilidad. La gracia no es citar la ley, es mostrar qué clase existe *porque* la ley existe.

Verifica las fechas de vigencia antes de citarlas. Es barato de cerrar y casi nadie del curso lo hará: es un diferenciador claro.
:::

:::aviso Plan B si el docente no espera contenido legal
El párrafo no estorba y refuerza el criterio "Seguro" del nombre de la asignatura. Si te pregunta por normativa internacional, menciona el GDPR como referencia comparada, nunca como norma aplicable en Chile.
:::

---

## Riesgo medio

### 17. La plantilla es "opcional", nadie la personalizó, y es la única fuente de las reglas de forma

Tres capas de opcionalidad apiladas. La guía la desactiva:

> Plantilla informe (opcional)

La plantilla se desactiva a sí misma:

> Considere como guía el presente documento, y los siguientes elementos (puede ser modificado)

Y contiene una instrucción dirigida al docente, no a ti, que declara que la versión que tienes en la mano no es la final:

> NOTA: Cada docente DEBE modificar, ajustar o completar los apartados del informe según las características o tipo de informe.

Pero todas las reglas duras de presentación —papel, márgenes, fuente, tamaños de título, interlineado, norma de citación— viven exclusivamente en ese documento declarado prescindible. La guía, por su cuenta, solo exige "portada, índice, numeración, referencias si aplica". Si lees "opcional" como "no hay reglas", pierdes por decisión propia un criterio que casi toda rúbrica de informe INACAP incluye.

Hay un detalle operativo asociado. La plantilla asume un índice vivo:

> Una vez finalizado el informe, actualiza esta tabla de contenidos, ubicando el mouse sobre ella, y pulsando el botón derecho del mouse.

Y su índice de ejemplo trae las cinco entradas en la página 3, que es exactamente lo que quedará impreso si nadie lo actualiza. Un índice con todo en la página 3 es la señal más visible de plantilla no trabajada.

:::clave Cómo conviene resolverlo
Lee la opcionalidad con alcance limitado: es opcional el **esqueleto** (que ya resolviste a favor de la guía en el punto 8), pero no las **normas de presentación**, porque son las únicas que existen y cumplirlas es gratis. Papel carta, márgenes de 2,5 cm en los cuatro lados, justificado, Arial o Calibri, títulos 14 en negrita, subtítulos 12 en negrita, texto 11 normal.

Antes de maquetar nada, revisa la sección de la asignatura en el AAI —no solo la tarea: también Recursos y anuncios— buscando una plantilla ajustada con fecha posterior. Si no aparece, pregunta por escrito y deja constancia.

**Entrega PDF.** Fija fuentes, imágenes y saltos de página, y garantiza que el docente vea exactamente lo que enviaste. Genéralo desde Word con estilos nativos, con el índice como campo actualizado en su totalidad y verificado página por página. Revisa el PDF exportado, no el Word: el PDF es lo que se corrige.

Un detalle que delata: la plantilla pide interlineado sencillo en los párrafos y doble en el ejemplo de referencias. No es contradicción, es la convención APA. Sencillo en el cuerpo, doble con sangría francesa solo en Referencias.
:::

:::aviso Plan B si aparece una plantilla ajustada a última hora
Lo único que debe cambiar es la maqueta. Para asegurarlo, escribe el informe con estilos nativos y las figuras como archivos independientes enlazados, de modo que trasplantarlo sea copiar y pegar con "combinar formato de destino". Nunca incrustes contenido dentro de los cuadros de texto de la portada ni dependas de posiciones absolutas.

Si el docente responde "la plantilla no importa, entrega como quieras", no rehaces nada: ya cumples, y lo defiendes diciendo que adoptaste el estándar institucional. El plan B inverso no existe: un informe entregado con formato libre no se puede reformatear después del bloqueo del AAI. Por eso la asimetría manda cumplir siempre.
:::

### 18. APA 6, "referencias si aplica", y cómo se cita una IA

La plantilla exige una norma concreta y anticuada:

> Para realizar un listado de las fuentes bibliográficas utilizadas para la recopilación de información, con el título "Referencias bibliográficas", según Norma APA 6° Edición

Y da un ejemplo coherente con ella: "México: Pearson Educación", "Recuperado de". Pero la propia guía, en su bibliografía, cita en otro estilo: sin ciudad y con marcador de edición en inglés ("(1st ed.). Ra-Ma."). O sea, el documento que exige la norma no la aplica.

Hay una tercera capa, y es la que importa: la evaluación te obliga a documentar el uso de una herramienta de IA, y APA 6 —que es de 2009— no tiene entrada canónica para IA generativa. Y una cuarta: la guía relativiza con un "referencias si aplica" que la plantilla no admite, porque para ella Referencias es una sección del índice.

:::clave Cómo conviene resolverlo
Aplica APA 6 estricto, porque es la única norma nombrada y la plantilla es la fuente de forma: sangría francesa, interlineado doble solo en esa sección, formato "Ciudad: Editorial", "Recuperado de".

Incluye como mínimo los dos textos de la guía reformateados a APA 6 —agregando la ciudad que la guía omitió— más una o dos fuentes propias de UML o POO.

Para la IA, no fuerces una entrada bibliográfica dudosa. Documéntala **dentro de la sección de uso de IA** con herramienta, versión y fecha de consulta, y agrega en Referencias una entrada de software con ese mismo dato. Así cumples la trazabilidad que exige la guía sin inventar una norma que APA 6 no tiene.

No citar la herramienta de IA en un trabajo cuyo eje declarado es el uso crítico de IA es una incoherencia visible que un evaluador atento subraya.
:::

:::aviso Plan B si el docente pide APA 7
La conversión es mecánica y toma minutos: quitar la ciudad de la editorial, reemplazar "Recuperado de" por el enlace directo (o el DOI cuando exista) y listar hasta 20 autores donde APA 6 admitía 7. Mantén las referencias en una lista aparte del documento fuente para reconvertirlas de una pasada.
:::

---

## Las cinco preguntas que valen un correo

Cinco de las dieciocho ambigüedades se cierran solas si preguntas. Manda un correo esta semana, no la semana de entrega, y guarda la respuesta.

1. **¿Dónde está la Rúbrica N°1?** Si no está publicada, pídela. Es el instrumento que asigna la nota.
2. **¿La defensa oral es individual o grupal, cuánto dura y qué fecha tiene?** La guía anuncia un "Paso 6" que no existe y no declara nada de esto.
3. **¿La portada lleva integrantes del grupo o solo mi nombre?** La guía dice individual y la plantilla pide integrantes.
4. **¿Hay una plantilla ajustada para la sección?** La plantilla genérica dice que el docente DEBE modificarla, y la que tienes no está modificada.
5. **¿Se entrega solo el informe o también el código?** La respuesta más probable es solo el informe, pero cuesta una línea preguntarlo.

:::nota Sobre las respuestas modelo de esta guía
Todo lo que aparece aquí como "cómo conviene resolverlo" es una lectura razonada de dos documentos que se contradicen, no una verdad revelada ni un texto para pegar en tu informe. La forma y el nivel son lo que tienes que aprender de estos ejemplos; el contenido lo tienes que rehacer con tu propio análisis y tus propias palabras.

Hay una razón práctica además de la razón académica: la defensa oral existe precisamente para verificar eso. Si entregas un argumento que no entendiste, la primera repregunta lo desarma. Si lo entendiste, cualquier repregunta te suma.
:::

Con las ambigüedades cerradas, el siguiente paso es construir el modelo que va a soportar todo el informe: [Paso 2](04-paso-2-modelo-uml.html).
