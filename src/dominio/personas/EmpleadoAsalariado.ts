import { Empleado, type EstadoEmpleado, type ParametrosRemuneracion } from './Empleado.js';
import { ErrorValidacion } from '../base/errores.js';
import type { TipoContrato } from '../../compartido/tipos.js';

/**
 * Empleado en relacion de dependencia con sueldo fijo.
 *
 * Su remuneracion **no depende de las horas cargadas**: el registro horario le
 * sirve a la empresa para imputar costo a proyectos, no para liquidar. Por eso
 * `calcularRemuneracionMensual` ignora el parametro, y eso es correcto y
 * deliberado, no un descuido.
 */
export class EmpleadoAsalariado extends Empleado {
  private _salarioMensual: number;

  constructor(estado: EstadoEmpleado) {
    super(estado);
    this._salarioMensual = estado.salarioMensual ?? 0;
  }

  override get tipoContrato(): TipoContrato {
    return 'ASALARIADO';
  }

  get salarioMensual(): number {
    return this._salarioMensual;
  }

  override calcularRemuneracionMensual(_horasTrabajadas: number): number {
    return Math.round(this._salarioMensual * 100) / 100;
  }

  override descripcionRemuneracion(): string {
    return 'Sueldo mensual fijo, independiente de las horas cargadas.';
  }

  override parametrosRemuneracion(): ParametrosRemuneracion {
    return { salarioMensual: this._salarioMensual, tarifaHora: null, topeMensual: null };
  }

  override actualizarRemuneracion(parametros: Partial<ParametrosRemuneracion>): void {
    if (parametros.salarioMensual === undefined || parametros.salarioMensual === null) return;
    if (parametros.salarioMensual <= 0) {
      throw new ErrorValidacion('El salario mensual debe ser mayor que cero.', [
        { campo: 'salarioMensual', mensaje: 'Debe ser mayor que cero.' },
      ]);
    }
    this._salarioMensual = parametros.salarioMensual;
    this.tocar();
  }

  override validar(): void {
    super.validar();
    if (this._salarioMensual <= 0) {
      throw new ErrorValidacion('Un empleado asalariado requiere un salario mensual positivo.', [
        { campo: 'salarioMensual', mensaje: 'Debe ser mayor que cero.' },
      ]);
    }
  }
}
