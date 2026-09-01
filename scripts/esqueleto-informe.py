#!/usr/bin/env python3
"""
Genera el esqueleto del informe a partir de la plantilla oficial de INACAP.

## Por qué se edita la plantilla en vez de crear un documento nuevo

La plantilla trae la portada maquetada, el pie de página, los estilos de la
institución y —lo que más importa— un campo de tabla de contenidos configurado
así:

    TOC \\f \\h \\z \\t "Título1,1,Estilo5,2"

Es decir: el índice NO se arma por niveles de esquema, sino por dos estilos con
nombre propio. Los apartados de nivel 1 tienen que llevar el estilo cuyo nombre
es `Título1` (styleId `Ttulo1`) y los de nivel 2 el que se llama `Estilo5`. Un
documento generado desde cero con estilos propios produciría un índice vacío y
el estudiante no sabría por qué. Partiendo de la plantilla, el índice se
actualiza solo con F9.

## Qué conserva y qué reemplaza

Conserva todo hasta el final del campo de índice: portada, saltos de sección,
encabezados, pie y la propia tabla de contenidos. Reemplaza el cuerpo -los cinco
apartados con su texto de ejemplo y el bloque "Aspectos de forma y estilo"- por
el esqueleto completo del informe, con un recuadro de instrucciones bajo cada
apartado que dice qué escribir ahí, de dónde sale y qué mínimo exige la guía.

Los recuadros van en gris y cursiva sobre fondo tenue, y empiezan por "BORRAR".
No se parecen a texto redactado, que es justo lo que se busca: nadie los deja
por descuido.

## Por qué Python

Es un generador de un solo uso y lo único que hace es manipular un ZIP. El
proyecto no tiene dependencias en tiempo de ejecución y no se van a añadir; la
biblioteca estándar de Python trae `zipfile`, que resuelve esto sin instalar
nada.

Uso:  python3 scripts/esqueleto-informe.py <plantilla.docx> <salida.docx>
"""

import re
import sys
import zipfile
from pathlib import Path

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def esc(texto: str) -> str:
    return (
        texto.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    )


# ---------------------------------------------------------------------------
# Constructores de párrafo
# ---------------------------------------------------------------------------


def parrafo(texto: str, estilo: str, *, tamano=None, negrita=False,
            color=None, cursiva=False, sombreado=None, espacio_antes=None,
            justificado=False) -> str:
    """Un párrafo con formato directo sobre el estilo indicado.

    El formato va en el `run` y no en el estilo porque la plantilla declara sus
    reglas de forma ("títulos 14 negrita, subtítulos 12, texto 11") y sus propios
    estilos no las cumplen: `Estilo3` viene a 12 pt. Aplicarlo aquí deja el
    documento conforme a lo que la propia plantilla exige.
    """
    ppr = [f'<w:pStyle w:val="{estilo}"/>']
    if sombreado:
        ppr.append(f'<w:shd w:val="clear" w:color="auto" w:fill="{sombreado}"/>')
    if espacio_antes is not None:
        ppr.append(f'<w:spacing w:before="{espacio_antes}"/>')
    if justificado:
        ppr.append('<w:jc w:val="both"/>')

    rpr = []
    if negrita:
        rpr.append("<w:b/>")
    if cursiva:
        rpr.append("<w:i/>")
    if color:
        rpr.append(f'<w:color w:val="{color}"/>')
    if tamano:
        rpr.append(f'<w:sz w:val="{tamano}"/><w:szCs w:val="{tamano}"/>')

    rpr_xml = f"<w:rPr>{''.join(rpr)}</w:rPr>" if rpr else ""
    return (
        f'<w:p><w:pPr>{"".join(ppr)}</w:pPr>'
        f'<w:r>{rpr_xml}<w:t xml:space="preserve">{esc(texto)}</w:t></w:r></w:p>'
    )


def titulo1(texto: str) -> str:
    """Apartado de nivel 1. Estilo `Ttulo1`, que el campo TDC recoge como nivel 1."""
    return parrafo(texto, "Ttulo1", tamano=28, negrita=True, espacio_antes=360)


def titulo2(texto: str) -> str:
    """Subapartado. Estilo `Estilo5`, que el campo TDC recoge como nivel 2."""
    return parrafo(texto, "Estilo5", tamano=24, negrita=True, espacio_antes=240)


