# La defensa oral

Todo lo demás de esta evaluación se entrega en un archivo y se corrige en diferido. Esto no. La defensa oral es el único momento en que alguien comprueba si el informe que subiste lo entiendes tú, y es también el único que no admite corrección posterior: lo que no sepas responder a las 10:40 de la mañana no se puede arreglar a las 10:41.

Este documento trae tres cosas: la prueba de que lo oral no es un trámite añadido al final, un guion con tiempos para 10-12 minutos, y las 22 preguntas que caen con más probabilidad, cada una con una respuesta sólida y con la respuesta que suena bien y hunde.

---

## No es un trámite: hay una acción oral en cada paso

La guía no pone "presentación" como una actividad separada al final. Mete una viñeta oral **dentro de cada uno de los cuatro pasos**, como última acción del criterio correspondiente. Es decir: cada criterio de evaluación —1.1.1, 1.1.2, 1.1.3, 1.1.4— tiene una parte escrita y una parte hablada, y la parte hablada está redactada con el mismo nivel de exigencia que la escrita.

Las cuatro, textuales:

> **Paso 1 (1.1.1).** Expone oralmente, utilizando vocabulario técnico preciso, el análisis conceptual del problema, justificando de forma clara cómo se seleccionaron las entidades principales y cómo los pilares fundamentales de la POO (abstracción, encapsulamiento) dan respuesta a las necesidades del caso planteado.

> **Paso 2 (1.1.2).** Explica de manera lógica y fluida la arquitectura del diagrama de clases UML proyectado, sustentando verbalmente la elección y el propósito de las relaciones estructurales (asociación, agregación, composición o herencia) y la consistencia de los atributos y métodos frente a los requerimientos del sistema.

> **Paso 3 (1.1.3).** Expone mediante argumentos técnicos las modificaciones, correcciones y adaptaciones aplicadas sobre el modelo inicial sugerido por la Inteligencia Artificial, demostrando criterio propio y dominio de buenas prácticas de modelado orientado a objetos.

> **Paso 4 (1.1.4).** Concluye la presentación defendiendo la viabilidad técnica del diseño definitivo en Python, respondiendo con seguridad y fundamentos sólidos a las preguntas del docente o comisión, y evidenciando una postura crítica y estructurada sobre el uso de herramientas de IA en el desarrollo de software.

El Paso 4 aporta además una quinta viñeta que también se cumple hablando:

> Fundamentar las decisiones de diseño del diagrama de clases UML utilizando criterios técnicos y presentando el modelo de forma clara, técnica y estructurada.

![Los cuatro pasos de la evaluación, la sección del informe donde aterriza cada uno, y la defensa oral que atraviesa los cuatro](diagramas/mapa-evaluacion.svg)

:::clave Lo que se evalúa aquí
Siete exigencias orales salen de esas viñetas. Conviene leerlas como filas de rúbrica, porque están redactadas como tales:

| # | Exigencia | De dónde sale |
|:--:|---|---|
| 1 | Justificar **cómo** seleccionaste las entidades: por qué esas y no otras | Paso 1 |
| 2 | Explicar cómo abstracción y encapsulamiento responden a los síntomas del caso | Paso 1 |
| 3 | Sustentar **cada** relación estructural y sus multiplicidades, y la consistencia de los atributos y métodos frente a los requerimientos, recorriendo el diagrama sin leerlo | Paso 2 |
| 4 | Nombrar de memoria los errores de la IA, clasificarlos y explicar la corrección | Paso 3 |
| 5 | Presentar los principios de diseño aplicados y la matriz de trazabilidad | Paso 4 |
| 6 | Defender la viabilidad técnica **en Python** y sostener una postura crítica sobre la IA | Paso 4 |
| 7 | Responder las preguntas de la comisión con fundamentos | Paso 4 |

Fíjate en el verbo de la tercera: *sustentando verbalmente*. No dice "el diagrama debe mostrar", dice que tú debes sostenerlo hablando. Un diagrama impecable que no puedes recorrer sin leer no cumple esa viñeta.
:::

:::aviso La octava exigencia, que no es técnica
Hay una condición transversal que ningún estudio compensa: **estar ahí**.

> Aquellos que no asistan a las fechas de evaluación recibirán una calificación mínima, a menos que justifiquen su ausencia de acuerdo con los protocolos establecidos en el Reglamento Académico. Es necesario que informen oportunamente al docente a través de correo electrónico para validar su situación.

Nota mínima por defecto, y la justificación es *previa y por correo*, no una explicación al día siguiente. Si tienes un problema real, el correo sale antes de la hora de la evaluación.
:::

:::ambiguedad La guía no dice cuánto dura ni con qué apoyo
No hay duración estipulada, no se dice si es individual ante el docente o ante una comisión —la viñeta del Paso 4 menciona *"el docente o comisión"*, con lo que ambas son posibles—, y no se exige ni se prohíbe usar diapositivas.

Este guion asume **10-12 minutos de exposición más preguntas**, que es el rango habitual para una ES de 15%. Pregúntaselo al docente en clases: es una pregunta legítima y la respuesta cambia el guion entero. Si te dan cinco minutos, el guion tiene abajo su versión recortada; si te dan veinte, cada tramo se estira, pero **el orden no cambia**.
:::

---

## El guion: 10-12 minutos

La estructura no es libre. Sigue los cuatro pasos porque el docente corrige con la rúbrica al lado y la rúbrica va por criterios: si expones en otro orden, tiene que ir reconstruyendo a qué criterio corresponde cada cosa que dices. Hazle el trabajo fácil.

| Tramo | Minutos | Contenido | Criterio |
|:--:|:--:|---|:--:|
| 0 | 0:00–0:40 | Apertura y mapa de la exposición | — |
| 1 | 0:40–2:30 | Entidades: el criterio, las que quedaron y las que descarté | 1.1.1 |
| 2 | 2:30–3:30 | Abstracción y encapsulamiento contra los síntomas del caso | 1.1.1 |
| 3 | 3:30–6:00 | Recorrido del diagrama: clases, relaciones, multiplicidades | 1.1.2 |
| 4 | 6:00–8:00 | La IA: qué propuso, qué falló, un error contado entero | 1.1.3 |
| 5 | 8:00–9:30 | Modelo final: principios de diseño y matriz de trazabilidad | 1.1.4 |
| 6 | 9:30–11:00 | Cierre: viabilidad en Python y postura sobre la IA | 1.1.4 |
| 7 | 11:00 en adelante | Preguntas | 1.1.4 |

#### Tramo 0 — Apertura (40 segundos)

Nombre, el caso, y **el mapa en una frase**: "voy a recorrer cuatro cosas: cómo elegí las entidades, cómo quedó el diagrama y por qué cada relación es la que es, qué me propuso la IA y qué le corregí, y cómo el modelo final se traduce a Python". Ese anuncio hace dos cosas: le dice al evaluador dónde marcar cada criterio, y te ordena a ti si te pones nervioso.

No cuentes la historia de la empresa. El docente escribió el enunciado. Resumir EcoTech es el modo más rápido de gastar dos minutos en algo que no evalúa ninguna viñeta.

#### Tramo 1 — Entidades (1 minuto 50)

Empieza por el **criterio**, no por la lista. "Apliqué dos pruebas a cada candidato: identidad propia y ciclo de vida." Después la lista, rápido. Y después lo que de verdad distingue esta parte: **dos o tres descartes con su razón**. Gerente no es entidad, es un rol. `DatosSensibles` no tiene identidad fuera de su titular. Una clase `Sistema` sería una clase-dios.

Los descartes valen más que las inclusiones porque cualquiera acierta con "empleado, departamento, proyecto"; solo quien tuvo criterio puede decir qué dejó fuera.

#### Tramo 2 — Los pilares contra los síntomas (1 minuto)

La viñeta pide que los pilares *"den respuesta a las necesidades del caso planteado"*. Es decir: no definas abstracción, **úsala contra un síntoma del enunciado**. Un síntoma, un pilar, un mecanismo, en tres frases:

- Duplicidad de información → identidad única y el vínculo guardado en un solo lado, así el estado ilegal no es representable.
- Falta de trazabilidad en las horas → encapsulamiento: `RegistroTiempo` no tiene `setEstado`, tiene `aprobar()`, que valida y deja rastro.
- Riesgos en la seguridad de los datos personales → abstracción: `Persona` concentra el bloque cifrado, y ninguna subclase puede declarar datos personales sin pasar por ese mecanismo.

