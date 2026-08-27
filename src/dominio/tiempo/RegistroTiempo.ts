import { Entidad, type EstadoEntidad } from '../base/Entidad.js';
import { ErrorReglaNegocio, ErrorValidacion } from '../base/errores.js';
import type { EstadoRegistro, RegistroTiempoDTO } from '../../compartido/tipos.js';

export interface EstadoRegistroTiempo extends EstadoEntidad {
  empleadoId: string;
  proyectoId: string;
  fecha: string;
  horas: number;
  descripcion: string;
  estado: EstadoRegistro;
  aprobadoPor: string | null;
  motivoRechazo: string | null;
}

/** Topes de una jornada individual. */
export const HORAS_MINIMAS = 0.25;
export const HORAS_MAXIMAS_POR_REGISTRO = 12;
export const HORAS_MAXIMAS_POR_DIA = 16;

/**
 * Parte de horas: un empleado, un proyecto, un dia.
 *
 * ## Trazabilidad
 *
 * El problema original era la "falta de trazabilidad en el registro de horas
 * trabajadas". Se ataca con un flujo de aprobacion explicito
 * (BORRADOR -> ENVIADO -> APROBADO | RECHAZADO) en lugar de una celda editable:
 *
 * - Mientras esta en BORRADOR el empleado lo corrige libremente.
 * - Al ENVIARLO queda congelado para el, y pasa a depender de un aprobador.
 * - APROBADO es lo unico que suma en la nomina y en los informes de costos.
 * - RECHAZADO vuelve a manos del empleado con un motivo obligatorio, de modo que
 *   siempre queda escrito por que una hora no se pago.
 *
 * Un registro aprobado ya no se edita: para corregirlo hay que rechazarlo antes,
 * y ese rechazo queda en la auditoria. Es lo que impide que alguien reescriba el
 * pasado sin dejar rastro.
 */
export class RegistroTiempo extends Entidad<EstadoRegistroTiempo> {
  private _empleadoId: string;
  private _proyectoId: string;
  private _fecha: string;
  private _horas: number;
  private _descripcion: string;
  private _estado: EstadoRegistro;
  private _aprobadoPor: string | null;
  private _motivoRechazo: string | null;

  constructor(estado: EstadoRegistroTiempo) {
    super(estado.id, estado.creadoEn, estado.actualizadoEn);
    this._empleadoId = estado.empleadoId;
    this._proyectoId = estado.proyectoId;
    this._fecha = estado.fecha;
    this._horas = estado.horas;
    this._descripcion = estado.descripcion;
    this._estado = estado.estado;
    this._aprobadoPor = estado.aprobadoPor;
    this._motivoRechazo = estado.motivoRechazo;
  }

  get empleadoId(): string {
    return this._empleadoId;
  }

  get proyectoId(): string {
    return this._proyectoId;
  }

  get fecha(): string {
    return this._fecha;
  }

  get horas(): number {
    return this._horas;
  }

  get descripcion(): string {
    return this._descripcion;
  }

  get estado(): EstadoRegistro {
    return this._estado;
  }

  get aprobadoPor(): string | null {
    return this._aprobadoPor;
  }

  get motivoRechazo(): string | null {
    return this._motivoRechazo;
  }

  /** Solo las horas aprobadas cuentan para nomina e informes de costo. */
  computaParaNomina(): boolean {
    return this._estado === 'APROBADO';
  }

  /** El empleado solo puede tocar lo que aun no envio o le rechazaron. */
  puedeEditarlo(): boolean {
    return this._estado === 'BORRADOR' || this._estado === 'RECHAZADO';
  }

  /** Mes calendario al que pertenece, en formato `AAAA-MM`. */
  periodo(): string {
    return this._fecha.slice(0, 7);
  }

  editar(campos: { fecha?: string; horas?: number; descripcion?: string; proyectoId?: string }): void {
    if (!this.puedeEditarlo()) {
      throw new ErrorReglaNegocio(
        'Solo se pueden editar registros en borrador o rechazados. ' +
          'Para corregir uno enviado o aprobado, primero debe rechazarse.',
      );
    }
    if (campos.fecha !== undefined) this._fecha = campos.fecha;
    if (campos.horas !== undefined) this._horas = campos.horas;
    if (campos.descripcion !== undefined) this._descripcion = campos.descripcion;
    if (campos.proyectoId !== undefined) this._proyectoId = campos.proyectoId;
    // Editar tras un rechazo devuelve el registro al circuito.
    if (this._estado === 'RECHAZADO') {
      this._estado = 'BORRADOR';
      this._motivoRechazo = null;
    }
    this.tocar();
    this.validar();
  }

