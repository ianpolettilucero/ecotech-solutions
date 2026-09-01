# Empieza aquí: las relaciones y el informe

Este documento resuelve las dos cosas concretas en las que se traba casi todo el
mundo: **qué relación va entre cada par de clases** y **qué se escribe en cada
apartado del informe**. Es corto a propósito. El resto de la guía profundiza;
esto te desatasca.

:::clave Dónde estás
Si ya tienes las clases con sus atributos, tienes hecho más de lo que parece: el
Paso 1 y buena parte del 3.2.1. Lo que falta es **conectarlas** (una tarde) y
**redactar** (el grueso del trabajo). Este documento cubre lo primero y te da el
esqueleto de lo segundo.
:::

---

## 1. Una corrección antes de empezar: `Usuario` no es `Empleado`

Es la confusión más común en este enunciado, y merece la pena resolverla antes
de dibujar nada porque cambia el modelo.

- **`Empleado`** es una persona que trabaja en la empresa. Tiene legajo, sueldo,
  departamento, horas imputadas.
- **`Usuario`** es una credencial para entrar al sistema. Tiene email, contraseña
  y un rol de acceso.

No son lo mismo: el enunciado pide autenticación *y* gestión de personal como
requisitos separados. Un contador externo puede tener usuario sin ser empleado, y
un operario puede ser empleado sin usuario.

:::avanzado La respuesta que gana puntos
Si el docente te pregunta por qué las separaste: *"Porque tienen ciclos de vida
distintos. Un empleado dado de baja conserva su historial de horas, pero su
usuario se desactiva de inmediato. Fundirlas obligaría a que una baja de RRHH y
una revocación de acceso fueran la misma operación, y no lo son."*

Para la ES1 `Usuario` es **opcional**: el mínimo son 3 clases y las obligatorias
del enunciado son Empleado, Departamento, Proyecto y Registro de tiempo. Añádela
solo si vas a poder defenderla.
:::

---

## 2. Tus relaciones, resueltas

Esta es la tabla que te falta. Siete relaciones sobre el núcleo de siete clases.
Cubre los cuatro tipos que nombra la guía.

![Las seis relaciones de UML, su notación y un ejemplo de cada una](diagramas/relaciones-uml.svg)

| # | Desde | Hacia | Tipo | Multiplicidad | Por qué esa y no otra |
|:--:|---|---|---|:--:|---|
| 1 | `EmpleadoAsalariado` | `Empleado` | Generalización | — | "Es un" empleado. Solo cambia cómo calcula su sueldo |
| 2 | `EmpleadoPorHoras` | `Empleado` | Generalización | — | Igual: misma identidad, distinto cálculo |
| 3 | `Departamento` | `Empleado` | **Agregación** ◇ | `0..1` — `0..*` | Si borras el departamento, los empleados siguen existiendo: se reasignan |
| 4 | `Departamento` | `Empleado` *(rol: gerente)* | Asociación dirigida | `0..1` | "Cada departamento tendrá un nombre y **un gerente asociado**" |
| 5 | `Empleado` ↔ `Proyecto` | vía `AsignacionProyecto` | Asociación N a M **con clase asociativa** | `0..*` — `0..*` | "Los empleados pueden ser asignados a **uno o varios** proyectos", y la asignación tiene datos propios |
| 6 | `Proyecto` | `RegistroTiempo` | **Composición** ◆ | `1` — `0..*` | Un parte de horas sin su proyecto no significa nada: no hay a dónde reasignarlo |
| 7 | `Empleado` | `RegistroTiempo` | Asociación | `1` — `0..*` | "Estos registros deben estar asociados a **un empleado y a un proyecto** específico" |

### Cómo se lee cada multiplicidad

La multiplicidad se escribe **en el extremo de la línea, junto a la clase a la
que restringe**, y se lee tomando *un* objeto del otro extremo. Es la parte que
más se equivoca:

> El `0..*` que va junto a `Empleado` en la relación 3 se lee "un departamento
> agrupa de cero a muchos empleados". El `0..1` que va junto a `Departamento` se
> lee "un empleado pertenece como mucho a un departamento".