#### Tramo 3 — El diagrama (2 minutos 30)

Es el tramo más largo y el que más se improvisa mal. Recórrelo en este orden, siempre el mismo:

1. Las clases, agrupadas por qué representan, no una por una.
2. La jerarquía: qué eje elegiste para heredar y por qué ese eje.
3. Las relaciones, **una por una**, y de cada una: tipo, multiplicidad, y la regla de negocio que afirma.
4. Dos o tres atributos y métodos amarrados al requisito que los exige. La viñeta del Paso 2 pide también la *"consistencia de los atributos y métodos frente a los requerimientos del sistema"*, y es la mitad que casi nadie dice en voz alta: basta con "`RegistroTiempo` tiene `fecha`, `horas` y `descripcion` porque el requisito de Registro de Tiempo pide esos tres, y `aprobar()` porque el enunciado exige trazabilidad".
5. Un punto donde el polimorfismo hace trabajo real, nombrando el llamador.

La regla de oro de este tramo: **de cada relación di qué prohíbe**. "Departamento a Empleado es agregación 0..1 a 0..*: agregación porque disolver un área reasigna gente, no la elimina; y 0..1 porque un recién ingresado puede no tener área todavía." Eso son doce segundos y cubre tipo, multiplicidad y justificación.

#### Tramo 4 — La IA (2 minutos)

Tres movimientos, en este orden:

1. **Qué le pediste**, en una frase por iteración: el prompt uno con el enunciado, el dos con la instrucción de formato y las correcciones.
2. **El catálogo**, en números y por aspecto: cuántos hallazgos en clases, cuántos en atributos, cuántos en relaciones.
3. **Un error contado entero**: cuál era, cómo lo detectaste, qué se rompía, qué pusiste en su lugar. Uno solo, completo. Enumerar diez por encima vale menos que uno con su método de detección.

![El ciclo del Paso 3: analizar, generar, contrastar, corregir](diagramas/ciclo-ia.svg)

#### Tramo 5 — Principios y trazabilidad (1 minuto 30)

Los tres principios **con la clase donde se ven**, no sueltos: "responsabilidad única en los servicios, y se nota en que `ServicioAsignaciones` no sabe calcular remuneraciones". Después la matriz: no la leas fila por fila, di cuántos requisitos trazaste y ofrece recorrer el que quieran. Casi siempre eligen uno, y ese recorrido es el Tramo 5 real.

#### Tramo 6 — Cierre (1 minuto 30)

Dos partes obligatorias, porque las dos están en la viñeta.

Primero, **viabilidad en Python**: la tabla de correspondencias en cuatro líneas —clases abstractas con `abc.ABC` y `@abstractmethod`, encapsulamiento con guion bajo y `property` de solo lectura, polimorfismo por sobrescritura, enumerados con `Enum`— y la frase que sostiene todo: un diagrama de clases es independiente del lenguaje, y aquí está el mismo modelo ejecutándose en Python.

Segundo, **la postura sobre la IA en 30 segundos**. No es un adorno: la viñeta pide *"evidenciando una postura crítica y estructurada sobre el uso de herramientas de IA en el desarrollo de software"*. Ten una posición formulada, con su límite. Por ejemplo: la herramienta es buena generando candidatos y pésima decidiendo, porque no tiene acceso al dominio ni consecuencias por equivocarse; por eso sirve como material a criticar y no como resultado, y por eso documenté el prompt junto al error que produjo.

:::aviso Si te dan cinco minutos
Recorta así, en este orden: elimina el Tramo 2 —los pilares se ven igual dentro del recorrido del diagrama—, baja el Tramo 1 a treinta segundos quedándote con el criterio y **un** descarte, y baja el Tramo 4 a un solo error contado entero sin el catálogo.

Lo que **no** se recorta nunca: el recorrido de las relaciones (Tramo 3) y el cierre en Python (Tramo 6). El primero es el criterio 1.1.2 completo; el segundo está pedido con esas palabras en la guía y es lo último que se escucha.
:::

:::trampa Leer las diapositivas
La viñeta del Paso 2 dice *"de manera lógica y fluida"* y *"sustentando verbalmente"*. Leer es la forma más rápida de incumplir las dos. Si usas apoyo visual, que sea el diagrama y las tablas: cosas que se miran, no que se leen. Un texto en pantalla que repite lo que dices te obliga a competir contigo mismo por la atención del evaluador.
:::

---

## Las 22 preguntas

:::aviso Cómo usar esta sección
Las respuestas que siguen son **ejemplos trabajados**: muestran la forma de una respuesta sólida —criterio primero, consecuencia observable después, contrapartida asumida al final— y el nivel de precisión que se espera. Están construidas sobre las decisiones del modelo que vive en este repositorio.

Si tu modelo decidió otra cosa, **tu respuesta es otra**, y esa es la respuesta correcta para ti. Memorizar estas te deja indefenso justo donde importa: las preguntas 11 y 22 existen precisamente para detectar a quien aprendió respuestas en vez de criterios, y las dos se responden razonando en vivo sobre un modelo alternativo que nadie preparó.

Los números concretos que aparecen —25 errores catalogados, tres propuestas de IA, 80 pruebas— son de este repositorio. Di los tuyos.
:::

Están agrupadas por tema. Si tienes poco tiempo, las tres que caen casi siempre son la 6 (agregación contra composición), la 13 (por qué herencia y no un atributo) y la 15 (un error concreto de la IA).

### Modelado y análisis conceptual

**1. ¿Qué entidades identificaste y con qué criterio decidiste que eran entidades y no otra cosa?**

*Por qué te la hacen.* Es la apertura casi obligada, y en diez segundos revela si hubo un criterio o si subrayaste los sustantivos del enunciado. Además abre el resto de la defensa: con un criterio sólido, todas las preguntas siguientes se responden desde ahí.

Apliqué dos pruebas a cada candidato: identidad propia —dos objetos con los mismos valores no son el mismo objeto— y ciclo de vida —nace, cambia, termina—. Con eso quedaron `Persona`, `Empleado` y sus tres subclases por contrato, `Departamento`, `Proyecto`, `AsignacionProyecto`, `RegistroTiempo`, `Usuario` y `RegistroAuditoria`. Tanto o más importante es lo que descarté y por qué: `Gerente` no es entidad sino un rol que se ocupa y se deja, y lo modelé como la asociación `Departamento.gerenteId` hacia `Empleado`; `Rol` y `Permiso` son un conjunto cerrado de valores, no cosas con ciclo de vida, así que son enumerados y una matriz inmutable en `PoliticaAutorizacion`; `DatosSensibles` es un objeto de valor, no tiene identidad fuera de la persona que lo posee; y una clase `Sistema` o `GestorGeneral` sería una clase-dios, no una entidad del dominio. La entidad que no aparece en un primer modelado y que sostiene medio sistema es `AsignacionProyecto`, porque el vínculo empleado-proyecto tiene datos propios.

:::trampa «Las entidades son las que dice el enunciado: empleado, departamento, proyecto y registro de tiempo»
Suena correcto porque la lista coincide, pero es la respuesta de quien subrayó sustantivos: no ofrece criterio, no distingue entidad de objeto de valor ni de enumerado, y te deja sin defensa cuando venga la repregunta de por qué `Gerente` no está o por qué `DatosSensibles` no es una clase con identidad.
:::

**2. ¿Cómo aplicaste el encapsulamiento? ¿Es poner los atributos privados y exponer getters y setters?**

*Por qué te la hacen.* El anzuelo es deliberado: la definición de manual es exactamente el modelo anémico. Si lo criticaste en tu informe y luego lo repites hablando, la incoherencia es evidente.

No, y ese es precisamente el error B1 que catalogué en una de las propuestas generadas por IA: un setter público por cada atributo privado deja la clase igual de expuesta, solo que con el triple de código; `setSalario(-100)` sigue siendo posible. El criterio que apliqué es que el estado interno solo cambia mediante operaciones con nombre de negocio. El ejemplo concreto está en `RegistroTiempo`: no existe `setEstado` ni `setAprobadoPor`; existe `aprobar(idAprobador)`, que comprueba que el registro esté en `ENVIADO`, rechaza que alguien apruebe sus propias horas por separación de funciones, y deja el objeto en un estado coherente en un solo paso. Con setters sueltos, cualquiera de esas tres garantías se pierde en cuanto un llamador olvida una línea. El caso más fuerte es `Usuario`: el hash y la sal de la contraseña son privados y no tienen getter; la única vía es `credencialesParaVerificar()`, que se expone como método justamente para que todo uso sea visible en una búsqueda del código. Reconozco un límite: en TypeScript `private` se aplica en compilación, no hay barrera en tiempo de ejecución; el encapsulamiento descansa en el compilador, en la revisión y sobre todo en que no hay setters genéricos que saltarse.

