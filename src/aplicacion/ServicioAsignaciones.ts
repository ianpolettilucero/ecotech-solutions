import type { Contexto } from './Contexto.js';
import { ServicioAuditoria } from './ServicioAuditoria.js';
import { AsignacionProyecto } from '../dominio/organizacion/AsignacionProyecto.js';
import { Esquema, campo } from '../dominio/validacion/Esquema.js';
import {
  ReglaBooleano,
  ReglaEnumerado,
  ReglaFecha,
  ReglaIdentificador,
  ReglaNumero,
} from '../dominio/validacion/Regla.js';
import { ErrorConflicto, ErrorReglaNegocio } from '../dominio/base/errores.js';
import { nuevoId } from '../dominio/base/Identificador.js';
import { ROLES_PROYECTO } from '../compartido/tipos.js';
import type { AsignacionDTO, RolProyecto } from '../compartido/tipos.js';

/** Filtros del listado. Todos opcionales y acumulativos (AND). */
export type FiltrosAsignaciones = {
  empleadoId?: string;
  proyectoId?: string;
  activa?: boolean;
};

/**
 * Jornada completa expresada en puntos porcentuales.
 *
 * Se declara como constante y no como el literal `100` repetido por el archivo
 * para que el dia que la empresa admita sobreasignacion planificada (por
 * ejemplo hasta 120 en periodos pico) haya un unico punto que tocar.
 */
const DEDICACION_TOTAL = 100;

// ---------------------------------------------------------------------------
// Esquemas de validacion
//
// Constantes de modulo: se construyen una sola vez por isolate (los `RegExp`
// de las reglas no se recompilan en cada peticion) y quedan disponibles para
// documentar la API con `describir()` sin ejecutar el servicio.
// ---------------------------------------------------------------------------

type DatosAsignacion = {
  empleadoId: string;
  proyectoId: string;
  rolProyecto: RolProyecto;
  porcentajeDedicacion?: number;
  fechaAsignacion?: string;
};

const ESQUEMA_ASIGNAR = new Esquema<DatosAsignacion>({
  empleadoId: campo(new ReglaIdentificador()),
  proyectoId: campo(new ReglaIdentificador()),
  rolProyecto: campo(new ReglaEnumerado(ROLES_PROYECTO)),
  // Por defecto el empleado se incorpora a dedicacion completa, que es el caso
  // habitual cuando alguien entra a un unico proyecto.
  porcentajeDedicacion: campo(new ReglaNumero(1, DEDICACION_TOTAL), {
    opcional: true,
    porDefecto: DEDICACION_TOTAL,
  }),
  // Se admite fecha futura: planificar la incorporacion de alguien al proyecto
  // del mes que viene es legitimo. El valor por defecto (hoy) no puede
  // declararse aqui porque se evaluaria una sola vez al cargar el modulo.
  fechaAsignacion: campo(new ReglaFecha(true), { opcional: true }),
});

/**
 * Actualizacion.
 *
 * Solo se dejan tocar el rol y la dedicacion. `empleadoId`, `proyectoId` y
 * `fechaAsignacion` quedan fuera del esquema a proposito: reapuntar una
 * asignacion a otra persona o a otro proyecto cambiaria retroactivamente el
 * vinculo que explica las horas ya imputadas bajo ella. Para eso se cierra la
 * asignacion y se crea otra, y quedan dos asientos de auditoria en vez de uno.
 */
const ESQUEMA_ACTUALIZAR = new Esquema<{
  rolProyecto?: RolProyecto;
  porcentajeDedicacion?: number;
}>({
  rolProyecto: campo(new ReglaEnumerado(ROLES_PROYECTO), { opcional: true }),
  porcentajeDedicacion: campo(new ReglaNumero(1, DEDICACION_TOTAL), { opcional: true }),
});

const ESQUEMA_ID = new Esquema<{ id: string }>({
  id: campo(new ReglaIdentificador()),
});

const ESQUEMA_FECHA = new Esquema<{ fecha: string }>({
  fecha: campo(new ReglaFecha(true)),
});

