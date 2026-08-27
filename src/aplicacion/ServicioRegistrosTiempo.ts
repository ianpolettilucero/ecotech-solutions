import type { Contexto, Solicitante } from './Contexto.js';
import { ServicioAuditoria } from './ServicioAuditoria.js';
import {
  HORAS_MAXIMAS_POR_DIA,
  HORAS_MAXIMAS_POR_REGISTRO,
  HORAS_MINIMAS,
  RegistroTiempo,
} from '../dominio/tiempo/RegistroTiempo.js';
import type { Proyecto } from '../dominio/organizacion/Proyecto.js';
import { Esquema, campo } from '../dominio/validacion/Esquema.js';
import {
  ReglaEnumerado,
  ReglaFecha,
  ReglaIdentificador,
  ReglaNumero,
  ReglaTexto,
} from '../dominio/validacion/Regla.js';
import { ErrorAutorizacion, ErrorReglaNegocio } from '../dominio/base/errores.js';
import { nuevoId } from '../dominio/base/Identificador.js';
import { ESTADOS_REGISTRO } from '../compartido/tipos.js';
import type { EstadoRegistro, RegistroTiempoDTO } from '../compartido/tipos.js';

/** Filtros del listado. Todos opcionales y acumulativos (AND). */
export type FiltrosRegistrosTiempo = {
  empleadoId?: string;
  proyectoId?: string;
  desde?: string;
  hasta?: string;
  estado?: EstadoRegistro;
};

// ---------------------------------------------------------------------------
// Esquemas de validación
//
// Constantes de módulo: se construyen una sola vez por isolate y quedan
// disponibles para documentar la API con `describir()` sin ejecutar el
// servicio.
// ---------------------------------------------------------------------------

type DatosRegistro = {
  proyectoId: string;
  fecha: string;
  horas: number;
  descripcion: string;
  empleadoId?: string;
};

const ESQUEMA_CREAR = new Esquema<DatosRegistro>({
  proyectoId: campo(new ReglaIdentificador()),
  // Sin futuro: cargar horas por adelantado sería declarar trabajo no hecho, y
  // nadie podría contrastarlo después. La entidad repite el control en
  // `validar()`, porque también la alcanzan las ediciones.
  fecha: campo(new ReglaFecha(false)),
  horas: campo(new ReglaNumero(HORAS_MINIMAS, HORAS_MAXIMAS_POR_REGISTRO)),
  // El mínimo de 10 caracteres es deliberado: una descripción como "tareas"
  // no permite auditar nada ni sirve para facturar al cliente.
  descripcion: campo(new ReglaTexto(10, 500)),
  // Solo lo honra quien puede ver las horas de todos (ver `crear`).
  empleadoId: campo(new ReglaIdentificador(), { opcional: true }),
});

/**
 * Edición parcial.
 *
 * `empleadoId` queda fuera: mover un parte de horas de una persona a otra
 * reescribiría el pasado de las dos. Si se cargo sobre quien no era, se elimina
 * el borrador y se carga de nuevo.
 */
const ESQUEMA_ACTUALIZAR = new Esquema<{
  proyectoId?: string;
  fecha?: string;
  horas?: number;
  descripcion?: string;
}>({
  proyectoId: campo(new ReglaIdentificador(), { opcional: true }),
  fecha: campo(new ReglaFecha(false), { opcional: true }),
  horas: campo(new ReglaNumero(HORAS_MINIMAS, HORAS_MAXIMAS_POR_REGISTRO), { opcional: true }),
  descripcion: campo(new ReglaTexto(10, 500), { opcional: true }),
});

const ESQUEMA_ID = new Esquema<{ id: string }>({
  id: campo(new ReglaIdentificador()),
});

const ESQUEMA_MOTIVO = new Esquema<{ motivo: string }>({
  motivo: campo(new ReglaTexto(5, 300)),
});