:::trampa «Sí, encapsulé todo: los atributos son privados y accedo por getters y setters»
Es la respuesta más común y suena a libro de texto, pero describe un modelo de dominio anémico: los datos en una clase y las reglas en otra parte donde nadie las protege. Si tu informe critica esa misma práctica en la propuesta de la IA, te estás contradiciendo en voz alta delante del docente.
:::

**3. El enunciado dice que cada empleado tendrá nombre, dirección, teléfono, correo, fecha de inicio y salario. ¿Por qué el salario no está en la clase `Empleado`?**

*Por qué te la hacen.* Es la pregunta de "por qué ese atributo está en esa clase y no en otra", y aquí el docente tiene ventaja: el requisito literal contradice al modelo. Quiere ver si detectaste la contradicción del enunciado o si moviste el atributo por comodidad.

Porque el enunciado se contradice: en el mismo texto dice que el empleado tiene salario y pide registrar horas trabajadas, y quien cobra por hora no tiene salario. El criterio que apliqué es que un atributo sube al nivel de la jerarquía donde la regla que lo gobierna es la misma para todos los descendientes. Lo común entre las tres modalidades no es el dato, es la pregunta: cuánto se le paga a esta persona este mes. Por eso `Empleado` declara abstracto `calcularRemuneracionMensual(horas)`, y cada subclase aporta sus propios parámetros: `salarioMensual` en `EmpleadoAsalariado`, `tarifaHora` en `EmpleadoPorHoras`, y `tarifaHora` más `topeMensual` en `Contratista`. Si subiera un campo `salario` a `Empleado` tendría campos nulos por diseño en dos de las tres subclases, invariantes que no puedo verificar en la clase base, y el switch reapareciendo en la nómina. Las tres propuestas generadas por IA pusieron `salario` en `Empleado` y ninguna se preguntó qué pasa con quien cobra por hora: la contradicción está en el texto y hay que salir del texto para verla, que es justo lo que la herramienta no hace.

:::trampa «Puse salario en Empleado porque el enunciado lo pide, y en las subclases lo sobrescribo»
Suena obediente y conciliador, pero es lo peor de las dos opciones: mantiene un campo que dos de las tres subclases no pueden llenar con sentido y obliga a decidir en tiempo de ejecución cuál valor manda. Delata que tratas el enunciado como especificación literal en vez de como material a interrogar, que es exactamente el patrón de fallo que documentaste en la IA.
:::

**4. ¿Por qué no hay una clase `Sistema` o `GestorGeneral` que coordine todo el modelo?**

*Por qué te la hacen.* Es el antipatrón más frecuente en los diagramas generados automáticamente. Si lo evitaste, quieren saber si fue por criterio o por casualidad, y si sabes nombrar el principio que se violaría.

Porque sería una clase-dios y es el error B2 que catalogué en la segunda propuesta generada. Esa clase concentraba alta de personal, asignaciones, cálculo de haberes, generación de informes, exportación y autenticación: viola la responsabilidad única de forma tan amplia que el archivo crece sin límite y cualquier cambio lo toca. El efecto de fondo es peor que el tamaño: los métodos que concentra pertenecen a otras clases, así que las demás quedan reducidas a estructuras de datos con getters y setters, y el resultado es programación procedural con sintaxis de objetos. En mi modelo la coordinación está repartida en servicios de aplicación con una responsabilidad cada uno —`ServicioEmpleados`, `ServicioAsignaciones`, `ServicioRegistrosTiempo`—, y cada uno declara sus dependencias de forma explícita. Las reglas que pertenecen a una sola entidad viven dentro de esa entidad, como `aprobar` en `RegistroTiempo`; los servicios solo cargan lo que necesita mirar más de un agregado, como que la suma de dedicaciones no pase del 100 por ciento.

:::trampa «Porque no era necesaria» o «porque uso servicios en vez de una clase central»
Nombra la alternativa sin la consecuencia, así que no demuestra criterio: es la respuesta de quien no la puso porque no se le ocurrió. Si repreguntan qué principio se estaría violando y qué se observa cuando el sistema crece, la respuesta se agota en dos frases.
:::

**5. `Persona` tiene una sola subclase, `Empleado`. ¿No es una abstracción especulativa que sobra?**

*Por qué te la hacen.* Es una trampa amable: la respuesta obvia es la equivocada. Un nivel de herencia con un único descendiente suele ser abstracción prematura, y quieren ver si modelas por criterio o por simetría.

Es una objeción legítima y la contesto con el criterio, no con el futuro. No introduje `Persona` para prever subclases, sino para separar dos conjuntos de reglas que hoy ya son distintos. Lo que hace de alguien una persona —identidad, contacto, domicilio, documento— está sujeto a normativa de datos personales: se cifra en reposo, se enmascara según permiso y su acceso se audita. Lo que hace de alguien un empleado —legajo, fecha de contrato, remuneración, departamento— es información laboral, con otro ciclo de vida y otras reglas de acceso. Concentrar en `Persona` el bloque `datosSensibles` como sobre cifrado y los índices ciegos HMAC sobre documento y correo personal hace que la protección venga heredada y no repetida: una subclase futura no puede olvidarse de proteger esos datos, porque no tiene forma de declararlos sin pasar por el mecanismo. El criterio general es que una abstracción se justifica cuando agrupa un conjunto coherente de reglas, no cuando anticipa clases hipotéticas. Se lo digo al revés para que se vea que el criterio es operativo: si `Persona` solo tuviera nombre y apellido, sobraría y la habría eliminado.

:::trampa «La puse por si en el futuro hay clientes, proveedores o postulantes»
Es la respuesta intuitiva y es exactamente la abstracción especulativa que la pregunta busca castigar: justifica una clase con un requisito que nadie pidió. Además contradice el resto del informe, donde descartas entidades como `Rol` o `Gerente` por no tener ciclo de vida propio. Si el criterio es la necesidad presente, no puedes invocar el futuro cuando te conviene.
:::

### Relaciones y multiplicidades

![La diferencia decisiva: agregación contra composición](diagramas/agregacion-vs-composicion.svg)

**6. La relación entre `Departamento` y `Empleado`: ¿por qué la modelaste como agregación y no como composición?**

*Por qué te la hacen.* Es el error de modelado más frecuente y el que la rúbrica del Paso 2 apunta directamente. El rombo relleno se dibuja más y aparece por inercia; quieren ver si tienes una prueba operacional o solo una definición memorizada.

Porque la prueba que distingue una de otra es qué pasa al eliminar el contenedor. La composición, rombo relleno, significa dependencia existencial y borrado en cascada: la parte no existe fuera del todo y muere con él. Aplicado aquí, disolver el departamento de Ventas eliminaría a los vendedores, lo que es falso en cualquier empresa: disolver un área reasigna a la gente. Por eso agregación, rombo hueco, con multiplicidad `0..1` del lado del departamento, no `1`, porque un empleado recién ingresado o en tránsito puede no tener área asignada. Este es el error A4 de la propuesta A generada por IA: puso composición con multiplicidad `1`, es decir, declaró dos reglas de negocio falsas en una sola línea. Y quiero ser explícito con el criterio, porque lo aplico también en contra mía: `Empleado` hacia `RegistroTiempo` es conceptualmente más cercano a la composición y aun así lo dejé en agregación, por la razón que explico si me lo pregunta.

:::trampa «La agregación es un "tiene un" débil y la composición un "tiene un" fuerte»
Es una definición correcta y puramente léxica: no dice qué observas distinto en el sistema según cuál elijas. Quien responde así no puede defender después la multiplicidad `0..1` ni contestar la pregunta que viene enseguida sobre qué ocurre al eliminar un departamento.
:::

**7. ¿Qué pasa exactamente en tu sistema si elimino un departamento que tiene empleados asignados?**

*Por qué te la hacen.* Es la pregunta de verificación: convierte la elección de rombo en una consecuencia observable. Busca la incoherencia clásica de que el diagrama diga agregación y tú describas una cascada.