:::trampa Por qué `0..1` y no `1`
El enunciado dice "cada empleado solo puede pertenecer a un departamento a la
vez". Eso fija el **máximo** en uno, no el mínimo. Si pones `1` obligatorio, tu
modelo prohíbe registrar a alguien recién ingresado antes de asignarle área — y
el enunciado pide explícitamente que la asignación sea una operación aparte del
registro. La correcta es `0..1`.
:::

### Las dos que deciden la nota

**Agregación contra composición (relaciones 3 y 6).** Es la pregunta que cae
casi siempre en la defensa. La regla es una sola:

![Agregación contra composición: la pregunta es si la parte sobrevive al todo](diagramas/agregacion-vs-composicion.svg)

Pregúntate: *si borro el todo, ¿la parte sigue teniendo sentido?*

- Empleados de un departamento: **sí** siguen existiendo → agregación, rombo hueco.
- Partes de horas de un proyecto: **no**, no hay a dónde moverlos → composición, rombo relleno.

**La clase asociativa (relación 5).** Es la pieza que casi nadie pone y la que
más rendimiento da. El razonamiento, en tres pasos:

1. Un empleado puede estar en varios proyectos y un proyecto tiene varias
   personas → es una relación de **muchos a muchos**.
2. Esa relación tiene datos propios: **desde cuándo** está asignado, **con qué
   rol**, **con qué porcentaje de dedicación**.
3. Esos datos no caben en ninguno de los dos extremos: el porcentaje es distinto
   para cada proyecto en el que participa, y el rol es distinto para cada persona
   del proyecto. **Pertenecen a la relación**, no a las clases.

Eso es exactamente una clase asociativa. En UML se dibuja con una línea
discontinua desde la clase al centro de la asociación.

:::aviso Mermaid no dibuja la clase asociativa
Si haces el diagrama en Mermaid, la notación estándar (línea discontinua al
centro de la asociación) **no existe**. La salida honesta es dibujar
`AsignacionProyecto` como una clase normal con dos asociaciones `1` a `0..*`
—una a `Empleado`, otra a `Proyecto`— y decir en el pie de figura: *"Figura N.
`AsignacionProyecto` se modela como clase asociativa de la relación N:M entre
`Empleado` y `Proyecto`; la herramienta no representa la notación estándar de
clase asociativa."* Declararlo suma; que te lo descubran, resta.
:::

### El diagrama, en Mermaid

Copia esto, cámbialo por tus clases y tus atributos, y exporta la imagen:

