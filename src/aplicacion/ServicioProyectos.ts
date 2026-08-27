import { Proyecto } from '../dominio/organizacion/Proyecto.js';
import { formatearCodigoProyecto, nuevoId } from '../dominio/base/Identificador.js';
import { ErrorValidacion } from '../dominio/base/errores.js';
import { Esquema, campo } from '../dominio/validacion/Esquema.js';
import {
  ReglaEnumerado,
  ReglaFecha,
  ReglaIdentificador,
  ReglaNumero,
  ReglaTexto,
} from '../dominio/validacion/Regla.js';
import {
  ESTADOS_PROYECTO,
  type EstadoProyecto,
  type ProyectoDTO,
} from '../compartido/tipos.js';
import type { Contexto } from './Contexto.js';
import { ServicioAuditoria } from './ServicioAuditoria.js';

/** Cuerpo aceptado al crear un proyecto, ya normalizado por el esquema. */
type EntradaProyecto = {
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  /** `null` explicito = proyecto sin fecha de cierre estimada. */
  fechaFinEstimada?: string | null;
  /** `null` explicito = proyecto transversal, sin departamento responsable. */
  departamentoId?: string | null;
  presupuestoHoras: number;
};

type FiltrosProyecto = {
  estado?: EstadoProyecto;
  departamentoId?: string;
  texto?: string;
};

/**
 * Esquemas a nivel de módulo: se construyen una vez y describen el contrato de
 * entrada en un solo lugar, en vez de quedar escondidos dentro de cada método.
 *
 * El código NO figura aquí a propósito: lo asigna el servidor con un
 * correlativo, y aceptarlo del cliente permitiría falsificarlo o duplicarlo.
 * El estado tampoco: un proyecto siempre nace PLANIFICADO y solo se mueve por
 * `cambiarEstado`, que valida la transición.
 */
const ESQUEMA_PROYECTO = new Esquema<EntradaProyecto>({
  nombre: campo(new ReglaTexto(3, 120)),
  descripcion: campo(new ReglaTexto(0, 1000), { opcional: true, porDefecto: '' }),
  fechaInicio: campo(new ReglaFecha()),
  fechaFinEstimada: campo(new ReglaFecha(), { opcional: true, admiteNulo: true }),
  departamentoId: campo(new ReglaIdentificador(), { opcional: true, admiteNulo: true }),
  presupuestoHoras: campo(new ReglaNumero(0, 100_000), { opcional: true, porDefecto: 0 }),
});

/** Actualización parcial: lo que no viene en el cuerpo no se toca. */
const ESQUEMA_PROYECTO_PARCIAL = ESQUEMA_PROYECTO.parcial();

const ESQUEMA_ESTADO = new Esquema<{ estado: EstadoProyecto }>({
  estado: campo(new ReglaEnumerado(ESTADOS_PROYECTO)),
});

const ESQUEMA_FILTROS = new Esquema<FiltrosProyecto>({
  estado: campo(new ReglaEnumerado(ESTADOS_PROYECTO), { opcional: true }),
  departamentoId: campo(new ReglaIdentificador(), { opcional: true }),
  texto: campo(new ReglaTexto(1, 120), { opcional: true }),
});

/**
 * Los identificadores llegan por la ruta, no por el cuerpo, pero son entrada de
 * usuario igual: se validan para que un id malformado devuelva un 400 con
 * detalle y no se use como clave de búsqueda tal cual.
 */
const ESQUEMA_ID = new Esquema<{ id: string }>({
  id: campo(new ReglaIdentificador()),
});

/**
 * Normaliza texto para buscar: minúsculas y sin marcas diacríticas, de modo que
 * "auditoría" encuentre también lo que se cargo con tilde. Se filtra en memoria
 * porque KV no ofrece índices de texto.
 */
function normalizarBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Gestión de proyectos.
 *
 * El ciclo de vida (la máquina de estados) vive en la entidad `Proyecto`; este
 * servicio aporta lo que la entidad no puede saber por si sola: que el
 * departamento referenciado exista, que código correlativo le toca, y que
 * consecuencias tiene un borrado sobre las horas y asignaciones que dependen
 * del proyecto.
 */
export class ServicioProyectos {
  constructor(private readonly ctx: Contexto) {}

  // ---------------------------------------------------------------------------
  // Lectura
  // ---------------------------------------------------------------------------

  /** Listado con filtro por estado, por departamento y búsqueda libre. */
  async listar(filtros?: {
    estado?: EstadoProyecto;
    departamentoId?: string;
    texto?: string;
  }): Promise<ProyectoDTO[]> {
    this.ctx.exigirPermiso('proyecto:leer');
    const { estado, departamentoId, texto } = ESQUEMA_FILTROS.validar(filtros ?? {});
    const aguja = texto === undefined ? null : normalizarBusqueda(texto);

    const proyectos = await this.ctx.proyectos.listar((proyecto) => {
      if (estado !== undefined && proyecto.estado !== estado) return false;
      if (departamentoId !== undefined && proyecto.departamentoId !== departamentoId) return false;
      if (aguja === null) return true;
      // El código entra en la búsqueda: es como el usuario nombra el proyecto
      // en los correos ("como va el PRY-0007").
      return normalizarBusqueda(
        `${proyecto.codigo} ${proyecto.nombre} ${proyecto.descripcion}`,
      ).includes(aguja);
    });

    return proyectos
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
      .map((proyecto) => proyecto.aDTO());
  }