No hay borrado en cascada, y tampoco quedan empleados huérfanos: la operación se rechaza. `ServicioDepartamentos.eliminar` cuenta los empleados activos cuyo `departamentoId` apunta a ese departamento; si hay al menos uno lanza un `ErrorReglaNegocio`, HTTP 422, con el mensaje de que hay que reasignar a esas personas antes de dar de baja el área. Reasignar gente es una decisión de RRHH, no un efecto colateral de un clic en "eliminar". Cuando ya no queda nadie activo, la baja es lógica: `departamento.desactivar()` marca `activo` en falso y se guarda un asiento `DEPARTAMENTO_DESACTIVADO` en la auditoría. No se borra físicamente porque los proyectos y las horas de períodos ya cerrados siguen apuntando a ese identificador y necesitan poder resolverlo para mostrarse; si desapareciera, informes ya emitidos cambiarían retroactivamente. Y esto es exactamente lo que anticipa el diagrama: el rombo hueco dice que la parte sobrevive al todo, y el `0..1` dice que un empleado puede quedar temporalmente sin área.

:::trampa «Los empleados quedan con el departamento en null» o «eso ya depende de cómo se implemente»
La primera suena razonable pero es una pérdida silenciosa de información organizativa que descuadra los informes por departamento sin que nadie lo haya decidido. La segunda delata el malentendido de fondo: el tipo de relación y la multiplicidad **son** la especificación de esa conducta, y si no puedes derivarla de tu propio diagrama, es que copiaste los símbolos.
:::

**8. ¿Qué es una clase de asociación y por qué `AsignacionProyecto` tiene que serlo?**

*Por qué te la hacen.* Es notación UML avanzada que la mayoría no incluye. Si aparece en tu diagrama, te la preguntan sí o sí: o es la mejor decisión del modelo, o es un elemento copiado que no sabes justificar.

Una clase de asociación es una clase que refina una asociación, normalmente muchos a muchos, cuando el vínculo en sí tiene atributos o comportamiento que no pertenecen a ninguno de los dos extremos. Aquí `Empleado` y `Proyecto` son muchos a muchos, y la relación carga cuatro datos: con qué rol participa la persona en ese proyecto, qué porcentaje de su jornada le dedica, desde cuándo y hasta cuándo. Ninguno pertenece al empleado, porque cambian según el proyecto, ni al proyecto, porque cambian según la persona. Pertenecen al vínculo. De que exista esa clase se derivan tres capacidades que el enunciado pide de forma explícita: primero, validar la asignación, porque `ServicioAsignaciones` puede exigir que la suma de dedicaciones activas de un empleado no supere el 100 por ciento, y eso solo se puede sumar si hay objetos que sumar; segundo, conservar el histórico, porque desasignar no borra la fila, la cierra con `fechaDesasignacion`; y tercero, validar la imputación de horas, con `estabaVigenteEn(fecha)`, que `ServicioRegistrosTiempo` llama antes de aceptar un parte para rechazar horas de un día en el que esa persona todavía no participaba en ese proyecto. En el diagrama se ve como `Empleado` 1 a `0..*` `AsignacionProyecto`, y `Proyecto` 1 a `0..*`, y en código es una entidad con identidad propia.

:::trampa «Es la tabla intermedia que resuelve el muchos a muchos»
Es vocabulario de modelo relacional, no de UML, y describe la forma sin la razón. Delata que la trajiste del diseño de base de datos por costumbre y no porque detectaras atributos que no caben en ninguno de los dos extremos. Si te piden entonces nombrar esos atributos y qué se pierde sin ellos, la respuesta se cae.
:::

**9. En varias relaciones pusiste `0..1` y `0..*` donde lo natural parecería ser `1`. ¿Por qué?**

*Por qué te la hacen.* Las multiplicidades son donde más se improvisa, y cada una es una regla de negocio afirmada. Prueban si sabes que un `1` de más prohíbe estados legítimos del mundo real.

![Notación de multiplicidades y lo que afirma cada una](diagramas/multiplicidades.svg)

Cada multiplicidad es una regla de negocio, así que la elegí por lo que prohíbe. `Departamento` `0..1` hacia `Empleado`: un empleado pertenece a un solo departamento a la vez, ese es el requisito, pero puede no tener ninguno, porque acaba de ingresar o está en tránsito entre áreas; si pusiera `1` obligaría a inventar un departamento ficticio "Sin asignar", que es meter un dato falso en el modelo para satisfacer una restricción mal puesta. Ese `1` obligatorio del lado del departamento es exactamente el error C7 que catalogué en el modelo preliminar C: con él, un recién ingresado sin área es un estado que ocurre todas las semanas y que el diagrama declara imposible. `Departamento` hacia `Empleado` en el rol de gerente, `0..1`: el puesto puede estar vacante, y de hecho el sistema tiene `Departamento.liberarSiEsGerente` para que la baja de una persona deje la vacante sin dejar una referencia colgada. `Usuario` hacia `Empleado`, `0..1` en ambos sentidos: hay empleados sin cuenta, como el operario de terreno al que su supervisor le carga las horas, y cuentas sin empleado, como la del auditor externo o la cuenta técnica de administración. Ese doble `0..1` es la corrección del error A2, donde la IA hizo a `Usuario` subclase de `Empleado`: esa jerarquía rompe por los dos extremos, porque obliga a inventar credenciales falsas para el operario y un legajo para el auditor.

:::trampa «Puse 0..1 para dar flexibilidad, por si acaso»
La flexibilidad no es un criterio de modelado: una multiplicidad no es una precaución, es una afirmación sobre lo que puede y no puede existir. Quien contesta esto no puede justificar por qué en `Empleado` hacia `AsignacionProyecto` sí puso `1` del lado del empleado, y queda expuesto a la repregunta obvia: entonces, ¿por qué no todo es `0..*`?
:::

**10. ¿Por qué `departamentoId` vive en `Empleado` y no una lista de empleados dentro de `Departamento`?**

*Por qué te la hacen.* Es la variante fina de "por qué ese atributo en esa clase". Muchos creen que el lado en que se guarda la referencia es indiferente porque "es la misma relación vista al revés".

Porque el requisito "cada empleado solo puede pertenecer a un departamento a la vez" se cumple por construcción si el vínculo vive en el empleado como un escalar: `departamentoId` es un string o `null`, no una colección, así que reasignar es reemplazar y nunca añadir; el estado ilegal no es representable. Si la relación viviera como una lista dentro de `Departamento`, nada impediría que dos departamentos incluyeran al mismo empleado, y ese invariante pasaría a depender de que alguien recuerde comprobarlo en cada alta y cada reasignación: la regla estaría en un procedimiento en vez de en la estructura. Hay además una razón de persistencia: si el departamento contuviera a sus empleados, cambiar el teléfono de una persona obligaría a reescribir todos los departamentos que la referencian, y con un almacén clave-valor donde cada colección se guarda por separado eso es amplificación de escrituras. La consulta inversa, "los empleados de este departamento", se resuelve filtrando por `departamentoId`, que es una operación de lectura, no una duplicación del vínculo.

:::trampa «Da lo mismo, es la misma relación vista desde el otro lado»
Suena pragmático, pero declara que la decisión fue de conveniencia. Ignora que guardar el vínculo en los dos lados, o en el lado equivocado, es lo que abre la puerta a la duplicidad de información, que es el primer síntoma que el enunciado pide resolver.
:::

**11. Supón que elimino `AsignacionProyecto` del diagrama y pongo en `Empleado` un arreglo con los identificadores de sus proyectos. ¿Qué se rompe exactamente?**

*Por qué te la hacen.* Es la forma dura de la pregunta anterior sobre la clase de asociación: en vez de pedir la definición, pide simular la alternativa. Obliga a nombrar capacidades perdidas, no conceptos.

