import { Entidad, type EstadoEntidad } from '../base/Entidad.js';
import { ErrorReglaNegocio, ErrorValidacion } from '../base/errores.js';
import type { AsignacionDTO, RolProyecto } from '../../compartido/tipos.js';

export interface EstadoAsignacion extends EstadoEntidad {
  empleadoId: string;
  proyectoId: string;
  rolProyecto: RolProyecto;
  porcentajeDedicacion: number;
  fechaAsignacion: string;
  fechaDesasignacion: string | null;
}

/**
 * Participación de un empleado en un proyecto.
 *
 * ## Por que esto es una clase y no una línea del diagrama
 *
 * Empleado y Proyecto tienen una relación muchos-a-muchos: un empleado participa
 * en varios proyectos y un proyecto ocupa a varios empleados. La tentación (y el
 * error más frecuente en los diagramas generados por IA) es resolverla con una
 * simple asociación `N..*` entre ambas clases.
 *
 * No alcanza, porque **la relación en si tiene datos**: con que rol participa,
 * que porcentaje de su jornada dedica, desde cuando y hasta cuando. Esos
 * atributos no pertenecen ni al empleado (varian por proyecto) ni al proyecto
 * (varian por empleado): pertenecen al vinculo. En UML eso es exactamente una
 * **clase de asociación**, y en código, una entidad propia con identidad.
 *
 * Además resuelve la trazabilidad: al desasignar no se borra la fila, se cierra
 * con `fechadesasignación`. Las horas cargadas durante ese periodo siguen
 * teniendo un vinculo que las explica, que es justamente lo que las hojas de
 * cálculo perdian.
 */
export class AsignacionProyecto extends Entidad<EstadoAsignacion> {
  private _empleadoId: string;
  private _proyectoId: string;
  private _rolProyecto: RolProyecto;
  private _porcentajeDedicacion: number;
  private _fechaAsignacion: string;
  private _fechaDesasignacion: string | null;

  constructor(estado: EstadoAsignacion) {
    super(estado.id, estado.creadoEn, estado.actualizadoEn);
    this._empleadoId = estado.empleadoId;
    this._proyectoId = estado.proyectoId;
    this._rolProyecto = estado.rolProyecto;
    this._porcentajeDedicacion = estado.porcentajeDedicacion;
    this._fechaAsignacion = estado.fechaAsignacion;
    this._fechaDesasignacion = estado.fechaDesasignacion;
  }

  get empleadoId(): string {
    return this._empleadoId;
  }

  get proyectoId(): string {
    return this._proyectoId;
  }

  get rolProyecto(): RolProyecto {
    return this._rolProyecto;
  }

  get porcentajeDedicacion(): number {
    return this._porcentajeDedicacion;
  }

  get fechaAsignacion(): string {
    return this._fechaAsignacion;
  }

  get fechaDesasignacion(): string | null {
    return this._fechaDesasignacion;
  }

  /** Vigente = todavía no cerrada. */
  get activa(): boolean {
    return this._fechaDesasignacion === null;
  }

  /**
   * Si la asignación cubría la fecha indicada. Se usa al validar un registro de
   * horas: no se pueden imputar horas a un proyecto en el que no se participaba
   * ese día.
   */
  estabaVigenteEn(fecha: string): boolean {
    if (fecha < this._fechaAsignacion) return false;
    return this._fechaDesasignacion === null || fecha <= this._fechaDesasignacion;
  }

  cambiarRol(rol: RolProyecto): void {
    if (!this.activa) {
      throw new ErrorReglaNegocio('No se puede modificar una asignación ya cerrada.');
    }
    this._rolProyecto = rol;
    this.tocar();
  }

  cambiarDedicacion(porcentaje: number): void {
    if (!this.activa) {
      throw new ErrorReglaNegocio('No se puede modificar una asignación ya cerrada.');
    }
    this._porcentajeDedicacion = porcentaje;
    this.tocar();
    this.validar();
  }

  /** Cierra la participación. No borra: preserva la trazabilidad histórica. */
  desasignar(fecha: string): void {
    if (!this.activa) {
      throw new ErrorReglaNegocio('La asignación ya estaba cerrada.');
    }
    if (fecha < this._fechaAsignacion) {
      throw new ErrorReglaNegocio(
        'La fecha de desasignación no puede ser anterior a la de asignación.',
      );
    }
    this._fechaDesasignacion = fecha;
    this.tocar();
  }

  /** Reabre una asignación cerrada por error. Queda en la traza de auditoría. */
  reactivar(): void {
    if (this.activa) return;
    this._fechaDesasignacion = null;
    this.tocar();
  }

  override validar(): void {
    if (this._porcentajeDedicacion <= 0 || this._porcentajeDedicacion > 100) {
      throw new ErrorValidacion('El porcentaje de dedicación debe estar entre 1 y 100.', [
        { campo: 'porcentajeDedicacion', mensaje: 'Debe estar entre 1 y 100.' },
      ]);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this._fechaAsignacion)) {
      throw new ErrorValidacion('La fecha de asignación no es válida.', [
        { campo: 'fechaAsignacion', mensaje: 'Debe tener el formato AAAA-MM-DD.' },
      ]);
    }
    if (this._fechaDesasignacion !== null && this._fechaDesasignacion < this._fechaAsignacion) {
      throw new ErrorValidacion('La fecha de desasignación es anterior a la de asignación.', [
        { campo: 'fechaDesasignacion', mensaje: 'Debe ser posterior a la asignación.' },
      ]);
    }
  }

  override aEstado(): EstadoAsignacion {
    return {
      ...this.estadoBase(),
      empleadoId: this._empleadoId,
      proyectoId: this._proyectoId,
      rolProyecto: this._rolProyecto,
      porcentajeDedicacion: this._porcentajeDedicacion,
      fechaAsignacion: this._fechaAsignacion,
      fechaDesasignacion: this._fechaDesasignacion,
    };
  }

  aDTO(): AsignacionDTO {
    return {
      id: this.id,
      empleadoId: this._empleadoId,
      proyectoId: this._proyectoId,
      rolProyecto: this._rolProyecto,
      porcentajeDedicacion: this._porcentajeDedicacion,
      fechaAsignacion: this._fechaAsignacion,
      fechaDesasignacion: this._fechaDesasignacion,
      activa: this.activa,
      creadoEn: this.creadoEn,
      actualizadoEn: this.actualizadoEn,
    };
  }
}