def titulo3(texto: str) -> str:
    """Tercer nivel. Fuera del índice a propósito: cinco niveles lo vuelven ilegible."""
    return parrafo(texto, "Estilo3", tamano=22, negrita=True, espacio_antes=180)


def cuerpo(texto: str) -> str:
    return parrafo(texto, "Estilo3", tamano=22, justificado=True)


def instruccion(lineas: list[str]) -> str:
    """Recuadro de ayuda. Se borra al escribir encima."""
    salida = []
    for i, linea in enumerate(lineas):
        salida.append(
            parrafo(
                ("BORRAR ESTE RECUADRO · " + linea) if i == 0 else linea,
                "Estilo3",
                tamano=20,
                cursiva=True,
                color="7F7F7F",
                sombreado="F2F2F2",
                espacio_antes=120 if i == 0 else None,
            )
        )
    return "".join(salida)


def vacio() -> str:
    return '<w:p><w:pPr><w:pStyle w:val="Estilo3"/></w:pPr></w:p>'


# ---------------------------------------------------------------------------
# El esqueleto
# ---------------------------------------------------------------------------


def construir_cuerpo() -> str:
    p = []

    p.append(
        instruccion([
            "Este documento es un esqueleto. Cada recuadro gris dice qué escribir en ese apartado, "
            "de dónde sale y qué mínimo exige la guía de evaluación. Escribe encima y borra el recuadro.",
            "Cuando termines: haz clic derecho sobre la tabla de contenidos de arriba y elige "
            "«Actualizar campos» → «Actualizar toda la tabla». Después completa la portada y el pie de página.",
            "Formato que exige la plantilla: papel carta, márgenes de 2,5 cm, texto justificado, "
            "interlineado sencillo, Arial o Calibri; títulos 14 negrita, subtítulos 12 negrita, texto 11 normal.",
        ])
    )

    # --- I. Introducción ----------------------------------------------------
    p.append(titulo1("I.\tIntroducción"))
    p.append(
        instruccion([
            "Una página. La plantilla lo dice: «mediante una página». Escríbela al final, cuando ya "
            "sepas qué contiene el informe.",
            "Qué va aquí: de qué trata el informe. Presenta a EcoTech Solutions y su problema "
            "(creció, gestiona empleados, departamentos y proyectos con hojas de cálculo y sistemas aislados), "
            "di que la respuesta es un modelo orientado a objetos representado en un diagrama de clases UML, "
            "y anuncia que el proceso incluyó el uso documentado y criticado de una herramienta de IA.",
            "Cierra con un párrafo que anticipe la estructura: qué encontrará el lector en cada apartado.",
            "No pongas aquí conclusiones ni el diagrama. Solo el marco.",
        ])
    )
    p.append(vacio())

    # --- II. Objetivo -------------------------------------------------------
    p.append(titulo1("II.\tObjetivo"))
    p.append(titulo2("2.1\tObjetivo general"))
    p.append(
        instruccion([
            "Una sola frase, con verbo en infinitivo. Qué se propone lograr este trabajo.",
            "Fórmula que funciona: «Diseñar un modelo orientado a objetos para el sistema de gestión "
            "interna de EcoTech Solutions, representado mediante un diagrama de clases UML, a partir del "
            "análisis conceptual del dominio y de la evaluación crítica de propuestas generadas con "
            "herramientas de inteligencia artificial.»",
        ])
    )
    p.append(titulo2("2.2\tObjetivos específicos"))
    p.append(
        instruccion([
            "Cuatro objetivos, uno por criterio de evaluación. Así el docente ve de inmediato que el "
            "informe cubre los cuatro:",
            "1) Analizar la problemática desde los fundamentos de la POO, identificando las entidades "
            "del dominio (criterio 1.1.1).",
            "2) Elaborar un diagrama de clases en notación UML con sus relaciones estructurales y "
            "multiplicidades (criterio 1.1.2).",
            "3) Evaluar críticamente los modelos generados por una herramienta de IA, identificando "
            "errores y aspectos a mejorar (criterio 1.1.3).",
            "4) Validar el modelo final aplicando principios de diseño orientado a objetos y una "
            "matriz de trazabilidad (criterio 1.1.4).",
        ])
    )
    p.append(vacio())

    # --- III. Desarrollo ----------------------------------------------------
    p.append(titulo1("III.\tDesarrollo"))
    p.append(
        instruccion([
            "Este es el cuerpo del informe y donde se juega la nota. La plantilla solo trae "
            "«Desarrollo» como un apartado suelto; los cuatro subapartados que siguen son los que exige "
            "la guía de evaluación. La propia plantilla autoriza el ajuste: «Cada docente DEBE modificar, "
            "ajustar o completar los apartados del informe según las características o tipo de informe».",
            "Extensión orientativa del Desarrollo completo: entre 14 y 18 páginas.",
        ])
    )

    p.append(titulo2("3.1\tAnálisis del problema"))
    p.append(
        instruccion([
            "Sale del Paso 1 (criterio 1.1.1). De 3 a 4 páginas. Es el apartado que demuestra que el "
            "modelo salió de tu análisis y no de un generador.",
        ])
    )
    p.append(titulo3("3.1.1\tEntidades relevantes del dominio"))
    p.append(
        instruccion([
            "MÍNIMO: 4 entidades. Nombra cada una y justifica en dos o tres líneas por qué es una "
            "entidad y no un atributo de otra: tiene identidad propia (dos ejemplares con los mismos "
            "datos siguen siendo cosas distintas), tiene estado que cambia y tiene comportamiento.",
            "Las cuatro que el enunciado pide sí o sí: Empleado, Departamento, Proyecto y Registro de "
            "tiempo. Di también qué descartaste y por qué (por ejemplo, «Dirección» no es entidad: dos "
            "direcciones iguales son la misma dirección, no necesita identidad propia).",
        ])
    )
    p.append(titulo3("3.1.2\tAtributos, objetos y responsabilidades"))
    p.append(
        instruccion([
            "MÍNIMO: 4 elementos del problema, cada uno con sus atributos, posibles OBJETOS y al menos "
            "1 responsabilidad. Una tabla por entidad funciona bien.",
            "Ojo con «posibles objetos»: son INSTANCIAS concretas, no clases. Para Empleado, un objeto "
            "posible es «Lucía Ferreyra, legajo ECO-000003, ingresó el 02/09/2019». Confundir esto con "
            "«subclases de Empleado» es el error más frecuente de este apartado.",
            "Responsabilidad es algo que el objeto SABE HACER, redactado como verbo: «calcular su "
            "remuneración mensual», «validar que sus horas no excedan el máximo diario».",
        ])
    )
    p.append(titulo3("3.1.3\tConceptos del problema y fundamentos de la POO"))
    p.append(
        instruccion([
            "MÍNIMO: 3 conceptos del problema vinculados a fundamentos de la POO. No definiciones de "
            "manual: casos concretos de EcoTech.",
            "Ejemplos que funcionan: el salario y los datos personales como caso de ENCAPSULAMIENTO "
            "(el enunciado exige cifrarlos y restringir su acceso, así que no pueden ser atributos "
            "públicos); las tres modalidades de contrato como caso de HERENCIA y POLIMORFISMO (cada una "
            "calcula distinto su remuneración); la ficha de empleado como caso de ABSTRACCIÓN (el "
            "sistema retiene lo que le sirve a la gestión, no todo lo que se sabe de una persona).",
        ])
    )
    p.append(titulo3("3.1.4\tCómo el enfoque orientado a objetos estructura la solución"))
    p.append(
        instruccion([
            "Responde a los CINCO problemas que declara la empresa, uno por uno: duplicidad de "
            "información, errores en la asignación de personal, falta de trazabilidad de horas, reportes "
            "poco confiables y riesgo sobre los datos personales.",
            "Para cada uno: qué elemento del modelo lo resuelve. Ejemplo: la duplicidad se resuelve con "
            "identidad propia (un ID único generado por el sistema) más un atributo que actúa como clave "
            "natural; la trazabilidad, con un RegistroTiempo que no se puede editar una vez aprobado.",
        ])
    )
    p.append(vacio())

    p.append(titulo2("3.2\tDiseño del sistema"))
    p.append(
        instruccion([
            "Sale del Paso 2 (criterio 1.1.2). De 4 a 5 páginas. Aquí va EL diagrama.",
        ])
    )
    p.append(titulo3("3.2.1\tCatálogo de clases: atributos y métodos"))
    p.append(
        instruccion([
            "MÍNIMO: 3 clases principales, con atributos Y métodos. Una tabla por clase, con columnas "
            "Miembro / Visibilidad / Tipo / Para qué sirve.",
            "La visibilidad se escribe con los signos de UML: - privado, + público, # protegido, "
            "~ de paquete. Escribir «private» en vez de «-» es un error de notación que cuesta puntos.",
        ])
    )
    p.append(titulo3("3.2.2\tRelaciones estructurales y multiplicidades"))
    p.append(
        instruccion([
            "MÍNIMO: 3 relaciones con su TIPO y su MULTIPLICIDAD. La guía nombra cuatro tipos: "
            "asociación, dependencia, agregación y/o composición, y generalización (herencia).",
            "Usa una tabla con columnas: Origen / Destino / Tipo / Multiplicidad / Frase del enunciado "
            "que la justifica. Esa última columna es la que convierte el diagrama en algo defendible.",
            "Cuidado: la multiplicidad solo existe en las ASOCIACIONES (incluidas agregación y "
            "composición). La herencia y la dependencia no llevan multiplicidad, y ponérsela es un error "
            "de notación.",
        ])
    )
    p.append(titulo3("3.2.3\tModelo inicial y modelo final"))
    p.append(
        instruccion([
            "La guía pide presentar los DOS. Pon las dos figuras y, debajo, una tabla de cambios: "
            "Qué cambió / Por qué / Qué criterio técnico lo justifica.",
            "Cuidado con la ambigüedad: «modelo inicial» puede leerse como tu primer modelo del Paso 2 "
            "o como el que generó la IA en el Paso 3. Resuélvelo mostrando los dos y rotulándolos sin "
            "ambigüedad: «Figura 2. Modelo propio inicial (Paso 2)» y «Figura 3. Modelo generado por IA "
            "(iteración 1)».",
        ])
    )
    p.append(titulo3("3.2.4\tExplicación del diagrama de clases UML definitivo"))
    p.append(
        instruccion([
            "La figura con el diagrama final, a página completa si hace falta, y un recorrido en prosa: "
            "empieza por la clase central, sigue por la jerarquía de herencia, después las relaciones, y "
            "cierra con la clase asociativa.",
            "El diagrama tiene que leerse impreso en papel carta con márgenes de 2,5 cm: quedan 16,6 cm "
            "de ancho útil. Si no se lee, divídelo en vistas parciales y rotúlalas como «vista parcial del "
            "mismo modelo», no como modelos distintos.",
            "Toda figura lleva número y pie: «Figura 4. Diagrama de clases definitivo del sistema de "
            "gestión interna de EcoTech Solutions. Elaboración propia.»",
        ])
    )
    p.append(vacio())

    p.append(titulo2("3.3\tUso de herramientas de IA"))
    p.append(
        instruccion([
            "Sale del Paso 3 (criterio 1.1.3). De 4 a 5 páginas. Es el apartado que más gente entrega "
            "incompleto y el más barato de cumplir.",
        ])
    )
    p.append(titulo3("3.3.1\tHerramienta, versión y contexto de uso"))
    p.append(
        instruccion([
            "Qué herramienta usaste, qué versión y en qué fecha. La fecha importa: los modelos cambian, "
            "y sin ella el resultado no es reproducible ni verificable.",
            "Declara también para qué la usaste y para qué NO. Esa declaración te protege: la guía "
            "advierte que entregar resultados generados exclusivamente por IA se considera insuficiente.",
        ])
    )
    p.append(titulo3("3.3.2\tIteración 1: prompt y resultado obtenido"))
    p.append(
        instruccion([
            "MÍNIMO: el prompt LITERAL, transcrito completo, incluyendo el contexto del problema y las "
            "instrucciones de formato. Ponlo en un recuadro o en fuente monoespaciada para que se vea que "
            "es una transcripción y no una paráfrasis.",
            "Debajo, el resultado tal como salió: la figura del diagrama que devolvió, con sus errores "
            "sin corregir. Ese es el valor de la evidencia.",
        ])
    )
    p.append(titulo3("3.3.3\tIteración 2: prompt y resultado obtenido"))
    p.append(
        instruccion([
            "MÍNIMO: la guía pide DOS iteraciones. La segunda tiene que ser mejor que la primera "
            "PORQUE ya sabes qué falló: el prompt nuevo corrige lo que detectaste.",
            "Di explícitamente qué cambiaste en el prompt y qué esperabas conseguir con el cambio. Ahí "
            "es donde se ve el criterio propio.",
        ])
    )
    p.append(titulo3("3.3.4\tEvaluación crítica de los aportes de la IA"))
    p.append(
        instruccion([
            "MÍNIMO: 4 elementos (errores, similitudes o diferencias) CLASIFICADOS POR ASPECTO DEL "
            "MODELO: clases, atributos o relaciones. La clasificación es literal en la guía; si entregas "
            "una lista sin la columna «Aspecto», el indicador queda incumplido.",
            "Tabla con columnas: # / Aspecto (clase, atributo o relación) / Qué hizo la IA / Qué dice mi "
            "análisis / Tipo (error, omisión o coincidencia) / Corrección aplicada.",
            "Incluye al menos una COINCIDENCIA, no solo errores: demuestra que comparaste de verdad y "
            "no que buscaste defectos.",
        ])
    )
    p.append(vacio())

    p.append(titulo2("3.4\tMejoras aplicadas"))
    p.append(
        instruccion([
            "Sale del Paso 4 (criterio 1.1.4). De 3 a 4 páginas.",
        ])
    )
    p.append(titulo3("3.4.1\tJustificación de los cambios realizados al modelo"))
    p.append(
        instruccion([
            "Tabla antes/después: Qué cambió / Del modelo inicial al final / Criterio técnico que lo "
            "justifica. Un cambio sin criterio técnico es una opinión.",
        ])
    )
    p.append(titulo3("3.4.2\tAplicación de principios de diseño orientado a objetos"))
    p.append(
        instruccion([
            "MÍNIMO: 3 principios aplicados «en la mayoría de las clases». La guía sugiere cohesión, "
            "responsabilidad única, encapsulamiento y claridad.",
            "Define cada principio en una línea y después una tabla Clase / Principio / Cómo se ve en "
            "el modelo, cubriendo más de la mitad de tus clases. Nombrar los principios importa: si los "
            "aplicas sin nombrarlos, el corrector no puede darlos por cumplidos.",
        ])
    )
    p.append(titulo3("3.4.3\tValidación: matriz de trazabilidad"))
    p.append(
        instruccion([
            "MÍNIMO: 3 requerimientos relacionados con sus clases. Es el requisito que casi nadie "
            "entrega y es de los más fáciles.",
            "Tabla con columnas: Requisito del enunciado / Clases que lo realizan / Método o atributo "
            "concreto / Cómo se verifica. El enunciado tiene 10 requisitos del sistema; cubrirlos todos "
            "cuesta poco más que cubrir 3 y se nota.",
        ])
    )
    p.append(titulo3("3.4.4\tViabilidad técnica de la implementación en Python"))
    p.append(
        instruccion([
            "La guía define la ES1 como «una solución de software en Python» y el Paso 4 cierra "
            "«defendiendo la viabilidad técnica del diseño definitivo en Python». Este subapartado responde "
            "a eso.",
            "Una tabla de correspondencia UML → Python (clase abstracta → class X(ABC); método abstracto "
            "→ @abstractmethod; atributo privado → self._nombre; composición → la lista vive dentro del "
            "todo; multiplicidad 0..* → una lista; 0..1 → Optional) y un fragmento de código de una o dos "
            "clases que lo demuestre.",
        ])
    )
    p.append(vacio())

    # --- IV. Conclusiones ---------------------------------------------------
    p.append(titulo1("IV.\tConclusiones"))
    p.append(
        instruccion([
            "De 1 a 1,5 páginas. La plantilla pide «una síntesis, donde se expongan ideas principales y "
            "algunas ideas personales», y admite «reflexiones» y «propuestas de profundización».",
            "Estructura que funciona: un párrafo de síntesis de lo logrado; un párrafo sobre qué "
            "aportó realmente el enfoque orientado a objetos a ESTE problema; un párrafo con tu postura "
            "sobre el uso de IA en modelado (qué hizo bien, qué no puede hacer, por qué el criterio "
            "propio sigue siendo necesario); y un párrafo de lo que quedó fuera y se abordaría después.",
            "No introduzcas información nueva. Una conclusión que presenta un dato que no está en el "
            "desarrollo es un desarrollo incompleto.",
        ])
    )
    p.append(vacio())

    # --- V. Referencias -----------------------------------------------------
    p.append(titulo1("V.\tReferencias bibliográficas"))
    p.append(
        instruccion([
            "Norma APA 6, interlineado doble y sangría francesa, ordenadas alfabéticamente. La propia "
            "guía te da dos referencias ya usables; añade las que hayas consultado de verdad.",
            "Ojo: APA 6 es de 2010 y no contempla cómo citar una herramienta de IA. Lo defendible es "
            "no citarla como fuente bibliográfica sino declarar su uso en el apartado 3.3, que es "
            "exactamente lo que pide la guía.",
        ])
    )
    p.append(
        parrafo(
            "Jiménez de Parga, C. (2021). UML: arquitectura de aplicaciones en Java, C++ y Python "
            "(1.ª ed.). Ra-Ma.",
            "Estilo3", tamano=22,
        )
    )
    p.append(
        parrafo(
            "Sánchez Palacio, A. (2025). ChatGPT y OpenAI: desarrollo y uso de herramientas de "
            "inteligencia artificial generativa. RA-MA Editorial.",
            "Estilo3", tamano=22,
        )
    )
    p.append(vacio())

    # --- Anexos -------------------------------------------------------------
    p.append(titulo1("Anexos"))
    p.append(
        instruccion([
            "Opcional pero recomendado: descarga el cuerpo del informe sin perder la evidencia.",
            "Anexo A. Transcripción íntegra de los prompts y las respuestas de la IA.",
            "Anexo B. Catálogo extendido de hallazgos sobre los modelos generados.",
            "Anexo C. Matriz de trazabilidad completa, con los 10 requisitos del enunciado.",
            "Anexo D. Prototipo funcional en Python (si lo incluyes).",
            "Recuerda: lo que no esté DENTRO de este archivo no se corrige. Un enlace a un repositorio "
            "no es evidencia entregada; la guía dice «NO SE RECIBIRÁN ENTREGAS POR CORREO».",
        ])
    )

    return "".join(p)


