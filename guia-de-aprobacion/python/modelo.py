"""
EcoTech Solutions — el modelo de clases UML, traducido a Python.

Este archivo existe por una razón muy concreta de la evaluación. La guía dice
dos veces que la ES1 es "un informe técnico del diseño y desarrollo de una
solución de software **en Python**", y el Paso 4 cierra pidiendo que defiendas
"la viabilidad técnica del diseño definitivo en Python". Un diagrama UML es
independiente del lenguaje, pero esa afirmación hay que poder demostrarla, no
solo decirla: aquí está el mismo modelo del diagrama, en Python, y funciona.

No es la implementación del sistema. Es el ESQUELETO ESTRUCTURAL: las clases,
sus atributos, sus relaciones y los métodos que el diagrama declara. Sirve para
tres cosas:

1. Demostrar en la defensa que el modelo se traduce a Python sin torcerlo.
2. Comprobar que el diagrama es coherente: si una relación está mal pensada, al
   escribirla en código se nota enseguida.
3. Enseñar cómo cada elemento de la notación UML se convierte en código, que es
   la pregunta que un docente hace con más frecuencia.

Cómo se ejecuta:

    python3 modelo.py

No necesita instalar nada: solo la biblioteca estándar de Python 3.10 o
superior.

------------------------------------------------------------------------------
CORRESPONDENCIA UML -> PYTHON
------------------------------------------------------------------------------

    UML                             Python
    ------------------------------  --------------------------------------
    Clase abstracta (en cursiva)    class X(ABC)
    Método abstracto (en cursiva)   @abstractmethod
    Atributo privado    - nombre    self._nombre   (un guion bajo)
    Atributo protegido  # nombre    self._nombre   (convención igual)
    Atributo público    + nombre    self.nombre    (sin guion bajo)
    Atributo de solo lectura        @property sin @x.setter
    Generalización (triángulo)      class Hija(Madre)
    Composición (rombo relleno)     la lista vive dentro del todo y se crea
                                    y se destruye con él
    Agregación (rombo hueco)        se guarda una referencia; el objeto
                                    referenciado existe fuera
    Clase asociativa                una clase propia con referencias a los dos
                                    extremos más sus atributos propios
    Multiplicidad 0..*              una lista
    Multiplicidad 0..1              un Optional[...]
    Enumeración  <<enumeration>>    class X(Enum)

Python no tiene modificadores de visibilidad reales: `private` no existe. El
guion bajo es una convención, no una barrera. Eso NO invalida el
encapsulamiento del modelo, y conviene saber decirlo así en la defensa: el
encapsulamiento es una decisión de diseño sobre quién puede tocar qué, y el
lenguaje solo ofrece más o menos ayuda para sostenerla. Python la sostiene con
`property`, que es lo que se usa aquí.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from enum import Enum
from itertools import count
from typing import Optional


# =============================================================================
# Raíz de la jerarquía
# =============================================================================


class Entidad(ABC):
    """
    Todo objeto del dominio que tiene identidad propia y vida independiente.

    En el diagrama es la clase abstracta de la que cuelga la jerarquía. Justifica
    su existencia un requisito literal del enunciado: "se debe asignar
    automáticamente un ID único a cada empleado". Si el identificador se genera
    solo, alguien tiene que generarlo; ponerlo aquí evita repetir ese código en
    cada clase, que es exactamente lo que la guía pide cuando dice "utiliza
    herencia y polimorfismo de manera efectiva para evitar duplicación de
    código".

    `_secuencias` es un atributo DE CLASE, no de instancia: hay uno solo,
    compartido por toda la jerarquía. En UML se dibuja subrayado.

    Se lleva un contador por prefijo y no uno global. Con un contador único, el
    primer departamento se llamaría DEP-000004 solo porque antes se crearon tres
    empleados, y eso es lo primero que pregunta quien revisa el modelo.
    """

    _secuencias: dict[str, count] = {}

    def __init__(self) -> None:
        prefijo = self.prefijo()
        if prefijo not in Entidad._secuencias:
            Entidad._secuencias[prefijo] = count(1)
        self._id: str = f"{prefijo}-{next(Entidad._secuencias[prefijo]):06d}"
        self._creado_en: date = date.today()

    @staticmethod
    @abstractmethod
    def prefijo() -> str:
        """Prefijo legible del identificador. Cada subclase decide el suyo."""

    @property
    def id(self) -> str:
        """Identidad. Solo lectura: un identificador que cambia no identifica."""
        return self._id

    @property
    def creado_en(self) -> date:
        return self._creado_en

    def __repr__(self) -> str:
        return f"<{type(self).__name__} {self._id}>"


# =============================================================================
# Personas y empleados
# =============================================================================


@dataclass(frozen=True)
class DatosPersonales:
    """
    Los datos sensibles, agrupados en un objeto de valor.

    El enunciado los enumera juntos ("nombre, dirección, número de teléfono,
    dirección de correo electrónico") y además exige que se almacenen "de forma
    segura utilizando técnicas de cifrado adecuadas". Agruparlos en una sola
    clase da un único sitio donde cifrar y descifrar, en lugar de cuatro
    atributos sueltos repartidos por `Empleado`.

    `frozen=True` los hace inmutables: un objeto de valor no se modifica, se
    reemplaza. En UML esto se marca con el estereotipo «valueObject».
    """

    direccion: str
    telefono: str
    email_personal: str
    documento: str

    def enmascarado(self) -> "DatosPersonales":
        """
        Versión para quien no tiene permiso de lectura sensible.

        Devolver esto en vez de lanzar un error es deliberado: la ficha se puede
        abrir igual, pero los campos protegidos no viajan en claro.
        """
        return DatosPersonales(
            direccion="•••",
            telefono="•••",
            email_personal="•••",
            documento="•••",
        )


class Persona(Entidad):
    """
    Abstracción de una persona con nombre y correo corporativo.

    Se separa de `Empleado` a propósito. Hoy el sistema solo maneja empleados,
    pero el enunciado ya nombra "administradores de recursos humanos" y
    "gerentes", y un contratista externo podría no ser empleado. Tener el tramo
    "es una persona" separado del tramo "es un empleado" deja sitio para eso sin
    rehacer la jerarquía.

    Es abstracta: nadie instancia una Persona suelta.
    """

    def __init__(self, nombre: str, apellido: str, datos: DatosPersonales) -> None:
        super().__init__()
        self._nombre = nombre
        self._apellido = apellido
        self._datos = datos

    @property
    def nombre_completo(self) -> str:
        return f"{self._apellido}, {self._nombre}"

    @property
    def email_corporativo(self) -> str:
        """Se deriva del nombre; no se guarda, se calcula. Un dato derivado
        guardado es un dato que se puede desincronizar."""
        inicial = self._nombre[0].lower()
        apellido = self._apellido.lower().replace(" ", "")
        return f"{inicial}.{apellido}@ecotech.com"

    def datos_personales(self, con_permiso: bool) -> DatosPersonales:
        """
        Único acceso a los datos sensibles, y pasa por una comprobación.

        Esto es encapsulamiento haciendo trabajo real: no hay forma de leer el
        teléfono de alguien sin pasar por aquí, así que la regla de acceso vive
        en un solo sitio y no se puede olvidar en la pantalla número siete.
        """
        return self._datos if con_permiso else self._datos.enmascarado()

    @abstractmethod
    def descripcion_rol(self) -> str:
        """Qué es esta persona dentro de la organización."""


class Empleado(Persona):
    """
    Empleado de la empresa. Abstracta: no existe "un empleado" a secas, existe
    un asalariado, uno por horas o un contratista.

    Aquí está la decisión de diseño más discutible del modelo y la que más
    preguntas recibe en una defensa, así que conviene tenerla clara:

    Por qué HERENCIA y no un atributo `tipo_contrato`. Porque las tres
    modalidades no se diferencian en un dato, se diferencian en un COMPORTAMIENTO:
    el sueldo del asalariado es fijo, el del que va por horas se multiplica por
    las horas aprobadas, y el del contratista se factura contra un tope. Con un
    atributo `tipo`, ese cálculo acaba en un `if` de tres ramas que hay que tocar
    cada vez que RRHH inventa una modalidad nueva. Con herencia, añadir una
    modalidad es añadir una clase y no tocar nada de lo que ya funciona.

    El contraargumento honesto, que conviene reconocer si te lo plantean: si una
    persona cambia de modalidad, con herencia hay que crear otro objeto, porque
    en Python un objeto no cambia de clase. Es el precio, y se paga con gusto
    porque un cambio de modalidad es un hecho administrativo poco frecuente y
    normalmente implica un contrato nuevo de todas formas.
    """

    @staticmethod
    def prefijo() -> str:
        return "ECO"

    def __init__(
        self,
        nombre: str,
        apellido: str,
        datos: DatosPersonales,
        fecha_inicio_contrato: date,
    ) -> None:
        super().__init__(nombre, apellido, datos)
        self._fecha_inicio_contrato = fecha_inicio_contrato
        self._activo = True
        # Agregación con Departamento: se guarda una referencia. El
        # departamento existe con independencia del empleado, y el empleado
        # sobrevive a que lo saquen de él. Multiplicidad 0..1 -> Optional.
        self._departamento: Optional["Departamento"] = None

    @property
    def activo(self) -> bool:
        return self._activo

    @property
    def departamento(self) -> Optional["Departamento"]:
        return self._departamento

    @property
    def antiguedad_anios(self) -> int:
        return (date.today() - self._fecha_inicio_contrato).days // 365

    def dar_de_baja(self) -> None:
        """
        Baja lógica, no borrado.

        Un empleado dado de baja tiene horas imputadas y participaciones en
        proyectos cerrados; borrarlo dejaría esos registros apuntando al vacío y
        rompería la trazabilidad, que es justo uno de los cinco problemas que la
        empresa declara.
        """
        self._activo = False

    def asignar_a(self, departamento: "Departamento") -> None:
        """
        Reasignación. El enunciado exige que sea a uno "a la vez", así que
        primero se sale del anterior y después se entra en el nuevo.

        Que los dos lados se actualicen aquí, en un solo método, es lo que evita
        el estado inconsistente: un empleado que cree estar en Ventas mientras
        Ventas no lo tiene en su lista.
        """
        if self._departamento is not None:
            self._departamento._quitar(self)
        self._departamento = departamento
        departamento._agregar(self)

    @abstractmethod
    def calcular_remuneracion_mensual(self, horas_aprobadas: float) -> float:
        """
        EL método polimórfico del modelo.

        Quien lo llama no sabe ni le importa de qué subclase es el objeto. Ese
        es el polimorfismo que la guía pide "de manera efectiva": no es un
        adorno, es lo que permite que el informe de nómina recorra una lista
        mezclada sin un solo `if`.
        """

    def descripcion_rol(self) -> str:
        return f"Empleado {type(self).__name__.replace('Empleado', '').lower() or 'general'}"


class EmpleadoAsalariado(Empleado):
    """Sueldo fijo mensual. Las horas se registran igual, para trazabilidad,
    pero no alteran lo que cobra."""

    def __init__(self, *args, salario_mensual: float, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._salario_mensual = salario_mensual

    def calcular_remuneracion_mensual(self, horas_aprobadas: float) -> float:
        return self._salario_mensual


class EmpleadoPorHoras(Empleado):
    """Cobra por hora efectivamente aprobada."""

    def __init__(self, *args, tarifa_hora: float, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._tarifa_hora = tarifa_hora

    def calcular_remuneracion_mensual(self, horas_aprobadas: float) -> float:
        return round(self._tarifa_hora * horas_aprobadas, 2)


class Contratista(Empleado):
    """
    Factura por horas pero con un techo mensual pactado.

    Es la subclase que justifica la jerarquía: si solo hubiera asalariados y
    gente por horas, un atributo booleano podría bastar. La tercera regla, con
    su tope, es la que convierte el `if` en insostenible.
    """

    def __init__(self, *args, tarifa_hora: float, tope_mensual: float, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._tarifa_hora = tarifa_hora
        self._tope_mensual = tope_mensual

    def calcular_remuneracion_mensual(self, horas_aprobadas: float) -> float:
        return round(min(self._tarifa_hora * horas_aprobadas, self._tope_mensual), 2)


# =============================================================================
# Organización
# =============================================================================


class Departamento(Entidad):
    """
    Unidad organizativa. Agrega empleados y tiene un gerente.

    La relación con Empleado es AGREGACIÓN, no composición: si se elimina el
    departamento los empleados siguen existiendo y se reasignan. Un empleado no
    es una pieza del departamento; es alguien que pertenece a él por ahora.
    """

    @staticmethod
    def prefijo() -> str:
        return "DEP"

    def __init__(self, nombre: str, descripcion: str = "") -> None:
        super().__init__()
        self._nombre = nombre
        self._descripcion = descripcion
        self._gerente: Optional[Empleado] = None
        self._empleados: list[Empleado] = []

    @property
    def nombre(self) -> str:
        return self._nombre

    @property
    def empleados(self) -> tuple[Empleado, ...]:
        """
        Se devuelve una tupla, no la lista interna.

        Si se devolviera `self._empleados`, quien la reciba podría hacer
        `.append()` y meter un empleado saltándose `asignar_a`, dejando al
        empleado sin saber en qué departamento está. Devolver una copia
        inmutable es encapsulamiento de verdad, no un `_` decorativo.
        """
        return tuple(self._empleados)

    @property
    def gerente(self) -> Optional[Empleado]:
        return self._gerente

    def designar_gerente(self, empleado: Empleado) -> None:
        """Regla de negocio: el gerente tiene que pertenecer al departamento."""
        if empleado not in self._empleados:
            raise ValueError(
                f"{empleado.nombre_completo} no pertenece a {self._nombre}: "
                "no puede ser su gerente."
            )
        self._gerente = empleado

    def _agregar(self, empleado: Empleado) -> None:
        """Interno: lo llama `Empleado.asignar_a`, que mantiene los dos lados."""
        if empleado not in self._empleados:
            self._empleados.append(empleado)

    def _quitar(self, empleado: Empleado) -> None:
        if empleado in self._empleados:
            self._empleados.remove(empleado)
        if self._gerente is empleado:
            self._gerente = None


class EstadoProyecto(Enum):
    """
    Ciclo de vida de un proyecto. En UML es una «enumeration».

    Un enum en vez de una cadena suelta evita el clásico proyecto en estado
    "EN CURSO " con un espacio de más que no coincide con ningún filtro.
    """

    PLANIFICADO = "Planificado"
    EN_CURSO = "En curso"
    SUSPENDIDO = "Suspendido"
    CERRADO = "Cerrado"


class Proyecto(Entidad):
    """
    Proyecto de la empresa.

    Con RegistroTiempo la relación es COMPOSICIÓN: un registro de horas no
    significa nada sin su proyecto, y si el proyecto desaparece no hay a dónde
    reasignar sus registros. Con Empleado, en cambio, es una asociación N a M
    que además lleva datos propios, y por eso necesita una clase intermedia.
    """

    @staticmethod
    def prefijo() -> str:
        return "PRY"

    # Transiciones permitidas. Tenerlas como dato y no como una cadena de `if`
    # hace que la regla se pueda leer de un vistazo y probar entera.
    _TRANSICIONES = {
        EstadoProyecto.PLANIFICADO: {EstadoProyecto.EN_CURSO, EstadoProyecto.CERRADO},
        EstadoProyecto.EN_CURSO: {EstadoProyecto.SUSPENDIDO, EstadoProyecto.CERRADO},
        EstadoProyecto.SUSPENDIDO: {EstadoProyecto.EN_CURSO, EstadoProyecto.CERRADO},
        EstadoProyecto.CERRADO: set(),
    }

    def __init__(self, nombre: str, descripcion: str, fecha_inicio: date) -> None:
        super().__init__()
        self._nombre = nombre
        self._descripcion = descripcion
        self._fecha_inicio = fecha_inicio
        self._estado = EstadoProyecto.PLANIFICADO
        self._registros: list["RegistroTiempo"] = []

    @property
    def nombre(self) -> str:
        return self._nombre

    @property
    def estado(self) -> EstadoProyecto:
        return self._estado

    def cambiar_estado(self, nuevo: EstadoProyecto) -> None:
        if nuevo not in Proyecto._TRANSICIONES[self._estado]:
            raise ValueError(
                f"No se puede pasar de {self._estado.value} a {nuevo.value}."
            )
        self._estado = nuevo

    def horas_imputadas(self) -> float:
        return sum(r.horas for r in self._registros if r.estado is EstadoParte.APROBADO)

    def _registrar(self, registro: "RegistroTiempo") -> None:
        self._registros.append(registro)


# =============================================================================
# La clase asociativa
# =============================================================================


@dataclass
class AsignacionProyecto:
    """
    LA CLASE ASOCIATIVA del modelo. Es la pieza que casi ningún diagrama
    generado por IA incluye, y la que más puntos da explicar bien.

    El razonamiento es este. El enunciado dice que "los empleados pueden ser
    asignados a uno o varios proyectos": eso es una relación de muchos a muchos.
    Una N a M pelada se puede dibujar como una línea con `0..*` en los dos
    extremos. Pero en cuanto la relación tiene datos PROPIOS -desde cuándo está
    asignado, con qué porcentaje de dedicación, con qué rol- esos datos no
    caben en ninguno de los dos extremos:

      · en Empleado no caben, porque el porcentaje es distinto para cada
        proyecto en el que participa;
      · en Proyecto tampoco, porque el rol es distinto para cada persona.

    Pertenecen a la RELACIÓN, no a los objetos que relaciona. Eso es exactamente
    lo que UML llama clase asociativa, y en código es una clase con una
    referencia a cada extremo más sus atributos.

    Fíjate en `fecha_desasignacion`: la participación no se borra cuando alguien
    sale del proyecto, se cierra. Borrarla dejaría las horas ya imputadas sin
    explicación de por qué esa persona las imputó.
    """

    empleado: Empleado
    proyecto: Proyecto
    rol: str
    porcentaje_dedicacion: int
    fecha_asignacion: date
    fecha_desasignacion: Optional[date] = None

    def __post_init__(self) -> None:
        if not 1 <= self.porcentaje_dedicacion <= 100:
            raise ValueError("La dedicación debe estar entre 1 y 100.")

    @property
    def vigente(self) -> bool:
        return self.fecha_desasignacion is None

    def cerrar(self, fecha: date) -> None:
        if fecha < self.fecha_asignacion:
            raise ValueError("La desasignación no puede ser anterior a la asignación.")
        self.fecha_desasignacion = fecha


# =============================================================================
# Registro de tiempo
# =============================================================================


class EstadoParte(Enum):
    """Circuito de aprobación de un parte de horas."""

    BORRADOR = "Borrador"
    ENVIADO = "Enviado"
    APROBADO = "Aprobado"
    RECHAZADO = "Rechazado"


class RegistroTiempo(Entidad):
    """
    Un parte de horas: quién, en qué proyecto, qué día, cuántas horas y
    haciendo qué.

    El enunciado dice que "estos registros de tiempo deben estar asociados a un
    empleado y a un proyecto específico". Las dos referencias son obligatorias:
    aquí no hay `Optional`, y eso en UML se dibuja como multiplicidad `1` en
    ambos extremos.

    El circuito de estados es lo que da la trazabilidad que la empresa echa en
    falta: un parte aprobado ya no se puede editar, así que la nómina se calcula
    sobre datos que nadie puede cambiar después.
    """

    @staticmethod
    def prefijo() -> str:
        return "REG"

    def __init__(
        self,
        empleado: Empleado,
        proyecto: Proyecto,
        fecha: date,
        horas: float,
        descripcion: str,
    ) -> None:
        super().__init__()
        if not 0.25 <= horas <= 12:
            raise ValueError("Un parte admite entre 0,25 y 12 horas.")
        if len(descripcion.strip()) < 10:
            raise ValueError("Describe la tarea con al menos 10 caracteres.")
        self._empleado = empleado
        self._proyecto = proyecto
        self._fecha = fecha
        self._horas = horas
        self._descripcion = descripcion
        self._estado = EstadoParte.BORRADOR
        proyecto._registrar(self)

    @property
    def horas(self) -> float:
        return self._horas

    @property
    def estado(self) -> EstadoParte:
        return self._estado

    @property
    def empleado(self) -> Empleado:
        return self._empleado

    def enviar(self) -> None:
        if self._estado is not EstadoParte.BORRADOR:
            raise ValueError("Solo se envía un parte en borrador.")
        self._estado = EstadoParte.ENVIADO

    def aprobar(self, aprobador: Empleado) -> None:
        """
        Regla que conviene poder defender: nadie aprueba sus propias horas.

        Es una regla de negocio, no una comprobación técnica, y por eso vive en
        el dominio y no en la pantalla. Si viviera en la pantalla, bastaría con
        llamar a la API para saltársela.
        """
        if self._estado is not EstadoParte.ENVIADO:
            raise ValueError("Solo se aprueba un parte enviado.")
        if aprobador is self._empleado:
            raise ValueError("Nadie puede aprobar sus propias horas.")
        self._estado = EstadoParte.APROBADO


# =============================================================================
# Demostración: el polimorfismo haciendo trabajo real
# =============================================================================


def _demostracion() -> None:
    """
    Recorre el modelo entero para comprobar que encaja.

    La parte que importa para la defensa es la última: el informe de nómina
    recorre una lista con las tres modalidades mezcladas y llama al MISMO
    método. No hay ni un `if` sobre el tipo de contrato. Eso es lo que la guía
    pide cuando dice "utiliza herencia y polimorfismo de manera efectiva para
    evitar duplicación de código", y se puede enseñar en diez segundos.
    """
    print("=" * 74)
    print("EcoTech Solutions — el modelo UML ejecutándose en Python")
    print("=" * 74)

    datos = DatosPersonales("Av. San Martín 1240", "+56 9 1234 5678", "l@correo.cl", "12345678-9")

    lucia = EmpleadoAsalariado(
        "Lucía", "Ferreyra", datos, date(2019, 9, 2), salario_mensual=1_850_000
    )
    camila = EmpleadoPorHoras(
        "Camila", "Bustos", datos, date(2023, 4, 3), tarifa_hora=12_500
    )
    sofia = Contratista(
        "Sofía", "Miranda", datos, date(2024, 2, 5), tarifa_hora=18_000, tope_mensual=2_400_000
    )

    print("\n1. Identificadores generados solos (Entidad._secuencias, atributo de clase)")
    for e in (lucia, camila, sofia):
        print(f"   {e.id}  {e.nombre_completo:24} {e.email_corporativo}")

    print("\n2. Encapsulamiento: los datos sensibles pasan por una comprobación")
    print(f"   con permiso: {lucia.datos_personales(True).telefono}")
    print(f"   sin permiso: {lucia.datos_personales(False).telefono}")

    print("\n3. Agregación: el empleado entra y sale del departamento")
    id_ = Departamento("Investigación y Desarrollo")
    lucia.asignar_a(id_)
    camila.asignar_a(id_)
    id_.designar_gerente(lucia)
    print(f"   {id_.nombre}: {len(id_.empleados)} personas, gerente {id_.gerente.nombre_completo}")
    ventas = Departamento("Ventas")
    camila.asignar_a(ventas)
    print(f"   tras reasignar a Camila -> I+D: {len(id_.empleados)}, Ventas: {len(ventas.empleados)}")

    print("\n4. La lista interna no se puede modificar desde fuera")
    try:
        id_.empleados.append(sofia)  # type: ignore[attr-defined]
    except AttributeError as error:
        print(f"   bloqueado: {error}")

    print("\n5. Clase asociativa: la relación N a M lleva datos propios")
    proyecto = Proyecto("Red de Paneles Solares Cuyo", "Cuatro parques", date(2025, 3, 1))
    proyecto.cambiar_estado(EstadoProyecto.EN_CURSO)
    a1 = AsignacionProyecto(lucia, proyecto, "Líder técnico", 60, date(2025, 3, 1))
    a2 = AsignacionProyecto(camila, proyecto, "Desarrolladora", 40, date(2025, 3, 15))
    for a in (a1, a2):
        print(f"   {a.empleado.nombre_completo:24} {a.rol:16} {a.porcentaje_dedicacion}%")

    print("\n6. Máquina de estados: una transición imposible se rechaza")
    try:
        cerrado = Proyecto("Prueba", "x", date(2025, 1, 1))
        cerrado.cambiar_estado(EstadoProyecto.CERRADO)
        cerrado.cambiar_estado(EstadoProyecto.EN_CURSO)
    except ValueError as error:
        print(f"   {error}")

    print("\n7. Composición y circuito de aprobación")
    parte = RegistroTiempo(camila, proyecto, date.today(), 8, "Montaje del inversor central")
    parte.enviar()
    try:
        parte.aprobar(camila)
    except ValueError as error:
        print(f"   {error}")
    parte.aprobar(lucia)
    print(f"   parte {parte.id}: {parte.estado.value}, {proyecto.horas_imputadas()} h imputadas")

    print("\n8. POLIMORFISMO: el informe de nómina no pregunta de qué tipo es nadie")
    horas_del_mes = {lucia: 160.0, camila: 120.0, sofia: 180.0}
    total = 0.0
    for empleado, horas in horas_del_mes.items():
        importe = empleado.calcular_remuneracion_mensual(horas)
        total += importe
        print(f"   {type(empleado).__name__:20} {empleado.nombre_completo:24} $ {importe:>12,.0f}")
    print(f"   {'TOTAL':45} $ {total:>12,.0f}")
    print("\n   Ni un solo `if` sobre el tipo de contrato. Añadir una modalidad")
    print("   nueva es añadir una clase; este bucle no se toca.")
    print("=" * 74)


if __name__ == "__main__":
    _demostracion()
