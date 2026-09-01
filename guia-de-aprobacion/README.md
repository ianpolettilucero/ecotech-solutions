# Guía de Aprobación · TI3021 Unidad 1

Material de estudio para la **Evaluación Sumativa 1** de *Programación Orientada
a Objeto Seguro*: el informe técnico con diagrama de clases UML, el análisis
crítico del uso de IA, y la defensa oral.

Esta guía no es el informe. Es el andamio para que lo escribas tú: qué pide la
evaluación línea por línea, cómo se razona cada paso, dónde están las trampas, y
qué nivel separa una respuesta correcta de una sobresaliente.

:::aviso Léelo antes que nada
Los ejemplos trabajados que vas a encontrar aquí son **para aprender de ellos la
forma y el nivel**, no para copiarlos. Hay dos razones, y la segunda es la que
importa:

1. La guía lo prohíbe explícitamente. *"La entrega de resultados generados
   exclusivamente por IA, sin análisis ni ajustes, será considerada
   insuficiente."*
2. **Hay defensa oral en los cuatro pasos.** Un trabajo que no entiendes se cae
   en la primera pregunta, y la primera pregunta llega en el minuto tres. La
   parte de esta guía que de verdad te aprueba no son las respuestas modelo: es
   la sección "Cómo razonarlo" de cada paso.
:::

---

## Las tres cosas más urgentes

Si solo lees tres párrafos de toda la guía, que sean estos. Salen de comparar la
guía de evaluación con lo que ya existe en este repositorio.

**1. No hay ni un prompt documentado, y es el punto más barato de perder.**
El Paso 3 exige *"documentar al menos 2 prompts utilizados (incluyendo el
contexto del problema y las instrucciones de formato) y el resultado obtenido
para cada iteración"*. La palabra "prompt" no aparece ni una sola vez en las
7.400 líneas de `docs/`. Es un requisito que se cumple en veinte minutos y que,
sin hacerlo, cuesta un criterio entero.
→ [Paso 3](05-paso-3-evaluacion-critica-ia.html)

**2. La guía dice Python dos veces, y aquí todo está en TypeScript.**
La ES1 se define como *"una solución de software en Python"* y el Paso 4 cierra
*"defendiendo la viabilidad técnica del diseño definitivo en Python"*. Un
diagrama UML es independiente del lenguaje, pero esa afirmación hay que poder
demostrarla. Por eso esta guía incluye [`python/modelo.py`](python/modelo.py):
el mismo modelo, en Python, ejecutable, con la correspondencia UML→Python
documentada.
→ [Ambigüedades](02-ambiguedades-y-riesgos.html)

**3. El entregable es UN archivo, no un repositorio.**
*"NO SE RECIBIRÁN ENTREGAS POR CORREO"*, y la tarea del AAI recibe un Word o un
PDF. Un enlace a GitHub no es evidencia entregada: lo que no esté dentro del
archivo, no se corrige. Todo lo que quieras que cuente tiene que estar pegado en
el informe.
→ [El informe técnico](07-el-informe-tecnico.html)

---

## Los documentos

![Los cuatro pasos de la evaluación, la sección del informe donde aterriza cada uno, y la defensa oral que atraviesa los cuatro](diagramas/mapa-evaluacion.svg)

### Antes de empezar

| Documento | Para qué sirve |
|---|---|
| [00 · Empieza aquí](00-empieza-aqui.html) | **Si estás trabado, entra por aquí.** Las siete relaciones entre clases resueltas, con su tipo y su multiplicidad, y qué se escribe en cada apartado del informe. |
| [01 · Qué pide la evaluación](01-que-pide-la-evaluacion.html) | El checklist maestro. Todos los mínimos numéricos que se cuentan al corregir, con la cita textual de la guía. |
| [02 · Ambigüedades y riesgos](02-ambiguedades-y-riesgos.html) | Lo que la guía deja abierto a dos lecturas, cómo conviene resolverlo, y el plan B si el docente lo interpreta al revés. |

### Los cuatro pasos

| Documento | Criterio |
|---|---|
| [03 · Paso 1 — Análisis desde la POO](03-paso-1-analisis-poo.html) | 1.1.1 |
| [04 · Paso 2 — El diagrama de clases UML](04-paso-2-modelo-uml.html) | 1.1.2 |
| [05 · Paso 3 — Evaluación crítica con IA](05-paso-3-evaluacion-critica-ia.html) | 1.1.3 |
| [06 · Paso 4 — Modelo final y trazabilidad](06-paso-4-validacion-final.html) | 1.1.4 |