Se rompen cuatro cosas concretas, en orden de gravedad. Primero, no hay dónde guardar los atributos del vínculo: rol en el proyecto, porcentaje de dedicación, fecha de alta y fecha de baja de la participación; un arreglo de identificadores solo dice que la relación existe, no cómo es. Segundo, se cae la validación de asignaciones: ya no puedo exigir que la suma de dedicaciones activas no supere el 100 por ciento, porque no hay objetos que sumar, y esa validación es el mecanismo concreto contra los "errores en la asignación de personal a proyectos" que el enunciado señala. Tercero, se pierde el histórico: desasignar pasa a ser borrar un elemento del arreglo, y las horas cargadas durante ese período quedan sin nada que las explique, que es la falta de trazabilidad que el sistema viene a resolver. Cuarto, y es el efecto que se ve más tarde, desaparece `estabaVigenteEn(fecha)`, y con ella la validación que impide imputar horas a un proyecto en el que esa persona todavía no participaba ese día. Hay un quinto efecto si además se agrega el arreglo simétrico en `Proyecto`: la relación queda representada dos veces y puede quedar inconsistente, que es la duplicidad de información que el enunciado pone como primer síntoma.

:::trampa «Se rompe la relación muchos a muchos» o «habría que sincronizar los dos arreglos»
Es cierto en abstracto y no nombra ninguna capacidad perdida. Peor todavía es responder "no se rompe nada grave, es una simplificación válida": eso es exactamente el error A3 que le atribuiste a la IA, así que estarías autorizando en tu propia boca lo que criticaste por escrito.
:::

**12. Dices que un registro de horas no significa nada sin su autor. Con tu propio criterio, esa relación debería ser composición. ¿Por qué la dibujaste como agregación?**

*Por qué te la hacen.* Es la pregunta del docente que leyó el informe con atención y encontró una aparente incoherencia interna. No busca corregirte: busca ver si sostienes tu criterio bajo presión o si te derrumbas y aceptas que te equivocaste en algo que está bien decidido.

Tiene razón en la premisa y la incoherencia es aparente, no real; la tengo asumida por escrito. Conceptualmente esa relación está más cerca de la composición que la de `Departamento` con `Empleado`: un parte de horas carece de sentido sin su autor, y por eso la multiplicidad del lado del empleado es `1` y no `0..1`. La dibujé como agregación porque el criterio que apliqué de forma uniforme en todo el diagrama es operacional, no conceptual: el rombo relleno promete borrado en cascada, y este sistema no borra en cascada. La baja de un empleado es lógica, `desactivar()` marca `activo` en falso, y sus registros sobreviven, porque si desaparecieran, los informes de períodos ya cerrados cambiarían retroactivamente, y un informe que da un resultado distinto según cuándo se pida no sirve para nada; el enunciado señala precisamente los "problemas en la generación de reportes confiables". Si declarara composición estaría prometiendo en el diagrama una conducta que el sistema no ejecuta, y un diagrama que miente sobre lo que hace el sistema es peor que un diagrama impreciso. Dicho eso, acepto que es la relación más discutible del modelo, y si el criterio fuera la dependencia existencial en vez del borrado, el rombo relleno estaría bien puesto; lo que no aceptaría es aplicar un criterio aquí y otro en `Departamento`.

:::trampa «Es agregación porque el registro de tiempo puede existir por sí solo»
Es falso y además contradice tu propio diagrama, donde la multiplicidad del lado del empleado es `1`, es decir, todo registro tiene exactamente un autor. Revela que elegiste el rombo por inercia y que después inventaste la justificación, que es justo lo contrario de lo que la evaluación pide demostrar.
:::

### Herencia y polimorfismo

**13. ¿Por qué usaste herencia para los tipos de contrato y no simplemente un atributo `tipoContrato` dentro de `Empleado`?**

*Por qué te la hacen.* Separa a quien entiende la herencia de quien la usa porque "es un pilar de la POO". El enunciado pide explícitamente *"utiliza herencia y polimorfismo de manera efectiva para evitar duplicación de código"*, así que quieren que justifiques el eje elegido, no que exhibas una jerarquía cualquiera.

Porque aquí la herencia sí expresa un "es un" permanente: la modalidad de contrato no cambia durante la vida del vínculo laboral. Pasar de jornalizado a asalariado es un contrato nuevo, y el sistema lo trata así: `ServicioEmpleados.actualizar` rechaza el cambio de `tipoContrato` y obliga a baja y alta. El costo del atributo con switch no es un switch: es que ese condicional reaparece en el generador de nómina, en el validador de altas —qué campos económicos son obligatorios— y en los informes. Cada modalidad nueva obliga a encontrar y tocar todos esos puntos, y el que se olvide produce un error de cálculo silencioso, un empleado liquidado en cero que nadie nota hasta que reclama, que es exactamente el fallo que la empresa ya sufre con las planillas. Con la jerarquía, `ReporteNomina` recorre la plantilla llamando `empleado.calcularRemuneracionMensual(horasAprobadas)` sin un solo condicional. Asumo la contrapartida: al reconstruir el objeto desde el almacén hay que elegir la subclase, y eso es un switch en `FabricaEmpleados.rehidratar`. Pero es uno solo, en un lugar conocido, y si falta rompe de forma ruidosa en vez de silenciosa.

:::trampa «Porque la herencia permite reutilizar código y evitar duplicación»
Es la frase del manual y no responde nada: la reutilización no es criterio para heredar, se consigue igual con composición o con funciones. Delata que no distingues "es un tipo de" —permanente, define la clase— de "está en el estado" —mutable, es un atributo—, que es justamente el error A1 que tú mismo le criticaste a la IA con `Gerente`.
:::

**14. Muéstrame en qué punto exacto de tu modelo el polimorfismo hace trabajo real, y no un switch disfrazado.**

*Por qué te la hacen.* Casi todos afirman tener polimorfismo porque sobrescriben un método. La pregunta apunta al **punto de llamada**, que es donde se comprueba si el polimorfismo elimina condicionales o solo los reubica.

El polimorfismo se demuestra en el llamador, no en la subclase, así que le señalo cuatro puntos donde no hay condicional. Primero, `ReporteNomina` recorre la lista de empleados y llama `empleado.calcularRemuneracionMensual(horasAprobadas)`: tres fórmulas distintas, cero `if`; hay una prueba que lo fija, liquidando tres empleados de tipos distintos en un mismo `reduce` con tres resultados distintos. Segundo, `ErrorDominio` declara `codigoHttp` abstracto, y la capa HTTP no encadena `instanceof`: le pregunta al error por su propio código, de modo que agregar un error nuevo no obliga a tocar el enrutador. Tercero, `Esquema` recorre una lista de objetos `Regla` llamando `aplicar()` sin saber qué regla concreta ejecuta, en lugar de una cascada de `if` por tipo de campo. Cuarto, `Reporte.generar()` es un método plantilla: la base fija el algoritmo y las subclases rellenan columnas, filas y totales, y en el eje perpendicular `Exportador` tiene cuatro implementaciones; cinco informes por cuatro formatos son veinte combinaciones servidas por nueve clases pequeñas y ningún switch en el servicio. Y le declaro el único switch que existe: `FabricaEmpleados.rehidratar`, para elegir la subclase al leer del almacén. Es el precio conocido de la herencia con persistencia, está en un lugar único y si falta un caso rompe de forma ruidosa, no silenciosa.

:::trampa «Hay polimorfismo porque las subclases sobrescriben calcularRemuneracionMensual»
Describe el mecanismo, no su uso. Sobrescribir un método y después preguntar el tipo con un `if` o un `instanceof` en el llamador es tener la jerarquía y no cobrarla. Quien no puede nombrar el punto de llamada no ha comprobado que su modelo elimine los condicionales que dice eliminar.
:::

### Uso de la IA

**15. Dime un error concreto que cometió la IA en el diagrama que te generó y cómo te diste cuenta de que estaba mal.**

*Por qué te la hacen.* Es el corazón del criterio 1.1.3 y la pregunta que descubre a quien pegó la salida de la herramienta y escribió después que "hizo un análisis crítico". No quieren una lista: quieren un caso contado entero, con el método que lo reveló.