const ESQUEMA_FILTROS = new Esquema<FiltrosRegistrosTiempo>({
  empleadoId: campo(new ReglaIdentificador(), { opcional: true }),
  proyectoId: campo(new ReglaIdentificador(), { opcional: true }),
  desde: campo(new ReglaFecha(true), { opcional: true }),
  hasta: campo(new ReglaFecha(true), { opcional: true }),
  estado: campo(new ReglaEnumerado(ESTADOS_REGISTRO), { opcional: true }),
});

/** Redondeo a dos decimales: sumar fracciones de hora arrastra error binario. */
function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Casos de uso sobre los partes de horas.
 *
 * Es el servicio con más reglas del sistema porque concentra las tres cosas que
 * la planilla no podía garantizar: que nadie vea horas ajenas, que toda hora
 * imputada tenga detrás una asignación que la explique, y que el circuito de
 * aprobación no se pueda saltear. La máquina de estados
 * (BORRADOR -> ENVIADO -> APROBADO | RECHAZADO) vive en la entidad; aquí están
 * la autorización y los invariantes que cruzan agregados.
 */
export class ServicioRegistrosTiempo {
  constructor(private readonly ctx: Contexto) {}

  // -------------------------------------------------------------------------
  // Lectura
  // -------------------------------------------------------------------------