Cada uno sigue la misma estructura: qué pide la guía (textual) · cómo razonarlo ·
cómo hacerlo paso a paso · respuesta modelo · versión avanzada · ambigüedades ·
errores que hunden · para aprender más.

### Para entregar y defender

| Documento | Para qué sirve |
|---|---|
| [07 · El informe técnico](07-el-informe-tecnico.html) | Cómo encajar las 6 secciones de la guía dentro de los 5 apartados de la plantilla, formato, APA, checklist de entrega. |
| [08 · La defensa oral](08-defensa-oral.html) | Guion con tiempos y 22 preguntas anticipadas con su respuesta y su trampa. |
| [09 · Fundamentos POO y UML](09-fundamentos-uml-y-poo.html) | La teoría que hay que dominar. No es un manual general: es exactamente lo que esta evaluación exige. |
| [10 · Qué usar de este repositorio](10-que-usar-de-este-repositorio.html) | Qué material existente sirve, para qué paso, y los huecos que hay que llenar a mano. |
| [11 · Plan de cuatro semanas](11-plan-de-cuatro-semanas.html) | Cronograma con entregables parciales, y qué recortar si vas tarde. |

### Anexos

- [`esqueleto-informe.docx`](esqueleto-informe.docx) — **la plantilla oficial con el cuerpo ya estructurado**: 22 apartados, cada uno con un recuadro que dice qué escribir y qué mínimo exige la guía. Escribes encima y borras el recuadro.
- [`python/modelo.py`](python/modelo.py) — el modelo UML traducido a Python, ejecutable con `python3 modelo.py`. Demuestra la viabilidad técnica en Python que pide el Paso 4.
- [`diagramas/`](diagramas) — los siete diagramas SVG de esta guía. Se generan con `node scripts/diagramas.mjs`.

---

## Cómo usar esta guía

**Si tienes las cuatro semanas completas.** Lee 01 y 02 enteros el primer día:
ahí está lo que se cuenta y lo que se puede interpretar mal. Después haz un paso
por semana siguiendo 03 a 06, en orden. El orden no es decorativo: el Paso 3 te
pide contrastar el modelo de la IA con tu análisis propio, y si generas el
modelo antes de tener el análisis, no tienes con qué contrastar.

**Si te queda una semana.** Ve directo a [11 · Plan de cuatro
semanas](11-plan-de-cuatro-semanas.html), sección "Si vas tarde". Está el orden
de prioridad real: qué se puede recortar sin perder criterios enteros y qué no.

**Si no entiendes por dónde empezar.** [00 · Empieza aquí](00-empieza-aqui.html)
resuelve las dos cosas concretas que suelen atascar: las relaciones entre las
clases y qué se escribe en cada apartado. Es corto.

**Si vas a defender mañana.** [08 · La defensa
oral](08-defensa-oral.html), y de ahí las preguntas sobre agregación contra
composición, sobre por qué herencia y no un atributo `tipo`, y sobre qué error
concreto cometió la IA. Son las tres que caen casi siempre.

---

## De dónde sale este material

La guía se construyó leyendo dos documentos oficiales —la guía de evaluación
TI3021 U1 y la plantilla de informe— y contrastándolos con el sistema que ya
está construido en este repositorio. Los mínimos numéricos, las citas y la
estructura del informe salen del texto oficial; las ambigüedades salen de cruzar
las tres fuentes y anotar dónde se contradicen.

Cuando esta guía dice "la guía pide X", hay una cita textual al lado. Cuando dice
"conviene hacer Y", es una recomendación con su razonamiento explícito y, donde
la cosa admite dos lecturas, con su plan B. La diferencia entre las dos cosas
está marcada a propósito: lo primero es un hecho verificable contra el documento
oficial, lo segundo es un criterio que puedes discutir con tu docente.

:::nota Una advertencia sobre la rúbrica
La guía manda revisar la **Rúbrica N°1**, que es el instrumento que efectivamente
pone la nota. Esa rúbrica **no viene en el paquete**: vive en el AAI. Todo lo
que esta guía trata como criterio de corrección está inferido de las viñetas
*"Acciones para desarrollar"* de cada paso, que están redactadas como filas de
rúbrica. Búscala en el AAI y contrástala: si dice algo distinto, manda la
rúbrica.
:::