El más caro fue `Gerente` heredando de `Empleado`, el error A1 de la propuesta A. Lo detecté aplicando la prueba que usé con toda la jerarquía: si un objeto deja de pertenecer a la subclase, ¿sigue siendo el mismo objeto? Cuando a alguien lo ascienden a gerente y después lo devuelven a su cargo anterior, sigue siendo la misma persona, con el mismo legajo, las mismas horas cargadas y el mismo historial. La herencia no puede representar eso: obliga a construir un objeto `Gerente` nuevo y destruir el `Empleado` anterior, y como la identidad es el id, se pierde el vínculo con sus horas, sus asignaciones y su auditoría; o se copia el id al objeto nuevo, que es peor, porque quedan dos objetos de clases distintas con la misma identidad. Hay un segundo problema menos visible: la herencia no expresa la cardinalidad, nada impide un `Gerente` que no dirige ningún departamento ni dos reclamando el mismo. La corrección fue modelarlo como asociación dirigida `Departamento` hacia `Empleado` con multiplicidad `0..1`, y de ahí salió `Departamento.liberarSiEsGerente(empleadoId)`, que permite que la baja de una persona deje la vacante sin dejar una referencia colgada; con herencia ese caso ni siquiera es expresable. Tengo catalogados veinticinco errores clasificados por aspecto —clases, atributos y relaciones—, con la corrección adoptada en cada uno, pero si tuviera que quedarme con un patrón sería este: la herramienta confunde estructura léxica con estructura semántica, ve dos sustantivos donde uno parece un caso particular del otro y produce herencia, sin distinguir "es un tipo de", que es permanente, de "hace de", que es temporal.

:::trampa «La IA se equivocó en varias relaciones y en los atributos» — y, peor, «alucinó»
La primera es genérica y no verificable: no nombra un error, ni el método que lo reveló, ni la consecuencia. La segunda es directamente falsa en este caso: ninguno de los tres diagramas tenía errores de sintaxis UML, los tres eran internamente consistentes y ninguna herramienta de validación habría marcado nada. Los fallos eran de correspondencia con el dominio, y decir "alucinó" delata que no revisaste, solo aceptaste.
:::

**16. ¿Cómo puedo saber qué parte de este trabajo es tuya y cuál es de la IA?**

*Por qué te la hacen.* Es la pregunta incómoda, y con un entregable extenso te la van a hacer. No busca una confesión ni una negación: busca ver si tienes una frontera clara y si puedes demostrar dominio en el momento, que es lo único que la IA no puede haber hecho por ti.

Se lo separo en tres capas y le doy una prueba para cada una. Lo que la herramienta hizo: enumerar candidatos iniciales de entidades y atributos, producir las tres propuestas de diagrama que después critiqué, escribir código mecánico y verificable como serializadores y formateadores, y redactar documentación a partir de material ya decidido. Lo que hice yo: las decisiones estructurales, y están todas documentadas con la misma plantilla —decisión, alternativa descartada, razonamiento, prueba de la decisión y consecuencia en el código—. Esa plantilla es la evidencia: una herramienta puede producir un modelo, no puede producir el registro de lo que se descartó y por qué, porque eso solo existe si alguien evaluó opciones. La segunda evidencia es el delta: las tres propuestas iniciales están en el informe tal como salieron, y el catálogo de correcciones muestra punto por punto la distancia entre lo generado y lo entregado. Y la tercera prueba se la ofrezco ahora: pregúnteme por cualquier decisión del diagrama y le digo qué alternativa descarté y qué se rompe si la tomo; o deme un requisito nuevo y modifico el modelo aquí mismo explicando qué cambia y qué no. Uso la IA como material a criticar, no como resultado, y esa postura es exactamente la que la guía pide.

:::trampa «Todo el análisis es mío, la IA solo me ayudó con el formato y la redacción»
Minimizar es tan sospechoso como no documentar, y además contradice a la propia guía, que **exige** documentar los prompts y los resultados y usar la IA como apoyo. Un docente que lee un informe con tres diagramas generados y luego escucha "solo el formato" concluye que no tienes clara la frontera, o que la estás escondiendo.
:::

**17. Tu entrega tiene un sistema desplegado, miles de líneas de documentación y decenas de diagramas, cuando la unidad solo pedía modelar. ¿Cómo sé que entiendes esto y no que lo generaste entero?**

*Por qué te la hacen.* Es la pregunta final del docente escéptico, y el volumen la provoca: un entregable que excede tanto lo pedido levanta sospecha en vez de admiración. Evalúa madurez, no contenido, y tu reacción pesa tanto como lo que digas.

Entiendo la sospecha y me parece razonable que la plantee. Le separo entregable de evidencia. Lo que la ES1 evalúa es el diagrama de clases UML, el análisis conceptual y la evaluación crítica del apoyo de IA, y eso es lo que entrego. El sistema desplegado no lo traigo como mérito adicional, lo traigo como verificación empírica de una sola afirmación: que este modelo es implementable sin contradicciones. Un diagrama puede ser hermoso y no compilar; el mío se ejecuta, tiene ochenta casos de prueba unitaria y hay uno que fija justamente el punto que defendí antes, liquidar tres tipos de empleado en un mismo recorrido sin un solo condicional. Dicho eso, el volumen no prueba dominio y no pretendo que lo pruebe: lo único que lo prueba es que yo pueda responderle. Así que le propongo la verificación que prefiera. Puede pedirme cualquier decisión del diagrama y le doy la alternativa que descarté, el razonamiento y qué se rompe si la tomo. Puede darme un requisito nuevo y modifico el modelo aquí, delante suyo, diciendo qué cambia y qué queda intacto. O puede señalarme una clase cualquiera y le explico por qué cada atributo está en ese nivel de la jerarquía y no en otro. Si algo de eso no lo puedo responder, su sospecha estaba fundada.

:::trampa Ponerse a la defensiva — o desviar hacia una demostración del sistema en pantalla
Mostrar la aplicación funcionando parece la prueba más contundente y es la peor jugada posible: responde a una pregunta que no se hizo, confirma que mides tu trabajo por volumen y no por criterio, y consume el tiempo de defensa en algo que la rúbrica de esta unidad no evalúa. La otra variante fatal es minimizar —"en realidad no es tanto"—, porque desmiente lo que el docente tiene delante.
:::

### Lenguaje y persistencia

**18. La guía pide una solución en Python y tu sistema está en TypeScript. ¿Cómo lo justificas?**

*Por qué te la hacen.* Está escrito literalmente en el Paso 4: *"defendiendo la viabilidad técnica del diseño definitivo en Python"*. Es una desviación objetiva del encargo y se ve en cuanto se abre el repositorio. Lo que se evalúa no es el lenguaje: es si distingues modelo de implementación y si asumes la desviación en vez de discutirla.

Primero lo reconozco sin rodeos: la guía pide Python y la implementación está en TypeScript. Segundo, distingo qué se evalúa en esta unidad: el entregable de la ES1 es el diagrama de clases UML y el análisis del modelado, y un diagrama de clases es independiente del lenguaje por definición; el sistema desplegado es evidencia adicional, no el entregable. Tercero, y esto es lo que sostiene la viabilidad técnica: el modelo es directamente portable, y puedo mostrar el mapeo elemento por elemento. `Entidad`, `Persona` y `Empleado` son clases abstractas, en Python son `abc.ABC` con `@abstractmethod`; `calcularRemuneracionMensual` es un `abstractmethod` que las tres subclases implementan, y el polimorfismo funciona igual porque Python resuelve por duck typing y por MRO; el encapsulamiento con atributos privados y operaciones de negocio se expresa con la convención de guion bajo más `property` de solo lectura, sin setters, y no con `dataclasses`, porque los invariantes exigen métodos y no un contenedor de campos; `FabricaEmpleados` es un `classmethod` con un registro de subclases por discriminante; los enumerados que en TypeScript son uniones de literales serían `Enum`. La razón por la que la implementación quedó en TypeScript es el entorno de despliegue, Cloudflare Workers, que ejecuta JavaScript en el borde y no Python. Si le sirve como prueba, tomo cualquier clase del diagrama y la escribo en Python ahora, y el proyecto grupal desde la Unidad 2 lo llevo a Python.

:::trampa «Es prácticamente lo mismo, los dos son orientados a objetos» — o «TypeScript es mejor porque tiene tipado estático»
Trata una restricción del encargo como si fuera opinable y desplaza la conversación a una comparación de lenguajes que nadie pidió. El docente lo lee como que no sigues instrucciones, y la desviación pasa de ser un detalle explicable a ser el tema de la defensa.
:::

**19. El enunciado pide usar una base de datos y tú usaste un almacén clave-valor. ¿Eso cumple el requisito?**

*Por qué te la hacen.* Es la segunda desviación literal del encargo, después de Python. Quieren ver si defiendes la decisión con sus costos sobre la mesa o si la vendes como si fuera gratis. También es la puerta a la pregunta 20.