# ---------------------------------------------------------------------------


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__.strip().splitlines()[-1])
        return 2
    plantilla, salida = Path(sys.argv[1]), Path(sys.argv[2])
    if not plantilla.exists():
        print(f"No existe la plantilla: {plantilla}")
        return 1

    with zipfile.ZipFile(plantilla) as z:
        orden_original = z.namelist()
        entradas = {n: z.read(n) for n in orden_original}

    documento = entradas["word/document.xml"].decode("utf-8")

    # Se conserva todo hasta el final del campo de la tabla de contenidos, que
    # es el ultimo parrafo con un `fldChar` de cierre; a partir de ahi empieza
    # el cuerpo de ejemplo que se reemplaza.
    fin_indice = documento.rfind('w:fldCharType="end"')
    if fin_indice == -1:
        print("No se encontro el campo de la tabla de contenidos en la plantilla.")
        return 1
    corte = documento.index("</w:p>", fin_indice) + len("</w:p>")

    # El `sectPr` final define el tamanio de pagina y los margenes: se conserva
    # junto con el cierre del documento. Olvidar `</w:document>` deja el XML
    # truncado y Word rechaza el archivo sin decir por que.
    m_sect = re.search(
        r"<w:sectPr(?:(?!</w:sectPr>).)*</w:sectPr>\s*</w:body>\s*</w:document>",
        documento,
        re.S,
    )
    if not m_sect:
        print("No se encontro el sectPr final.")
        return 1
    cola = m_sect.group(0)

    # El corte no puede caer dentro de un bloque `<w:sdt>`: partiria la
    # estructura del control de contenido que envuelve la tabla de contenidos.
    encabezado = documento[:corte]
    if encabezado.count("<w:sdt>") != encabezado.count("</w:sdt>"):
        print("El corte cae dentro de un <w:sdt>; se abortaria con XML invalido.")
        return 1

    nuevo = documento[:corte] + construir_cuerpo() + cola

    # Se comprueba antes de escribir: un XML mal formado produce un .docx que
    # Word abre con un error generico, y encontrar la causa despues cuesta mucho
    # mas que comprobarlo aqui.
    from xml.etree import ElementTree

    try:
        ElementTree.fromstring(nuevo)
    except ElementTree.ParseError as error:
        print(f"El documento generado no es XML valido: {error}")
        return 1

    entradas["word/document.xml"] = nuevo.encode("utf-8")

    salida.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(salida, "w", zipfile.ZIP_DEFLATED) as z:
        # Se respeta el orden original de las entradas. Reordenarlas no deberia
        # importar -el formato no lo exige- pero el objetivo aqui es que el
        # archivo se diferencie del que ya abre bien en Word EXACTAMENTE en el
        # cuerpo del documento y en nada mas.
        for nombre in orden_original:
            z.writestr(nombre, entradas[nombre])

    print(f"Esqueleto escrito en {salida} ({salida.stat().st_size // 1024} KiB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
