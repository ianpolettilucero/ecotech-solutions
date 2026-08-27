import {
  Empleado,
  HORAS_JORNADA_MENSUAL,
  type EstadoEmpleado,
  type ParametrosRemuneracion,
} from './Empleado.js';
import { ErrorValidacion } from '../base/errores.js';
import type { TipoContrato } from '../../compartido/tipos.js';

/** Recargo legal sobre la hora extra (50 % adicional). */
const COEFICIENTE_HORA_EXTRA = 1.5;

/**
 * Empleado jornalizado: cobra por hora efectivamente trabajada y aprobada.
 *
 * Las horas por encima de la jornada mensual (160 h) se liquidan con recargo del
 * 50 %. Esta regla vive aqui y en ningun otro lugar: si manana cambia el
 * convenio, se toca una constante de esta clase y ni la nomina ni los informes
 * se enteran.
 */
export class EmpleadoPorHoras extends Empleado {
  private _tarifaHora: number;

  constructor(estado: EstadoEmpleado) {
    super(estado);
    this._tarifaHora = estado.tarifaHora ?? 0;
  }

  override get tipoContrato(): TipoContrato {
    return 'POR_HORAS';
  }

  get tarifaHora(): number {
    return this._tarifaHora;
  }

  override calcularRemuneracionMensual(horasTrabajadas: number): number {
    const horas = Math.max(0, horasTrabajadas);
    const ordinarias = Math.min(horas, HORAS_JORNADA_MENSUAL);
    const extra = Math.max(0, horas - HORAS_JORNADA_MENSUAL);
    const total = ordinarias * this._tarifaHora + extra * this._tarifaHora * COEFICIENTE_HORA_EXTRA;
    return Math.round(total * 100) / 100;
  }

  override descripcionRemuneracion(): string {
    return `Por hora; las horas sobre ${HORAS_JORNADA_MENSUAL} h/mes se pagan al ${COEFICIENTE_HORA_EXTRA}x.`;
  }

  override parametrosRemuneracion(): ParametrosRemuneracion {
    return { salarioMensual: null, tarifaHora: this._tarifaHora, topeMensual: null };
  }

  override actualizarRemuneracion(parametros: Partial<ParametrosRemuneracion>): void {
    if (parametros.tarifaHora === undefined || parametros.tarifaHora === null) return;
    if (parametros.tarifaHora <= 0) {
      throw new ErrorValidacion('La tarifa por hora debe ser mayor que cero.', [
        { campo: 'tarifaHora', mensaje: 'Debe ser mayor que cero.' },
      ]);
    }
    this._tarifaHora = parametros.tarifaHora;
    this.tocar();
  }

  override validar(): void {
    super.validar();
    if (this._tarifaHora <= 0) {
      throw new ErrorValidacion('Un empleado por horas requiere una tarifa horaria positiva.', [
        { campo: 'tarifaHora', mensaje: 'Debe ser mayor que cero.' },
      ]);
    }
  }
}