Workers KV es una base de datos, clave-valor y distribuida, así que el requisito de persistir fuera del proceso se cumple; pero le doy lo que se pierde, porque defenderla sin costos sería deshonesto. No hay claves foráneas, así que la integridad referencial la imponen los servicios. No hay transacciones multi documento, así que una operación que toca dos colecciones puede quedar a medias. No hay consultas por atributo: se filtra en memoria tras leer la colección completa. La concurrencia es "el último en escribir gana" dentro de una colección, y la consistencia es eventual entre centros de datos, lo que mitigo con una caché de escritura directa por isolate y devolviendo la entidad ya actualizada en cada mutación, para que el usuario no vea desaparecer su propia escritura. Guardo un documento JSON por colección y no una clave por registro porque KV cobra y limita por operación: listar doscientos empleados costaría un `list` más doscientas lecturas, y así cuesta una; el techo son 25 MiB por valor, del orden de decenas de miles de registros. Lo importante para esta evaluación es que nada de esto toca el modelo: el dominio depende de la interfaz `Repositorio<T>`, que describe la persistencia sin mencionar KV, y esa frontera es justamente lo que permitiría pasar a D1 o a PostgreSQL sin cambiar una sola regla de negocio. Sé además cuándo dejaría de servir: transacciones reales, informes sobre cientos de miles de partes, o escritura concurrente intensa sobre la misma colección.

:::trampa «KV es una base de datos, así que el requisito está cumplido»
Técnicamente defendible y estratégicamente pésimo: presenta una restricción fuerte como si fuera equivalente a una base relacional y le deja al docente la tarea de encontrar los costos, que los va a encontrar. La variante opuesta es igual de mala —"no importa, esta unidad es solo modelado"—, porque fuiste tú quien decidió traer un sistema desplegado a la defensa.
:::

**20. Si no hay claves foráneas, ¿qué garantiza que el `gerenteId` de un departamento apunte a un empleado que existe y está activo?**

*Por qué te la hacen.* Es la consecuencia directa de guardar las relaciones como identificadores. Prueba si sabes qué garantiza tu modelo y qué no, que es la diferencia entre conocer un diseño y haberlo copiado.

No lo garantiza el modelo, y prefiero decirlo así: en un almacén clave-valor no hay claves foráneas, y el tipado de TypeScript tampoco sirve para esto, porque un string sigue siendo un string aunque no corresponda a nada. La integridad referencial la imponen los servicios, que comprueban que el identificador exista y apunte a una entidad activa antes de guardar, y esa comprobación está documentada endpoint por endpoint. En el sentido inverso, la baja dispara tres efectos explícitos y auditados: `ServicioEmpleados.eliminar` libera la gerencia de cualquier departamento que esa persona dirigiera mediante `liberarSiEsGerente`, cierra sus asignaciones activas con fecha de hoy, y desactiva su usuario vinculado si lo hay. Son tres reglas escritas en un lugar concreto, no un efecto implícito del motor. La contrapartida asumida es que hay que acordarse de escribir la comprobación en cada punto; el beneficio es que la regla es visible y comprobable con una prueba, en vez de estar delegada a una restricción del esquema que nadie lee. Y decidí guardar identificadores y no referencias directas a objetos por tres motivos: evita ciclos al serializar, evita reescribir todos los departamentos cuando cambia un empleado, y encaja con un almacén donde cada colección se guarda por separado.

:::trampa «De eso se encarga la base de datos» o «TypeScript no me deja poner un id que no exista»
La primera describe un sistema que no construiste. La segunda confunde tipado estático con integridad referencial, que es un error conceptual grande: el compilador verifica que el valor sea un string, no que ese string identifique algo. Cualquiera de las dos dice que no sabes qué garantías te da tu propia arquitectura.
:::

### Alcance y trazabilidad

**21. Defiéndeme que tu modelo cumple el requisito de Registro de Tiempo tal como está redactado en el enunciado.**

*Por qué te la hacen.* El Paso 4 exige la matriz de trazabilidad. El docente elige un requisito y pide recorrerlo: quiere el mapeo atributo por atributo y el método que ejecuta cada regla, no un gesto hacia la clase.

Lo recorro literal. El enunciado pide que el empleado ingrese la fecha, la cantidad de horas y una breve descripción de las tareas: son los atributos `fecha`, `horas` y `descripcion` de `RegistroTiempo`. Pide que el registro esté asociado a un empleado y a un proyecto específico: en el diagrama son dos agregaciones, `Empleado` 1 a `0..*` `RegistroTiempo` y `Proyecto` 1 a `0..*` `RegistroTiempo`, y en la clase son `empleadoId` y `proyectoId`; ese doble vínculo es justamente lo que faltaba en la propuesta A, que colgaba el registro solo del empleado y con eso hacía imposible el informe de costo por proyecto. Hasta ahí el requisito literal. Pero el enunciado también lista como problema la "falta de trazabilidad en el registro de horas", y eso obliga a lo que el requisito no dice: el atributo `estado` con el circuito `BORRADOR`, `ENVIADO`, `APROBADO`, `RECHAZADO`, más `aprobadoPor` y `motivoRechazo`. Las reglas son tres y están en métodos concretos: `aprobar(idAprobador)` exige que el registro esté en `ENVIADO` y rechaza que el aprobador sea el propio autor, que es separación de funciones; un registro aprobado no se edita, hay que rechazarlo antes con un motivo de al menos cinco caracteres, y ese rechazo queda en la auditoría, de modo que no se puede reescribir el pasado sin dejar rastro; y solo `APROBADO` computa para la nómina y los informes de costo, vía `computaParaNomina()`. Además, antes de aceptar el parte, `ServicioRegistrosTiempo` llama a `exigirAsignacionVigente`, que usa `AsignacionProyecto.estabaVigenteEn(fecha)`: no se imputan horas a un proyecto en el que esa persona no participaba ese día. El modelo preliminar C tenía aquí un `boolean aprobado`, y con un booleano no existe el rechazo, no hay dónde guardar el motivo, y "aún no enviado" y "rechazado" son indistinguibles.

:::trampa «Sí lo cumple: ahí está la clase RegistroTiempo con fecha, horas y descripción»
Es cierto y no basta: enumera atributos sin nombrar el método que ejecuta ninguna regla, y sin distinguir lo que el requisito pide de lo que el requisito implica. Delata que tradujiste el enunciado a campos, que es exactamente lo que hace la IA cuando es literal con el texto y no lo interroga.
:::

**22. Te cambio el requisito en vivo: la empresa decide que un empleado puede pertenecer a dos departamentos a media jornada. ¿Qué cambia en tu diagrama?**

*Por qué te la hacen.* Es la prueba definitiva de dominio y la única que ninguna herramienta pudo responder de antemano. No evalúan tu solución: evalúan si puedes navegar tu propio modelo, identificar el impacto y también lo que **no** se toca. Suele ser la última pregunta cuando quedan dudas sobre la autoría.

Cambia el mismo tipo de cosa que ya resolví entre `Empleado` y `Proyecto`, así que aplico el mismo patrón. La multiplicidad `Departamento` `0..1` a `Empleado` `0..*` pasa a `0..*` en ambos lados. Con eso, `departamentoId` como campo escalar deja de servir, y ahí está lo importante: no lo reemplazo por un arreglo de identificadores, porque el requisito dice "a media jornada", y esa fracción es un atributo del vínculo, no del empleado ni del departamento. Introduzco una clase de asociación análoga a `AsignacionProyecto`, con `porcentajeJornada`, fecha de alta y fecha de baja, y replico el invariante de que la suma de jornadas activas no supere el 100 por ciento, con la misma forma de validación que ya existe en `ServicioAsignaciones`. Hay dos efectos derivados que conviene decir antes de que me los pregunten: los informes por departamento pasan a necesitar prorrateo, porque la persona ya no cuenta entera en un área, y la gerencia sigue siendo asociación `0..1` desde el departamento, así que no se toca. Y digo también lo que no cambia, que es señal de que el modelo estaba bien separado: la jerarquía por tipo de contrato, `RegistroTiempo` con su circuito de aprobación, `Usuario`, la auditoría y las relaciones con `Proyecto` quedan intactas. Que el cambio se localice en una zona es la evidencia de que el acoplamiento estaba controlado.