  async obtener(id: string): Promise<ProyectoDTO> {
    this.ctx.exigirPermiso('proyecto:leer');
    const proyecto = await this.ctx.proyectos.obtenerOFallar(this.normalizarId(id));
    return proyecto.aDTO();
  }

  /**
   * Horas APROBADAS imputadas a cada proyecto, indexadas por id.
   *
   * Solo cuentan las aprobadas: las que están en borrador o pendientes todavía
   * pueden cambiar, y mostrarlas en la barra de consumo de presupuesto daría
   * una foto que se contradice sola al día siguiente.
   *
   * Basta `proyecto:leer` porque el resultado es un agregado por proyecto, sin
   * detalle por persona; el detalle nominal exige `tiempo:leer_todos` y se pide
   * en el servicio de tiempos.
   */
  async horasPorProyecto(): Promise<Record<string, number>> {
    this.ctx.exigirPermiso('proyecto:leer');

    // Se siembran en cero todos los proyectos para que el cliente no tenga que
    // distinguir "sin horas" de "clave ausente".
    const totales: Record<string, number> = {};
    for (const proyecto of await this.ctx.proyectos.listar()) {
      totales[proyecto.id] = 0;
    }

    const registros = await this.ctx.registrosTiempo.listar((registro) =>
      registro.computaParaNomina(),
    );
    for (const registro of registros) {
      totales[registro.proyectoId] = (totales[registro.proyectoId] ?? 0) + registro.horas;
    }

    // Redondeo al final: sumar decimales en coma flotante arrastra residuos del
    // tipo 8.700000000000001 que luego se ven en pantalla.
    for (const clave of Object.keys(totales)) {
      totales[clave] = Math.round((totales[clave] ?? 0) * 100) / 100;
    }
    return totales;
  }

  // ---------------------------------------------------------------------------
  // Escritura
  // ---------------------------------------------------------------------------