```text
classDiagram
    direction TB

    class Empleado {
        <<abstract>>
        -id: str
        -nombre: str
        -fechaInicioContrato: date
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
        -nombre: str
        -fechaInicio: date
        +horasImputadas() float
    }
    class AsignacionProyecto {
        -rol: str
        -porcentajeDedicacion: int
        -fechaAsignacion: date
        +cerrar(f: date) void
    }
    class RegistroTiempo {
        -fecha: date
        -horas: float
        -descripcion: str
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

:::nota El cuarto tipo de relación
La guía nombra cuatro tipos: asociación, **dependencia**, agregación y/o
composición, y generalización. El núcleo de arriba tiene tres. Si quieres los
cuatro, la dependencia natural aquí es la generación de informes: una clase
`GeneradorInforme` que **usa** `Empleado` y `Proyecto` para producir el reporte
pero no los guarda como atributo. Se dibuja con línea discontinua y punta
abierta: `GeneradorInforme ..> Empleado : usa`. De paso cubre el requisito
"Generación de Informes" en la matriz de trazabilidad.
:::

---

## 3. El informe: qué va en cada apartado

La plantilla trae cinco apartados (I. Introducción, II. Objetivo, III.
Desarrollo, IV. Conclusiones, V. Referencias) y la guía pide seis bloques de
contenido que no coinciden con ellos. **No hay que elegir**: los bloques de la
guía entran como subtítulos dentro del "III. Desarrollo".

![Las secciones de la guía encajan como subtítulos dentro del Desarrollo de la plantilla](diagramas/estructura-informe.svg)

La propia plantilla lo autoriza:

> NOTA: Cada docente DEBE modificar, ajustar o completar los apartados del
> informe según las características o tipo de informe.

Esta es la estructura completa y de dónde sale cada pieza:

| Apartado | Qué escribes | De dónde sale | Págs. |
|---|---|---|:--:|
| **I. Introducción** | El problema de EcoTech y qué hace este informe. Escríbela al final | — | 1 |
| **II. Objetivo** | 1 objetivo general + 4 específicos, uno por criterio | — | 0,5 |
| **3.1 Análisis del problema** | 4 entidades, sus atributos y responsabilidades, 3 conceptos POO | Paso 1 | 3-4 |
| **3.2 Diseño del sistema** | Catálogo de clases, **tabla de relaciones** (la de arriba), el diagrama | Paso 2 | 4-5 |
| **3.3 Uso de herramientas de IA** | 2 prompts literales, 2 resultados, tabla de hallazgos por aspecto | Paso 3 | 4-5 |
| **3.4 Mejoras aplicadas** | Cambios justificados, 3 principios, matriz de trazabilidad | Paso 4 | 3-4 |
| **IV. Conclusiones** | Síntesis + tu postura sobre la IA en modelado | — | 1-1,5 |
| **V. Referencias** | APA 6, sangría francesa, interlineado doble | — | 0,5 |

:::clave Los diez números que se cuentan al corregir
4 entidades · 4 elementos con atributos y responsabilidades · 3 conceptos POO ·
3 clases · 3 relaciones con tipo y multiplicidad · 2 iteraciones con IA ·
2 prompts documentados · 4 hallazgos clasificados por aspecto · 3 principios de
diseño · 3 requerimientos en la matriz de trazabilidad.

Están todos desglosados con su cita textual en
[01 · Qué pide la evaluación](01-que-pide-la-evaluacion.html).
:::

### El esqueleto, listo para escribir encima

No armes el documento a mano. En esta guía está
[`esqueleto-informe.docx`](esqueleto-informe.docx): es **tu plantilla oficial**,
con la portada, los estilos y la tabla de contenidos intactos, y el cuerpo
sustituido por los 22 apartados con un recuadro gris bajo cada uno que dice qué
escribir ahí y qué mínimo exige la guía. Escribes encima y borras el recuadro.

La tabla de contenidos se actualiza sola: clic derecho sobre ella → *Actualizar
campos* → *Actualizar toda la tabla*. Funciona porque el esqueleto usa los dos
estilos que el campo del índice recoge (`Título1` y `Estilo5`); si armas los
títulos a mano con negrita, el índice sale vacío.

---

## 4. Qué hacer ahora, en orden

1. **Descarga el esqueleto** y pon tus datos en la portada. Diez minutos.
2. **Termina el diagrama** con las siete relaciones de arriba. Contrasta cada
   multiplicidad con la frase del enunciado que la justifica: esa columna es la
   que hace defendible el diagrama.
3. **Rellena 3.1 y 3.2**, que salen de lo que ya tienes hecho.
4. **Haz el Paso 3**: dos prompts a una IA, guardas los resultados tal como
   salen, y comparas con tu modelo. Es media tarde y vale un criterio entero.
5. **Cierra con 3.4**: principios nombrados y matriz de trazabilidad. Son los dos
   requisitos que casi nadie entrega.

:::aviso Lo que no se puede recortar
Si vas con el tiempo justo, el orden de sacrificio es: extensión de la prosa
primero, anexos después. **Nunca** los prompts documentados ni la matriz de
trazabilidad: son baratos de hacer y cada uno es un indicador completo. Y nunca
el diagrama, que es el objeto de la evaluación.
:::

Cuando tengas el diagrama listo, sigue por [Paso 2 · el diagrama de clases
UML](04-paso-2-modelo-uml.html) para afinarlo, y por [Cómo armar el informe
técnico](07-el-informe-tecnico.html) para el detalle de cada apartado.