  enviar(): void {
    if (this._estado === 'ENVIADO') return;
    if (this._estado === 'APROBADO') {
      throw new ErrorReglaNegocio('El registro ya fue aprobado.');
    }
    this.validar();
    this._estado = 'ENVIADO';
    this._motivoRechazo = null;
    this.tocar();
  }

  aprobar(idAprobador: string): void {
    if (this._estado !== 'ENVIADO') {
      throw new ErrorReglaNegocio(
        `Solo se aprueban registros enviados. Este esta en estado ${this._estado}.`,
      );
    }
    if (idAprobador === this._empleadoId) {
      // Separacion de funciones: nadie valida sus propias horas.
      throw new ErrorReglaNegocio('Un empleado no puede aprobar sus propios registros de horas.');
    }
    this._estado = 'APROBADO';
    this._aprobadoPor = idAprobador;
    this._motivoRechazo = null;
    this.tocar();
  }

  rechazar(idAprobador: string, motivo: string): void {
    if (this._estado !== 'ENVIADO' && this._estado !== 'APROBADO') {
      throw new ErrorReglaNegocio(
        `Solo se rechazan registros enviados o aprobados. Este esta en estado ${this._estado}.`,
      );
    }
    if (motivo.trim().length < 5) {
      throw new ErrorValidacion('El motivo de rechazo es obligatorio.', [
        { campo: 'motivoRechazo', mensaje: 'Debe explicar el rechazo (minimo 5 caracteres).' },
      ]);
    }
    this._estado = 'RECHAZADO';
    this._aprobadoPor = idAprobador;
    this._motivoRechazo = motivo.trim();
    this.tocar();
  }

  override validar(): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this._fecha)) {
      throw new ErrorValidacion('La fecha del registro no es valida.', [
        { campo: 'fecha', mensaje: 'Debe tener el formato AAAA-MM-DD.' },
      ]);
    }
    // No se pueden cargar horas por adelantado: seria imposible de auditar.
    if (this._fecha > new Date().toISOString().slice(0, 10)) {
      throw new ErrorValidacion('No se pueden registrar horas en una fecha futura.', [
        { campo: 'fecha', mensaje: 'No puede ser una fecha futura.' },
      ]);
    }
    if (this._horas < HORAS_MINIMAS || this._horas > HORAS_MAXIMAS_POR_REGISTRO) {
      throw new ErrorValidacion(
        `Las horas deben estar entre ${HORAS_MINIMAS} y ${HORAS_MAXIMAS_POR_REGISTRO}.`,
        [
          {
            campo: 'horas',
            mensaje: `Debe estar entre ${HORAS_MINIMAS} y ${HORAS_MAXIMAS_POR_REGISTRO}.`,
          },
        ],
      );
    }
    const descripcion = this._descripcion.trim();
    if (descripcion.length < 10) {
      throw new ErrorValidacion('La descripcion de la tarea es demasiado breve.', [
        { campo: 'descripcion', mensaje: 'Describa la tarea con al menos 10 caracteres.' },
      ]);
    }
    if (descripcion.length > 500) {
      throw new ErrorValidacion('La descripcion es demasiado larga.', [
        { campo: 'descripcion', mensaje: 'No puede superar los 500 caracteres.' },
      ]);
    }
  }

  override aEstado(): EstadoRegistroTiempo {
    return {
      ...this.estadoBase(),
      empleadoId: this._empleadoId,
      proyectoId: this._proyectoId,
      fecha: this._fecha,
      horas: this._horas,
      descripcion: this._descripcion,
      estado: this._estado,
      aprobadoPor: this._aprobadoPor,
      motivoRechazo: this._motivoRechazo,
    };
  }

  aDTO(): RegistroTiempoDTO {
    return {
      id: this.id,
      empleadoId: this._empleadoId,
      proyectoId: this._proyectoId,
      fecha: this._fecha,
      horas: this._horas,
      descripcion: this._descripcion,
      estado: this._estado,
      aprobadoPor: this._aprobadoPor,
      motivoRechazo: this._motivoRechazo,
      creadoEn: this.creadoEn,
      actualizadoEn: this.actualizadoEn,
    };
  }
}