:::trampa «Le agrego a Empleado una lista de departamentos»
Es la respuesta rápida y resuelve solo la cardinalidad: pierde el porcentaje de jornada, pierde la vigencia temporal y hace imposible el invariante de la jornada total. Es literalmente el error A3 que documentaste en la propuesta de la IA, cometido por ti mismo bajo presión, y eso es lo peor que puede pasar en una defensa: demuestra que el catálogo de errores era una lista aprendida y no un criterio interiorizado.
:::

:::avanzado El patrón común de las 22 respuestas
Léelas otra vez y verás que casi todas tienen la misma forma en tres movimientos, y que la forma es lo transferible:

1. **El criterio antes que la conclusión.** No "es agregación", sino "la prueba que distingo es qué pasa al eliminar el contenedor; por eso es agregación".
2. **La consecuencia observable.** Qué se ve distinto en el sistema según cuál elijas. Una decisión de modelado que no cambia nada observable no es una decisión.
3. **La contrapartida asumida.** "El precio es un switch en la fábrica." "KV no da transacciones." Decir el costo antes de que te lo digan es lo que separa una defensa de una venta, y desarma la repregunta.

Si te inventan una pregunta que no está en esta lista —va a pasar—, responde con esos tres movimientos y la respuesta va a ser sólida aunque sea la primera vez que piensas el tema.
:::

---

## Cómo se responde "no lo sé" sin perder la defensa

Vas a recibir al menos una pregunta que no sabes contestar. Es esperable en una defensa y no hunde nada por sí sola: lo que hunde es lo que hagas con ella. Inventar es lo peor, porque una invención abre tres repreguntas y ninguna tiene salida.

Primero distingue cuál de los tres "no sé" es, porque se responden distinto:

| Tipo | Qué pasó | Cómo se responde |
|---|---|---|
| No recuerdo el dato | Sabes que lo decidiste, no recuerdas el detalle | Di dónde está y ofrece buscarlo en la hoja impresa |
| No lo decidí | Es un caso que tu modelo no cubre | Reconócelo y razona en voz alta qué harías, con criterio |
| No entendí la pregunta | Ambigua o usa un término que no manejas | Pide precisión: "¿se refiere a X o a Y?" |

Para el segundo, que es el difícil, la fórmula tiene cuatro movimientos y se hace en veinte segundos:

1. **Reconoce sin adorno.** "No lo tengo resuelto en el modelo." Punto. Nada de "bueno, en realidad, más o menos".
2. **Acota lo que sí sabes.** "Lo que sí tengo decidido es el caso vecino: la vigencia temporal de la asignación."
3. **Razona en voz alta hasta donde llegues, nombrando el criterio.** "Si lo tuviera que resolver ahora aplicaría el mismo criterio que en el resto del diagrama: si el dato pertenece al vínculo y no a los extremos, va en una clase de asociación. Habría que ver si..."
4. **Cierra con un compromiso verificable.** "Lo reviso y le puedo mostrar el ajuste."

Ese razonamiento en voz alta es la parte que puntúa. La viñeta del Paso 4 pide *"respondiendo con seguridad y fundamentos sólidos"*: seguridad no es tener todas las respuestas, es saber qué criterio aplicar a una pregunta nueva. Un estudiante que razona bien hacia una respuesta incompleta deja mejor impresión que uno que recita una completa y se cae en la repregunta.

:::trampa Las cuatro salidas que empeoran un "no lo sé"
- **Inventar.** "Sí, eso está resuelto con..." Si no lo está, la repregunta lo descubre en diez segundos y a partir de ahí todo lo demás que dijiste queda bajo sospecha.
- **Culpar a la herramienta.** "Eso lo generó la IA, no lo revisé." Es la confesión exacta que el criterio 1.1.3 castiga.
- **Escudarse en el alcance.** "Eso ya es implementación, no modelado." A veces es cierto y casi nunca es la salida: el tipo de relación y la multiplicidad **son** especificación de conducta, y esta frase suele delatar que no puedes derivar la conducta de tu propio diagrama.
- **El silencio largo.** Diez segundos mirando el diagrama parecen un minuto. Si necesitas pensar, dilo: "déjeme mirar la relación, no quiero responderle de memoria". Comprar tiempo en voz alta es legítimo; el silencio se lee como bloqueo.
:::

:::nota Si te preguntan por un error real de tu diagrama
Puede pasar que la pregunta señale algo que efectivamente está mal. La respuesta correcta es reconocerlo, decir por qué está mal usando tu propio criterio, y decir cuál sería la corrección. Eso puntúa: demuestra que el criterio es tuyo y funciona incluso contra ti.

Lo que **no** debes hacer es cambiar el diagrama entre la entrega y la defensa. El informe ya está en el AAI y es lo que el evaluador tiene delante; presentar en silencio una versión distinta hace que todo lo que digas contradiga el documento corregido. Defiende el entregado y **anuncia** la corrección.
:::

---

## Qué llevar impreso

El papel tiene una ventaja sobre la pantalla en una defensa: se consulta de un vistazo, sin cambiar de ventana, sin que se note que estás buscando, y no depende de que el cable de la sala funcione. Lleva pocas hojas y sabe qué hay en cada una.

| Qué | Formato | Para qué |
|---|---|---|
| El diagrama de clases final | Una hoja, tamaño grande, horizontal | Es el objeto de la defensa entera. Tiene que leerse a un metro de distancia |
| Tabla de relaciones | Una cara: relación, tipo, multiplicidad, regla que afirma | El Tramo 3 y las preguntas 6 a 12 salen de aquí |
| Tabla de delta de la IA | Una cara: error, aspecto, corrección | Las preguntas 15 y 16. Que veas los códigos —A1, B2, C7— te devuelve el caso entero |
| Matriz de trazabilidad | Una cara: requisito, clase, método | Te van a pedir recorrer una fila; con la matriz delante, recorres la que elijan |
| Correspondencias UML → Python | Media cara: elemento UML, construcción Python | El cierre del Tramo 6 y la pregunta 18 |
| Tarjeta de decisiones | Una cara: seis decisiones, cada una con su **alternativa descartada** | Es la hoja que responde "y por qué no de la otra forma" en cualquier pregunta |
| El informe entregado | Impreso o en el mismo PDF que subiste | Para citar página. Si el docente pregunta "¿dónde está eso?", el número de página es la mejor respuesta posible |

:::aviso Lo que conviene no llevar
- **Un guion escrito palabra por palabra.** Termina leído, y la viñeta del Paso 2 exige explicar *"de manera lógica y fluida"*. Lleva un esquema de viñetas con los siete tramos y nada más.
- **El computador con la aplicación funcionando.** Es la tentación más fuerte y la peor jugada: demostrar el sistema responde a una pregunta que nadie hizo y consume el tiempo que la rúbrica destina a otra cosa. Si te lo piden, lo abres; no lo ofrezcas.
- **Un diagrama impreso en A4 al 60% que no se lee.** Si el evaluador tiene que acercar la hoja a los ojos, perdiste la mitad del Tramo 3. Imprímelo grande, o llévalo en dos hojas partido por zonas.
:::

:::clave La víspera, en 45 minutos
1. Recorre el diagrama en voz alta, sin mirarlo, nombrando cada relación con su tipo, su multiplicidad y la regla que afirma. Si te trabas en una, esa es la que te van a preguntar.
2. Cuenta un error de la IA entero, en voz alta, con su método de detección. Cronométralo: debe caber en noventa segundos.
3. Responde en voz alta las preguntas 6, 13 y 15 de esta lista. Son las tres que caen casi siempre.
4. Inventa un cambio de requisito y respóndelo como la pregunta 22, diciendo qué cambia y qué queda intacto.
5. Revisa que las hojas impresas estén, en orden, y que el diagrama se lea a un metro.
:::

---

**Lo que sigue.** Si al preparar el guion detectas que hay una relación que no puedes justificar, o un principio que no sabes dónde señalar, no lo resuelvas hablando: vuelve al paso correspondiente, que es donde está el razonamiento —[Paso 2](04-paso-2-modelo-uml.html) para las relaciones, [Paso 3](05-paso-3-evaluacion-critica-ia.html) para el catálogo de la IA, [Paso 4](06-paso-4-validacion-final.html) para principios y trazabilidad—. Si lo que falla es la notación o un concepto de fondo, está en [Fundamentos POO y UML](09-fundamentos-uml-y-poo.html). Y si el informe todavía no está cerrado, ciérralo primero: la defensa se prepara sobre un documento entregado, no sobre uno que sigue cambiando. Eso está en [El informe técnico](07-el-informe-tecnico.html).