  async crear(datos: unknown): Promise<ProyectoDTO> {
    this.ctx.exigirPermiso('proyecto:crear');
    const validados = ESQUEMA_PROYECTO.validar(datos);
    const departamentoId = await this.resolverDepartamento(validados.departamentoId ?? null);

    // El correlativo se reserva contra el almacén (no se calcula contando
    // proyectos) para que borrar uno no haga que el siguiente reutilice su
    // código y dos proyectos distintos compartan identificador en los informes.
    const codigo = formatearCodigoProyecto(
      await this.ctx.almacen.siguienteCorrelativo('proyecto'),
    );

    const ahora = new Date().toISOString();
    const proyecto = new Proyecto({
      id: nuevoId(),
      creadoEn: ahora,
      actualizadoEn: ahora,
      codigo,
      nombre: validados.nombre,
      descripcion: validados.descripcion,
      fechaInicio: validados.fechaInicio,
      fechaFinEstimada: validados.fechaFinEstimada ?? null,
      estado: 'PLANIFICADO',
      departamentoId,
      presupuestoHoras: validados.presupuestoHoras,
    });

    await this.ctx.proyectos.guardar(proyecto);
    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'PROYECTO_CREADO',
      entidad: 'Proyecto',
      entidadId: proyecto.id,
      detalle: `${proyecto.codigo} ${proyecto.nombre}`,
      exito: true,
    });
    return proyecto.aDTO();
  }

  async actualizar(id: string, datos: unknown): Promise<ProyectoDTO> {
    this.ctx.exigirPermiso('proyecto:editar');
    const idProyecto = this.normalizarId(id);
    const validados = ESQUEMA_PROYECTO_PARCIAL.validar(datos);
    const proyecto = await this.ctx.proyectos.obtenerOFallar(idProyecto);

    if (validados.departamentoId !== undefined) {
      // Se reemplaza por el id ya verificado; si viene null se desvincula.
      validados.departamentoId = await this.resolverDepartamento(validados.departamentoId);
    }

    // `actualizarDatos` ignora las claves ausentes y revalida los invariantes
    // de la entidad (por ejemplo, que el fin estimado no preceda al inicio).
    proyecto.actualizarDatos(validados);

    await this.ctx.proyectos.guardar(proyecto);
    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'PROYECTO_ACTUALIZADO',
      entidad: 'Proyecto',
      entidadId: proyecto.id,
      detalle: `${proyecto.codigo} campos=${Object.keys(validados).join(', ') || 'sin cambios'}`,
      exito: true,
    });
    return proyecto.aDTO();
  }

  /**
   * Cambio de estado del ciclo de vida.
   *
   * La transición la decide la entidad contra su tabla de estados. Aquí no se
   * captura su `ErrorReglaNegocio`: que suba tal cual es lo correcto, porque el
   * router lo traduce a un 422 con el mensaje que enumera las transiciones
   * validas. Atraparlo para relanzar otro error solo perdería información.
   */
  async cambiarEstado(id: string, estado: EstadoProyecto): Promise<ProyectoDTO> {
    this.ctx.exigirPermiso('proyecto:editar');
    const idProyecto = this.normalizarId(id);
    const validados = ESQUEMA_ESTADO.validar({ estado });
    const proyecto = await this.ctx.proyectos.obtenerOFallar(idProyecto);

    const estadoPrevio = proyecto.estado;
    proyecto.cambiarEstado(validados.estado);

    await this.ctx.proyectos.guardar(proyecto);
    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'PROYECTO_ESTADO_CAMBIADO',
      entidad: 'Proyecto',
      entidadId: proyecto.id,
      detalle: `${proyecto.codigo}: ${estadoPrevio} -> ${proyecto.estado}`,
      exito: true,
    });
    return proyecto.aDTO();
  }

  /**
   * Baja de un proyecto.
   *
   * **Trazabilidad por encima de la limpieza.** Si hay horas imputadas o
   * asignaciones (aunque esten cerradas), borrar la fila dejaría huerfanos los
   * partes de horas ya aprobados y los informes de periodos cerrados dejarian
   * de cuadrar: nadie podría explicar a que se dedicaron esas horas pagadas.
   * En ese caso el proyecto se CANCELA, que es la forma correcta de decir "esto
   * ya no corre" sin reescribir el pasado, y el motivo queda en la auditoría.
   *
   * El borrado físico se reserva al único caso en que no destruye historia: un
   * proyecto que se creo por error y al que nunca se le imputo nada.
   *
   * Si el proyecto ya estaba FINALIZADO y tiene horas, `cambiarEstado` lanza
   * `ErrorReglaNegocio` y se deja subir: un proyecto cerrado con horas pagadas
   * no se borra ni se cancela, se archiva tal como quedo.
   */
  async eliminar(id: string): Promise<void> {
    this.ctx.exigirPermiso('proyecto:eliminar');
    const idProyecto = this.normalizarId(id);
    const proyecto = await this.ctx.proyectos.obtenerOFallar(idProyecto);

    const horas = await this.ctx.registrosTiempo.contar(
      (registro) => registro.proyectoId === idProyecto,
    );
    const asignaciones = await this.ctx.asignaciones.contar(
      (asignacion) => asignacion.proyectoId === idProyecto,
    );
    const auditoria = new ServicioAuditoria(this.ctx);

    if (horas > 0 || asignaciones > 0) {
      const estadoPrevio = proyecto.estado;
      proyecto.cambiarEstado('CANCELADO');
      await this.ctx.proyectos.guardar(proyecto);
      await auditoria.registrar({
        accion: 'PROYECTO_CANCELADO',
        entidad: 'Proyecto',
        entidadId: proyecto.id,
        detalle:
          `${proyecto.codigo}: borrado sustituido por cancelación desde ${estadoPrevio}; ` +
          `dependen ${horas} registros de tiempo y ${asignaciones} asignaciones`,
        exito: true,
      });
      return;
    }

    await this.ctx.proyectos.eliminar(idProyecto);
    await auditoria.registrar({
      accion: 'PROYECTO_ELIMINADO',
      entidad: 'Proyecto',
      entidadId: proyecto.id,
      detalle: `${proyecto.codigo} ${proyecto.nombre}: sin horas ni asignaciones asociadas`,
      exito: true,
    });
  }

  // ---------------------------------------------------------------------------
  // Reglas que necesitan mirar otros agregados
  // ---------------------------------------------------------------------------

  private normalizarId(id: string): string {
    return ESQUEMA_ID.validar({ id }).id;
  }

  /**
   * Integridad referencial del departamento responsable.
   *
   * La entidad guarda solo el id y no puede comprobar que exista; la
   * comprobación necesita otro repositorio y por eso vive en el servicio. Se
   * admiten departamentos inactivos: un proyecto histórico puede seguir
   * colgando de una unidad que ya se disolvio, y romper ese vinculo falsearía
   * los informes de periodos cerrados.
   */
  private async resolverDepartamento(departamentoId: string | null): Promise<string | null> {
    if (departamentoId === null) return null;

    const existe = await this.ctx.departamentos.existe(departamentoId);
    if (!existe) {
      throw new ErrorValidacion('El departamento indicado no existe.', [
        { campo: 'departamentoId', mensaje: 'No corresponde a ningún departamento registrado.' },
      ]);
    }
    return departamentoId;
  }
}
