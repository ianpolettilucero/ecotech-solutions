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
 * para que el día que la empresa admita sobreasignación planificada (por
 * ejemplo hasta 120 en periodos pico) haya un único punto que tocar.
 */
const DEDICACION_TOTAL = 100;

// ---------------------------------------------------------------------------
// Esquemas de validación
//
// Constantes de módulo: se construyen una sola vez por isolate (los `RegExp`
// de las reglas no se recompilan en cada petición) y quedan disponibles para
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
  // Por defecto el empleado se incorpora a dedicación completa, que es el caso
  // habitual cuando alguien entra a un único proyecto.
  porcentajeDedicacion: campo(new ReglaNumero(1, DEDICACION_TOTAL), {
    opcional: true,
    porDefecto: DEDICACION_TOTAL,
  }),
  // Se admite fecha futura: planificar la incorporación de alguien al proyecto
  // del mes que viene es legítimo. El valor por defecto (hoy) no puede
  // declararse aquí porque se evaluaría una sola vez al cargar el módulo.
  fechaAsignacion: campo(new ReglaFecha(true), { opcional: true }),
});

/**
 * Actualización.
 *
 * Solo se dejan tocar el rol y la dedicación. `empleadoId`, `proyectoId` y
 * `fechaasignación` quedan fuera del esquema a propósito: reapuntar una
 * asignación a otra persona o a otro proyecto cambiaría retroactivamente el
 * vinculo que explica las horas ya imputadas bajo ella. Para eso se cierra la
 * asignación y se crea otra, y quedan dos asientos de auditoría en vez de uno.
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
 * Casos de uso sobre la participación de empleados en proyectos.
 *
 * La entidad `AsignacionProyecto` sabe cuando esta vigente y como cerrarse,
 * pero no puede saber si el empleado existe, si el proyecto admite gente nueva
 * ni cuanta jornada tiene ya comprometida esa persona en *otros* proyectos:
 * todo eso son invariantes entre agregados, y por eso viven aquí.
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

    // Las vigentes primero y, dentro de cada grupo, la incorporación más
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
   * consulta para otros servicios (la validación de un parte de horas, los
   * informes de dedicación), que necesitan preguntar a cada asignación por su
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
        'El empleado indicado no existe: no se puede asignar a un proyecto a alguien que no está dado de alta.',
      );
    }
    if (!empleado.activo) {
      throw new ErrorReglaNegocio(
        `El empleado ${empleado.legajo} está dado de baja y no puede incorporarse a un proyecto.`,
      );
    }

    const proyecto = await this.ctx.proyectos.obtener(entrada.proyectoId);
    if (proyecto === null) {
      throw new ErrorReglaNegocio('El proyecto indicado no existe.');
    }
    if (!proyecto.estaAbierto()) {
      throw new ErrorReglaNegocio(
        `El proyecto ${proyecto.codigo} está ${proyecto.estado} y ya no admite incorporaciones.`,
      );
    }

    // Una persona no puede estar dos veces en el mismo equipo: sería imposible
    // decir cual de las dos líneas explica una hora imputada, y la dedicación
    // se contaría por duplicado. Si existe una asignación CERRADA no molesta:
    // reincorporar a alguien al proyecto es legítimo y crea una línea nueva,
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
          'Modifique esa asignación en lugar de crear una segunda.',
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
      // Sin cambios efectivos no se escribe ni se audita: un asiento vacío solo
      // ensucia la traza y hace más difícil encontrar los cambios reales.
      return asignacion.aDTO();
    }

    if (!asignacion.activa) {
      throw new ErrorReglaNegocio(
        'La asignación está cerrada. Reescribir una participación ya finalizada falsearía ' +
          'las horas imputadas bajo ella: si la persona vuelve al proyecto, cree una asignación nueva.',
      );
    }

    if (entrada.porcentajeDedicacion !== undefined) {
      // Se excluye la propia asignación del computo: si no, se sumaría dos
      // veces (la dedicación vieja y la nueva) y subir del 40% al 50% podría
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
   * Cierra la participación.
   *
   * No borra la fila: la asignación es la que explica las horas ya imputadas al
   * proyecto durante ese periodo. Borrarla dejaría esos partes sin justificante,
   * que es exactamente la perdida de trazabilidad que traía la hoja de cálculo.
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
        `Participación de ${asignacion.empleadoId} en ${asignacion.proyectoId} ` +
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
   * Control de sobreasignación.
   *
   * Este es el nucleo del problema de "errores en la asignación de personal a
   * proyectos" del enunciado: con planillas separadas por proyecto nadie veía
   * el total de una persona, y el mismo empleado terminaba comprometido al 60%
   * en tres proyectos a la vez. Cada responsable creía contar con el, y los
   * plazos se calculaban sobre una capacidad que no existía.
   *
   * La suma solo puede calcularse mirando *todas* las asignaciones del
   * empleado, o sea cruzando proyectos: es un invariante entre agregados y por
   * eso ninguna entidad puede sostenerlo por si sola. El mensaje dice cuanto
   * queda libre, para que quien planifica pueda corregir el porcentaje sin
   * tener que ir a buscar el dato a otra pantalla.
   *
   * @param excluirId asignación que no debe contarse (la que se está editando).
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
          `disponibles y se pidieron ${dedicacionDeseada}. Reduzca la dedicación o ` +
          'cierre alguna de las asignaciones vigentes.',
      );
    }
  }
}