const ESQUEMA_FILTROS = new Esquema<FiltrosAsignaciones>({
  empleadoId: campo(new ReglaIdentificador(), { opcional: true }),
  proyectoId: campo(new ReglaIdentificador(), { opcional: true }),
  activa: campo(new ReglaBooleano(), { opcional: true }),
});

/** Fecha de hoy en formato `AAAA-MM-DD`, que es el que usa todo el dominio. */
function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Redondeo a dos decimales para que la suma de porcentajes no arrastre error binario. */
function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Casos de uso sobre la participacion de empleados en proyectos.
 *
 * La entidad `AsignacionProyecto` sabe cuando esta vigente y como cerrarse,
 * pero no puede saber si el empleado existe, si el proyecto admite gente nueva
 * ni cuanta jornada tiene ya comprometida esa persona en *otros* proyectos:
 * todo eso son invariantes entre agregados, y por eso viven aqui.
 */
export class ServicioAsignaciones {
  constructor(private readonly ctx: Contexto) {}

  // -------------------------------------------------------------------------
  // Lectura
  // -------------------------------------------------------------------------

  async listar(filtros?: FiltrosAsignaciones): Promise<AsignacionDTO[]> {
    this.ctx.exigirPermiso('asignacion:leer');
    const criterios: FiltrosAsignaciones = filtros ? ESQUEMA_FILTROS.validar(filtros) : {};

    const asignaciones = await this.ctx.asignaciones.listar((asignacion) => {
      if (criterios.empleadoId !== undefined && asignacion.empleadoId !== criterios.empleadoId) {
        return false;
      }
      if (criterios.proyectoId !== undefined && asignacion.proyectoId !== criterios.proyectoId) {
        return false;
      }
      if (criterios.activa !== undefined && asignacion.activa !== criterios.activa) return false;
      return true;
    });

    // Las vigentes primero y, dentro de cada grupo, la incorporacion mas
    // reciente arriba: es el orden en que se lee un equipo de proyecto.
    asignaciones.sort((a, b) => {
      if (a.activa !== b.activa) return a.activa ? -1 : 1;
      if (a.fechaAsignacion !== b.fechaAsignacion) {
        return a.fechaAsignacion < b.fechaAsignacion ? 1 : -1;
      }
      return a.creadoEn < b.creadoEn ? 1 : -1;
    });

    return asignaciones.map((asignacion) => asignacion.aDTO());
  }

  /**
   * Asignaciones de un empleado que cubrian la fecha indicada.
   *
   * Devuelve entidades y no DTOs porque no es un extremo de la API sino una
   * consulta para otros servicios (la validacion de un parte de horas, los
   * informes de dedicacion), que necesitan preguntar a cada asignacion por su
   * comportamiento y no solo por sus datos.
   *
   * Incluye las ya cerradas que cubrian esa fecha: para justificar horas de un
   * mes pasado importa si se participaba *entonces*, no si se participa hoy.
   */
  async vigentesDe(empleadoId: string, fecha: string): Promise<AsignacionProyecto[]> {
    this.ctx.exigirPermiso('asignacion:leer');
    const identificador = ESQUEMA_ID.validar({ id: empleadoId }).id;
    const dia = ESQUEMA_FECHA.validar({ fecha }).fecha;
    return this.ctx.asignaciones.listar(
      (asignacion) => asignacion.empleadoId === identificador && asignacion.estabaVigenteEn(dia),
    );
  }

  // -------------------------------------------------------------------------
  // Escritura
  // -------------------------------------------------------------------------