  async listar(filtros?: FiltrosRegistrosTiempo): Promise<RegistroTiempoDTO[]> {
    const { solicitante, veTodo } = this.exigirLectura();
    const criterios: FiltrosRegistrosTiempo = filtros ? ESQUEMA_FILTROS.validar(filtros) : {};

    // VISIBILIDAD. Quien solo tiene 'tiempo:leer_propio' ve exclusivamente sus
    // horas, y el filtro que lo garantiza lo pone el **servidor**, pisando lo
    // que haya llegado en `criterios.empleadoId`. Es la diferencia entre un
    // control real y uno decorativo: si se respetara el filtro del cliente,
    // bastaría con editar un parámetro de la URL (?empleadoId=<el de otro>)
    // para leer las horas de un compañero. El único identificador en el que se
    // puede confiar es el que sale de la sesión, nunca el que llega en la
    // petición.
    let empleadoId = criterios.empleadoId;
    if (!veTodo) {
      // Cuenta sin empleado vinculado (por ejemplo un usuario técnico): no
      // tiene horas propias, y devolver "todo" sería justo lo contrario de lo
      // que pide el permiso. Lista vacía.
      if (solicitante.empleadoId === null) return [];
      empleadoId = solicitante.empleadoId;
    }

    const registros = await this.ctx.registrosTiempo.listar((registro) => {
      if (empleadoId !== undefined && registro.empleadoId !== empleadoId) return false;
      if (criterios.proyectoId !== undefined && registro.proyectoId !== criterios.proyectoId) {
        return false;
      }
      // Las fechas ISO `AAAA-MM-DD` ordenan igual como texto que como fecha,
      // así que la comparación directa alcanza y evita construir N `Date`.
      if (criterios.desde !== undefined && registro.fecha < criterios.desde) return false;
      if (criterios.hasta !== undefined && registro.fecha > criterios.hasta) return false;
      if (criterios.estado !== undefined && registro.estado !== criterios.estado) return false;
      return true;
    });

    // Lo más reciente primero: es como se revisa un parte de horas.
    registros.sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
      return a.creadoEn < b.creadoEn ? 1 : -1;
    });

    return registros.map((registro) => registro.aDTO());
  }

  async obtener(id: string): Promise<RegistroTiempoDTO> {
    const { solicitante, veTodo } = this.exigirLectura();
    const registro = await this.cargar(id);
    // Aquí no hay filtro que forzar: el id ya apunta a un registro concreto, de
    // modo que la propiedad se comprueba sobre el resultado. Se responde 403 y
    // no 404 porque el registro existe; ocultar eso no aporta nada frente a
    // alguien que ya está autenticado.
    if (!veTodo) this.exigirPropiedad(registro, solicitante);
    return registro.aDTO();
  }

  // -------------------------------------------------------------------------
  // Escritura
  // -------------------------------------------------------------------------

  async crear(datos: unknown): Promise<RegistroTiempoDTO> {
    const solicitante = this.ctx.exigirPermiso('tiempo:registrar');
    const entrada = ESQUEMA_CREAR.validar(datos);

    // Cargar horas en nombre de otro es una operación legítima de gerencia
    // (alguien de licencia, un parte en papel), pero solo la puede hacer quien
    // ya tiene visibilidad sobre las horas de terceros. Para el resto, el
    // `empleadoId` que llegue se **ignora** y se fuerza el propio: si se
    // confiara en el, cualquier empleado podría imputar horas a nombre de un
    // compañero y ensuciarle el parte del mes.
    const empleadoId =
      entrada.empleadoId !== undefined && this.ctx.puede('tiempo:leer_todos')
        ? entrada.empleadoId
        : solicitante.empleadoId;

    if (empleadoId === null) {
      throw new ErrorReglaNegocio(
        'Su cuenta de acceso no está vinculada a ningún empleado, de modo que no puede ' +
          'cargar horas propias. Solicite la vinculación a Recursos Humanos.',
      );
    }

    const empleado = await this.ctx.empleados.obtener(empleadoId);
    if (empleado === null) {
      throw new ErrorReglaNegocio('El empleado indicado no existe.');
    }
    if (!empleado.activo) {
      throw new ErrorReglaNegocio(
        `El empleado ${empleado.legajo} está dado de baja y no admite carga de horas.`,
      );
    }

    const proyecto = await this.exigirProyectoConCargaAbierta(entrada.proyectoId);
    await this.exigirAsignacionVigente(empleadoId, entrada.proyectoId, entrada.fecha);
    await this.exigirTopeDiario(empleadoId, entrada.fecha, entrada.horas, null);

    const ahora = new Date().toISOString();
    const registro = new RegistroTiempo({
      id: nuevoId(),
      creadoEn: ahora,
      actualizadoEn: ahora,
      empleadoId,
      proyectoId: entrada.proyectoId,
      fecha: entrada.fecha,
      horas: entrada.horas,
      descripcion: entrada.descripcion,
      // Nace en BORRADOR: nada entra al circuito de aprobación sin que su autor
      // lo envíe explicitamente.
      estado: 'BORRADOR',
      aprobadoPor: null,
      motivoRechazo: null,
    });

    await this.ctx.registrosTiempo.guardar(registro);

    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'TIEMPO_REGISTRADO',
      entidad: 'RegistroTiempo',
      entidadId: registro.id,
      detalle:
        `${empleado.legajo}: ${registro.horas} h el ${registro.fecha} ` +
        `en ${proyecto.codigo}.`,
      exito: true,
    });

    return registro.aDTO();
  }

  async actualizar(id: string, datos: unknown): Promise<RegistroTiempoDTO> {
    const solicitante = this.ctx.exigirPermiso('tiempo:registrar');
    const registro = await this.cargar(id);
    if (!this.ctx.puede('tiempo:leer_todos')) this.exigirPropiedad(registro, solicitante);

    // Se comprueba antes que cualquier otra cosa para que editar un registro ya
    // enviado no devuelva primero un error de tope diario: el estado es el
    // motivo real del rechazo y es el que tiene que leer el usuario.
    if (!registro.puedeEditarlo()) {
      throw new ErrorReglaNegocio(
        `El registro está en estado ${registro.estado} y ya no admite ediciones. ` +
          'Para corregirlo, un aprobador debe rechazarlo primero; así el cambio queda explicado.',
      );
    }

    const entrada = ESQUEMA_ACTUALIZAR.validar(datos);
    const proyectoDestino = entrada.proyectoId ?? registro.proyectoId;
    const fechaDestino = entrada.fecha ?? registro.fecha;
    const horasDestino = entrada.horas ?? registro.horas;

    const cambiaVinculo =
      proyectoDestino !== registro.proyectoId || fechaDestino !== registro.fecha;
    const cambiaComputo = horasDestino !== registro.horas || fechaDestino !== registro.fecha;

    // Mover un parte de proyecto o de día lo somete otra vez a las mismas
    // reglas que su alta: el proyecto de destino puede estar cerrado y la
    // asignación puede no cubrir la fecha nueva.
    if (cambiaVinculo) {
      await this.exigirProyectoConCargaAbierta(proyectoDestino);
      await this.exigirAsignacionVigente(registro.empleadoId, proyectoDestino, fechaDestino);
    }
    if (cambiaComputo) {
      // Se excluye este registro del computo del día: si no, sus horas viejas
      // se sumarian a las nuevas y una corrección de 8 a 9 horas fallaría como
      // si se estuviesen cargando 17.
      await this.exigirTopeDiario(
        registro.empleadoId,
        fechaDestino,
        horasDestino,
        registro.id,
      );
    }

    // La entidad aplica los campos, revalida sus invariantes y, si venía
    // RECHAZADO, lo devuelve a BORRADOR limpiando el motivo.
    registro.editar({
      proyectoId: entrada.proyectoId,
      fecha: entrada.fecha,
      horas: entrada.horas,
      descripcion: entrada.descripcion,
    });

    await this.ctx.registrosTiempo.guardar(registro);

    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'TIEMPO_ACTUALIZADO',
      entidad: 'RegistroTiempo',
      entidadId: registro.id,
      detalle: `Campos modificados: ${Object.keys(entrada).join(', ') || 'ninguno'}.`,
      exito: true,
    });

    return registro.aDTO();
  }

  /**
   * Borrado **físico**, y aquí si corresponde.
   *
   * En el resto del sistema las bajas son lógicas para no dejar huerfanos los
   * datos históricos, pero un registro que solo estuvo en BORRADOR (o que fue
   * rechazado) jamás computo en una nómina, en un costo de proyecto ni en un
   * informe cerrado: no hay nada que quede colgando. Conservarlo como "fila
   * fantasma" solo llenaría de ruido el parte del empleado. Lo que si queda es
   * el asiento de auditoría, que registra que existio y quien lo borro.
   */
  async eliminar(id: string): Promise<void> {
    // El permiso base es el de carga: borrar un borrador propio es parte de
    // cargar horas. La restricción fina (propio, o alguien con visión de todas
    // las horas) va aparte, porque depende del dato y no solo del rol.
    const solicitante = this.ctx.exigirPermiso('tiempo:registrar');
    const registro = await this.cargar(id);
    if (!this.ctx.puede('tiempo:leer_todos')) this.exigirPropiedad(registro, solicitante);

    if (!registro.puedeEditarlo()) {
      throw new ErrorReglaNegocio(
        `No se puede eliminar un registro en estado ${registro.estado}: ya entro al circuito ` +
          'de aprobación y borrarlo haría desaparecer horas que alguien reviso.',
      );
    }

    await this.ctx.registrosTiempo.eliminar(registro.id);

    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'TIEMPO_ELIMINADO',
      entidad: 'RegistroTiempo',
      entidadId: registro.id,
      detalle:
        `Se elimino el borrador de ${registro.horas} h del ${registro.fecha} ` +
        `(empleado ${registro.empleadoId}).`,
      exito: true,
    });
  }

  /** Envia el parte a aprobación: a partir de aquí el empleado ya no lo toca. */
  async enviar(id: string): Promise<RegistroTiempoDTO> {
    const solicitante = this.ctx.exigirPermiso('tiempo:registrar');
    const registro = await this.cargar(id);
    if (!this.ctx.puede('tiempo:leer_todos')) this.exigirPropiedad(registro, solicitante);

    registro.enviar();
    await this.ctx.registrosTiempo.guardar(registro);

    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'TIEMPO_ENVIADO',
      entidad: 'RegistroTiempo',
      entidadId: registro.id,
      detalle: `${registro.horas} h del ${registro.fecha} enviadas a aprobación.`,
      exito: true,
    });

    return registro.aDTO();
  }

  async aprobar(id: string): Promise<RegistroTiempoDTO> {
    const solicitante = this.ctx.exigirPermiso('tiempo:aprobar');
    const registro = await this.cargar(id);

    // La entidad se encarga de que nadie apruebe sus propias horas comparando
    // este identificador con el del autor; por eso hay que pasarle el del
    // empleado y no el de la cuenta cuando existe vinculo.
    registro.aprobar(this.identidadAprobador(solicitante));
    await this.ctx.registrosTiempo.guardar(registro);

    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'TIEMPO_APROBADO',
      entidad: 'RegistroTiempo',
      entidadId: registro.id,
      detalle:
        `${registro.horas} h del ${registro.fecha} aprobadas ` +
        `(empleado ${registro.empleadoId}).`,
      exito: true,
    });

    return registro.aDTO();
  }

  async rechazar(id: string, motivo: string): Promise<RegistroTiempoDTO> {
    const solicitante = this.ctx.exigirPermiso('tiempo:aprobar');
    const registro = await this.cargar(id);
    // El motivo lo escribe una persona y termina en la ficha del empleado y en
    // la traza: pasa por el esquema como cualquier otra entrada.
    const explicacion = ESQUEMA_MOTIVO.validar({ motivo }).motivo;

    registro.rechazar(this.identidadAprobador(solicitante), explicacion);
    await this.ctx.registrosTiempo.guardar(registro);

    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'TIEMPO_RECHAZADO',
      entidad: 'RegistroTiempo',
      entidadId: registro.id,
      detalle: `${registro.horas} h del ${registro.fecha} rechazadas: ${explicacion}`,
      exito: true,
    });

    return registro.aDTO();
  }

  // -------------------------------------------------------------------------
  // Apoyo
  // -------------------------------------------------------------------------

  private async cargar(id: string): Promise<RegistroTiempo> {
    const identificador = ESQUEMA_ID.validar({ id }).id;
    return this.ctx.registrosTiempo.obtenerOFallar(identificador);
  }

  /**
   * Permiso de lectura y alcance.
   *
   * `tiempo:leer_todos` y `tiempo:leer_propio` habilitan el mismo extremo con
   * distinto alcance, así que no alcanza con `exigirPermiso`: se resuelve cual
   * de los dos tiene el solicitante y se devuelve esa decisión, para que cada
   * método la aplique como le corresponde (forzar el filtro, o comprobar la
   * propiedad del registro).
   */
  private exigirLectura(): { solicitante: Solicitante; veTodo: boolean } {
    const solicitante = this.ctx.exigirSolicitante();
    const veTodo = this.ctx.puede('tiempo:leer_todos');
    // Si no ve todo, tiene que tener al menos el permiso sobre lo propio; si no
    // lo tiene, esto lanza 403.
    if (!veTodo) this.ctx.exigirPermiso('tiempo:leer_propio');
    return { solicitante, veTodo };
  }

  /** 403 si el registro no pertenece al empleado que representa la sesión. */
  private exigirPropiedad(registro: RegistroTiempo, solicitante: Solicitante): void {
    if (solicitante.empleadoId === null || registro.empleadoId !== solicitante.empleadoId) {
      throw new ErrorAutorizacion('Solo puede consultar y modificar sus propios registros de horas.');
    }
  }

  /**
   * Identidad con la que se firma una aprobación o un rechazo.
   *
   * Se prefiere el `empleadoId` porque es lo que compara la entidad para
   * impedir la autoaprobación; para una cuenta administrativa sin empleado
   * vinculado se usa el `usuarioId`, que sigue siendo una identidad real y
   * nunca puede coincidir con el autor del parte.
   */
  private identidadAprobador(solicitante: Solicitante): string {
    return solicitante.empleadoId ?? solicitante.usuarioId;
  }

  private async exigirProyectoConCargaAbierta(proyectoId: string): Promise<Proyecto> {
    const proyecto = await this.ctx.proyectos.obtener(proyectoId);
    if (proyecto === null) {
      throw new ErrorReglaNegocio('El proyecto indicado no existe.');
    }
    if (!proyecto.admiteCargaDeHoras()) {
      throw new ErrorReglaNegocio(
        `El proyecto ${proyecto.codigo} está ${proyecto.estado} y solo se imputan horas a ` +
          'proyectos EN_CURSO. Si el trabajo se hizo, reactive el proyecto antes de cargarlas.',
      );
    }
    return proyecto;
  }

  /**
   * Trazabilidad: toda hora tiene que estar respaldada por una participación.
   *
   * No se imputan horas a un proyecto en el que no se participaba **ese día**,
   * por eso se pregunta por `estabaVigenteEn(fecha)` y no por `activa`: sirve
   * tanto para el que nunca estuvo en el equipo como para el que ya salió y
   * carga con fecha posterior a su baja. Es lo que permite explicar, meses
   * después, por que una hora está imputada donde esta.
   *
   * Se consulta el repositorio en lugar de `ServicioAsignaciones.vigentesDe`
   * para no acoplar la carga de horas al permiso 'asignación:leer': esto es una
   * comprobación interna de integridad, no una lectura que el usuario pidió.
   */
  private async exigirAsignacionVigente(
    empleadoId: string,
    proyectoId: string,
    fecha: string,
  ): Promise<void> {
    const asignacion = await this.ctx.asignaciones.buscarUno(
      (candidata) =>
        candidata.empleadoId === empleadoId &&
        candidata.proyectoId === proyectoId &&
        candidata.estabaVigenteEn(fecha),
    );
    if (asignacion === null) {
      throw new ErrorReglaNegocio(
        `El empleado no estaba asignado a ese proyecto el ${fecha}, de modo que no puede ` +
          'imputarle horas. Cree primero la asignación correspondiente al periodo.',
      );
    }
  }

  /**
   * Tope de horas de una jornada.
   *
   * La entidad ya acota cada registro por separado, pero el límite real es del
   * día: sin este control alguien podría cargar cuatro registros de 12 horas al
   * mismo día repartidos en proyectos distintos, y ninguno de los cuatro
   * violaría por si solo ningún invariante. Es de nuevo un invariante que solo
   * se ve mirando la colección entera, y por eso vive en el servicio.
   *
   * Cuentan todos los estados, incluidos borradores y rechazados: el tope
   * describe cuantas horas caben en un día, no cuantas se van a pagar. No hay
   * que excluir "eliminados" porque el borrado de registros es físico: lo que
   * ya no está en la colección no existe.
   *
   * @param excluirId registro que no debe contarse (el que se está editando).
   */
  private async exigirTopeDiario(
    empleadoId: string,
    fecha: string,
    horas: number,
    excluirId: string | null,
  ): Promise<void> {
    const delDia = await this.ctx.registrosTiempo.listar(
      (registro) =>
        registro.empleadoId === empleadoId &&
        registro.fecha === fecha &&
        registro.id !== excluirId,
    );
    const yaCargadas = redondear(delDia.reduce((total, registro) => total + registro.horas, 0));
    const totalResultante = redondear(yaCargadas + horas);

    if (totalResultante > HORAS_MAXIMAS_POR_DIA) {
      const disponibles = redondear(HORAS_MAXIMAS_POR_DIA - yaCargadas);
      throw new ErrorReglaNegocio(
        `El ${fecha} ya hay ${yaCargadas} h cargadas en ${delDia.length} registro(s) y el tope ` +
          `diario es de ${HORAS_MAXIMAS_POR_DIA} h. Con estas ${horas} h el total llegaría a ` +
          `${totalResultante} h: quedan ${disponibles} h disponibles ese día.`,
      );
    }
  }
}
