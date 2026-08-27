import { Empleado, type EstadoEmpleado, type ParametrosRemuneracion } from './Empleado.js';
import { ErrorValidacion } from '../base/errores.js';
import type { TipoContrato } from '../../compartido/tipos.js';

/**
 * Profesional externo contratado por obra o servicio.
 *
 * Factura por hora, pero con un **tope mensual** pactado que la empresa no
 * supera aunque se carguen más horas. Es justamente lo que hace que no baste con
 * reutilizar `EmpleadoPorHoras`: misma unidad de medida, regla económica
 * distinta.
 *
 * No percibe recargo por horas extra, porque no está en relación de dependencia.
 */
export class Contratista extends Empleado {
  private _tarifaHora: number;
  private _topeMensual: number;

  constructor(estado: EstadoEmpleado) {
    super(estado);
    this._tarifaHora = estado.tarifaHora ?? 0;
    this._topeMensual = estado.topeMensual ?? 0;
  }

  override get tipoContrato(): TipoContrato {
    return 'CONTRATISTA';
  }

  get tarifaHora(): number {
    return this._tarifaHora;
  }

  get topeMensual(): number {
    return this._topeMensual;
  }

  override calcularRemuneracionMensual(horasTrabajadas: number): number {
    const bruto = Math.max(0, horasTrabajadas) * this._tarifaHora;
    return Math.round(Math.min(bruto, this._topeMensual) * 100) / 100;
  }

  /** `true` si el tope recorto la facturación del periodo. Lo usa la nómina. */
  alcanzoTope(horasTrabajadas: number): boolean {
    return Math.max(0, horasTrabajadas) * this._tarifaHora > this._topeMensual;
  }

  override descripcionRemuneracion(): string {
    return 'Por hora facturada, con tope mensual pactado. Sin recargo por horas extra.';
  }

  override parametrosRemuneracion(): ParametrosRemuneracion {
    return {
      salarioMensual: null,
      tarifaHora: this._tarifaHora,
      topeMensual: this._topeMensual,
    };
  }

  override actualizarRemuneracion(parametros: Partial<ParametrosRemuneracion>): void {
    let cambio = false;
    if (parametros.tarifaHora !== undefined && parametros.tarifaHora !== null) {
      if (parametros.tarifaHora <= 0) {
        throw new ErrorValidacion('La tarifa por hora debe ser mayor que cero.', [
          { campo: 'tarifaHora', mensaje: 'Debe ser mayor que cero.' },
        ]);
      }
      this._tarifaHora = parametros.tarifaHora;
      cambio = true;
    }
    if (parametros.topeMensual !== undefined && parametros.topeMensual !== null) {
      if (parametros.topeMensual <= 0) {
        throw new ErrorValidacion('El tope mensual debe ser mayor que cero.', [
          { campo: 'topeMensual', mensaje: 'Debe ser mayor que cero.' },
        ]);
      }
      this._topeMensual = parametros.topeMensual;
      cambio = true;
    }
    if (cambio) this.tocar();
  }

  override validar(): void {
    super.validar();
    if (this._tarifaHora <= 0) {
      throw new ErrorValidacion('Un contratista requiere una tarifa horaria positiva.', [
        { campo: 'tarifaHora', mensaje: 'Debe ser mayor que cero.' },
      ]);
    }
    if (this._topeMensual <= 0) {
      throw new ErrorValidacion('Un contratista requiere un tope mensual positivo.', [
        { campo: 'topeMensual', mensaje: 'Debe ser mayor que cero.' },
      ]);
    }
    if (this._topeMensual < this._tarifaHora) {
      throw new ErrorValidacion('El tope mensual no puede ser menor que una hora de trabajo.', [
        { campo: 'topeMensual', mensaje: 'Es incoherente con la tarifa horaria.' },
      ]);
    }
  }
}