  async asignar(datos: unknown): Promise<AsignacionDTO> {
    this.ctx.exigirPermiso('asignacion:gestionar');
    const entrada = ESQUEMA_ASIGNAR.validar(datos);
    const dedicacion = entrada.porcentajeDedicacion ?? DEDICACION_TOTAL;
    const fechaAsignacion = entrada.fechaAsignacion ?? hoy();

    // Integridad referencial: los dos extremos del vinculo tienen que existir y
    // estar en condiciones de aceptarlo. La entidad no puede comprobarlo porque
    // solo guarda los identificadores.
    const empleado = await this.ctx.empleados.obtener(entrada.empleadoId);
    if (empleado === null) {
      throw new ErrorReglaNegocio(
        'El empleado indicado no existe: no se puede asignar a un proyecto a alguien que no esta dado de alta.',
      );
    }
    if (!empleado.activo) {
      throw new ErrorReglaNegocio(
        `El empleado ${empleado.legajo} esta dado de baja y no puede incorporarse a un proyecto.`,
      );
    }

    const proyecto = await this.ctx.proyectos.obtener(entrada.proyectoId);
    if (proyecto === null) {
      throw new ErrorReglaNegocio('El proyecto indicado no existe.');
    }
    if (!proyecto.estaAbierto()) {
      throw new ErrorReglaNegocio(
        `El proyecto ${proyecto.codigo} esta ${proyecto.estado} y ya no admite incorporaciones.`,
      );
    }

    // Una persona no puede estar dos veces en el mismo equipo: seria imposible
    // decir cual de las dos lineas explica una hora imputada, y la dedicacion
    // se contaria por duplicado. Si existe una asignacion CERRADA no molesta:
    // reincorporar a alguien al proyecto es legitimo y crea una linea nueva,
    // que es justo lo que conserva la historia de la primera etapa.
    const duplicada = await this.ctx.asignaciones.buscarUno(
      (asignacion) =>
        asignacion.empleadoId === entrada.empleadoId &&
        asignacion.proyectoId === entrada.proyectoId &&
        asignacion.activa,
    );
    if (duplicada !== null) {
      throw new ErrorConflicto(
        `${empleado.nombreCompleto()} ya participa en el proyecto ${proyecto.codigo} ` +
          `como ${duplicada.rolProyecto} al ${duplicada.porcentajeDedicacion}%. ` +
          'Modifique esa asignacion en lugar de crear una segunda.',
      );
    }

    await this.exigirDedicacionDisponible(entrada.empleadoId, dedicacion, null);

    const ahora = new Date().toISOString();
    const asignacion = new AsignacionProyecto({
      id: nuevoId(),
      creadoEn: ahora,
      actualizadoEn: ahora,
      empleadoId: entrada.empleadoId,
      proyectoId: entrada.proyectoId,
      rolProyecto: entrada.rolProyecto,
      porcentajeDedicacion: dedicacion,
      fechaAsignacion,
      fechaDesasignacion: null,
    });

    await this.ctx.asignaciones.guardar(asignacion);

    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'ASIGNACION_CREADA',
      entidad: 'AsignacionProyecto',
      entidadId: asignacion.id,
      detalle:
        `${empleado.legajo} incorporado a ${proyecto.codigo} como ${entrada.rolProyecto} ` +
        `al ${dedicacion}% desde ${fechaAsignacion}.`,
      exito: true,
    });

    return asignacion.aDTO();
  }

  async actualizar(id: string, datos: unknown): Promise<AsignacionDTO> {
    this.ctx.exigirPermiso('asignacion:gestionar');
    const asignacion = await this.cargar(id);
    const entrada = ESQUEMA_ACTUALIZAR.validar(datos);

    if (entrada.rolProyecto === undefined && entrada.porcentajeDedicacion === undefined) {
      // Sin cambios efectivos no se escribe ni se audita: un asiento vacio solo
      // ensucia la traza y hace mas dificil encontrar los cambios reales.
      return asignacion.aDTO();
    }

    if (!asignacion.activa) {
      throw new ErrorReglaNegocio(
        'La asignacion esta cerrada. Reescribir una participacion ya finalizada falsearia ' +
          'las horas imputadas bajo ella: si la persona vuelve al proyecto, cree una asignacion nueva.',
      );
    }

    if (entrada.porcentajeDedicacion !== undefined) {
      // Se excluye la propia asignacion del computo: si no, se sumaria dos
      // veces (la dedicacion vieja y la nueva) y subir del 40% al 50% podria
      // fallar sin motivo.
      await this.exigirDedicacionDisponible(
        asignacion.empleadoId,
        entrada.porcentajeDedicacion,
        asignacion.id,
      );
      asignacion.cambiarDedicacion(entrada.porcentajeDedicacion);
    }
    if (entrada.rolProyecto !== undefined) {
      asignacion.cambiarRol(entrada.rolProyecto);
    }

    await this.ctx.asignaciones.guardar(asignacion);

    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'ASIGNACION_ACTUALIZADA',
      entidad: 'AsignacionProyecto',
      entidadId: asignacion.id,
      detalle: `Campos modificados: ${Object.keys(entrada).join(', ')}.`,
      exito: true,
    });

    return asignacion.aDTO();
  }

  /**
   * Cierra la participacion.
   *
   * No borra la fila: la asignacion es la que explica las horas ya imputadas al
   * proyecto durante ese periodo. Borrarla dejaria esos partes sin justificante,
   * que es exactamente la perdida de trazabilidad que traia la hoja de calculo.
   */
  async desasignar(id: string, fecha?: string): Promise<AsignacionDTO> {
    this.ctx.exigirPermiso('asignacion:gestionar');
    const asignacion = await this.cargar(id);
    const dia = fecha === undefined ? hoy() : ESQUEMA_FECHA.validar({ fecha }).fecha;

    // La entidad rechaza cerrar dos veces o cerrar antes del alta.
    asignacion.desasignar(dia);
    await this.ctx.asignaciones.guardar(asignacion);

    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'ASIGNACION_CERRADA',
      entidad: 'AsignacionProyecto',
      entidadId: asignacion.id,
      detalle:
        `Participacion de ${asignacion.empleadoId} en ${asignacion.proyectoId} ` +
        `cerrada con fecha ${dia}.`,
      exito: true,
    });

    return asignacion.aDTO();
  }

  // -------------------------------------------------------------------------
  // Apoyo
  // -------------------------------------------------------------------------

  private async cargar(id: string): Promise<AsignacionProyecto> {
    const identificador = ESQUEMA_ID.validar({ id }).id;
    return this.ctx.asignaciones.obtenerOFallar(identificador);
  }

  /**
   * Control de sobreasignacion.
   *
   * Este es el nucleo del problema de "errores en la asignacion de personal a
   * proyectos" del enunciado: con planillas separadas por proyecto nadie veia
   * el total de una persona, y el mismo empleado terminaba comprometido al 60%
   * en tres proyectos a la vez. Cada responsable creia contar con el, y los
   * plazos se calculaban sobre una capacidad que no existia.
   *
   * La suma solo puede calcularse mirando *todas* las asignaciones del
   * empleado, o sea cruzando proyectos: es un invariante entre agregados y por
   * eso ninguna entidad puede sostenerlo por si sola. El mensaje dice cuanto
   * queda libre, para que quien planifica pueda corregir el porcentaje sin
   * tener que ir a buscar el dato a otra pantalla.
   *
   * @param excluirId asignacion que no debe contarse (la que se esta editando).
   */
  private async exigirDedicacionDisponible(
    empleadoId: string,
    dedicacionDeseada: number,
    excluirId: string | null,
  ): Promise<void> {
    const activas = await this.ctx.asignaciones.listar(
      (asignacion) =>
        asignacion.empleadoId === empleadoId && asignacion.activa && asignacion.id !== excluirId,
    );
    const comprometida = redondear(
      activas.reduce((total, asignacion) => total + asignacion.porcentajeDedicacion, 0),
    );
    const disponible = redondear(DEDICACION_TOTAL - comprometida);

    if (dedicacionDeseada > disponible) {
      throw new ErrorReglaNegocio(
        `El empleado ya tiene comprometido el ${comprometida}% de su jornada en ` +
          `${activas.length} proyecto(s) activo(s). Solo quedan ${disponible} puntos ` +
          `disponibles y se pidieron ${dedicacionDeseada}. Reduzca la dedicacion o ` +
          'cierre alguna de las asignaciones vigentes.',
      );
    }
  }
}
