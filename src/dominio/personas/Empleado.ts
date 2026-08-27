import { Persona, type EstadoPersona } from './Persona.js';
import { ErrorReglaNegocio, ErrorValidacion } from '../base/errores.js';
import type { DatosSensiblesDTO, EmpleadoDTO, TipoContrato } from '../../compartido/tipos.js';

/** Parametros economicos; cuales aplican depende de la subclase. */
export interface ParametrosRemuneracion {
  salarioMensual: number | null;
  tarifaHora: number | null;
  topeMensual: number | null;
}

export interface EstadoEmpleado extends EstadoPersona {
  legajo: string;
  tipoContrato: TipoContrato;
  fechaInicioContrato: string;
  departamentoId: string | null;
  activo: boolean;
  salarioMensual: number | null;
  tarifaHora: number | null;
  topeMensual: number | null;
}

/** Horas mensuales de la jornada completa, base para calcular horas extra. */
export const HORAS_JORNADA_MENSUAL = 160;

/**
 * Empleado de EcoTech Solutions.
 *
 * ## El punto de herencia y polimorfismo del modelo
 *
 * La empresa remunera de tres maneras distintas (sueldo fijo, por hora con
 * recargo por extras, y contratista con tope mensual). La alternativa ingenua
 * es una sola clase `Empleado` con un campo `tipo` y un `switch` dentro de
 * `calcularSueldo()`. Ese `switch` reaparece luego en el generador de nomina, en
 * el validador de altas y en los informes: cada modalidad nueva obliga a
 * encontrar y tocar todos esos puntos, y el que se olvide produce un error de
 * calculo silencioso.
 *
 * Aqui `calcularRemuneracionMensual` es **abstracto**: cada subclase encierra su
 * propia formula, y el motor de nomina recorre una lista de `Empleado` sin saber
 * de que tipo es cada uno. Agregar una modalidad es agregar una clase; ningun
 * codigo existente cambia (principio abierto/cerrado).
 *
 * ## Lo que deliberadamente NO es una subclase
 *
 * `Gerente` NO hereda de `Empleado`. Ser gerente es un **rol que se ocupa**, no
 * una naturaleza: una persona lo asume y lo deja sin dejar de ser el mismo
 * empleado, y en herencia eso obligaria a destruir y recrear el objeto (con su
 * id, su historial y sus horas). Se modela como la asociacion
 * `Departamento --gerente--> Empleado`. El detalle esta justificado en
 * `docs/04-justificacion-diseno.md`.
 */
export abstract class Empleado extends Persona<EstadoEmpleado> {
  protected _legajo: string;
  protected _fechaInicioContrato: string;
  protected _departamentoId: string | null;
  protected _activo: boolean;

  protected constructor(estado: EstadoEmpleado) {
    super(estado);
    this._legajo = estado.legajo;
    this._fechaInicioContrato = estado.fechaInicioContrato;
    this._departamentoId = estado.departamentoId;
    this._activo = estado.activo;
  }

  // ---------------------------------------------------------------------------
  // Contrato polimorfico: lo que cada modalidad resuelve a su manera
  // ---------------------------------------------------------------------------

  /** Discriminante persistido; la fabrica lo usa para rehidratar la subclase. */
  abstract get tipoContrato(): TipoContrato;

  /**
   * Remuneracion bruta del mes.
   * @param horasTrabajadas horas aprobadas del periodo (las no aprobadas no pagan).
   */
  abstract calcularRemuneracionMensual(horasTrabajadas: number): number;

  /** Explicacion legible de la formula, para la columna "Detalle" de la nomina. */
  abstract descripcionRemuneracion(): string;

  /** Proyeccion de los parametros economicos al estado persistido. */
  abstract parametrosRemuneracion(): ParametrosRemuneracion;

  /** Reemplaza los parametros economicos validando los propios de la subclase. */
  abstract actualizarRemuneracion(parametros: Partial<ParametrosRemuneracion>): void;

  // ---------------------------------------------------------------------------
  // Comportamiento comun
  // ---------------------------------------------------------------------------

  get legajo(): string {
    return this._legajo;
  }

  get fechaInicioContrato(): string {
    return this._fechaInicioContrato;
  }

  get departamentoId(): string | null {
    return this._departamentoId;
  }

  get activo(): boolean {
    return this._activo;
  }

  override descripcionRol(): string {
    return `Empleado (${this.tipoContrato.toLowerCase().replace('_', ' ')})`;
  }

  /**
   * Requisito: "cada empleado solo puede pertenecer a un departamento a la vez".
   * El invariante se cumple por construccion: hay un unico campo escalar, no una
   * coleccion. Reasignar es reemplazar, nunca agregar.
   */
  asignarADepartamento(departamentoId: string): void {
    if (!this._activo) {
      throw new ErrorReglaNegocio('No se puede asignar un departamento a un empleado inactivo.');
    }
    this._departamentoId = departamentoId;
    this.tocar();
  }

  quitarDeDepartamento(): void {
    this._departamentoId = null;
    this.tocar();
  }

  /**
   * Baja logica, no fisica. Requisito de trazabilidad: si se borrara el registro,
   * las horas y asignaciones historicas quedarian huerfanas y los informes de
   * periodos cerrados cambiarian retroactivamente.
   */
  desactivar(): void {
    this._activo = false;
    this._departamentoId = null;
    this.tocar();
  }

  reactivar(): void {
    this._activo = true;
    this.tocar();
  }

  cambiarFechaInicioContrato(fecha: string): void {
    this._fechaInicioContrato = fecha;
    this.tocar();
  }

  /** Antiguedad en anios cumplidos a la fecha indicada (por defecto, hoy). */
  antiguedadEnAnios(referencia: Date = new Date()): number {
    const inicio = new Date(`${this._fechaInicioContrato}T00:00:00Z`);
    if (Number.isNaN(inicio.getTime())) return 0;
    const ms = referencia.getTime() - inicio.getTime();
    if (ms < 0) return 0;
    return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
  }

  override validar(): void {
    super.validar();
    if (!this._legajo) {
      throw new ErrorValidacion('El empleado debe tener un legajo asignado.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this._fechaInicioContrato)) {
      throw new ErrorValidacion('La fecha de inicio de contrato no es valida.', [
        { campo: 'fechaInicioContrato', mensaje: 'Debe tener el formato AAAA-MM-DD.' },
      ]);
    }
  }

  override aEstado(): EstadoEmpleado {
    return {
      ...this.estadoPersona(),
      legajo: this._legajo,
      tipoContrato: this.tipoContrato,
      fechaInicioContrato: this._fechaInicioContrato,
      departamentoId: this._departamentoId,
      activo: this._activo,
      ...this.parametrosRemuneracion(),
    };
  }

  /**
   * Proyeccion hacia la API.
   *
   * `sensibles` llega ya descifrado desde el servicio, o `null` cuando el
   * solicitante no tiene `empleado:leer_sensible`. En ese caso se devuelven
   * valores enmascarados en vez de omitir las claves, para que el cliente pueda
   * pintar la ficha completa mostrando explicitamente que hay datos ocultos, en
   * lugar de dar a entender que el empleado no los tiene cargados.
   */
  aDTO(sensibles: DatosSensiblesDTO | null): EmpleadoDTO {
    const enmascarado = sensibles === null;
    const parametros = this.parametrosRemuneracion();
    return {
      id: this.id,
      legajo: this._legajo,
      nombre: this._nombre,
      apellido: this._apellido,
      nombreCompleto: this.nombreCompleto(),
      emailCorporativo: this._emailCorporativo,
      tipoContrato: this.tipoContrato,
      fechaInicioContrato: this._fechaInicioContrato,
      departamentoId: this._departamentoId,
      activo: this._activo,
      datosSensibles: sensibles ?? {
        documento: '********',
        telefono: '********',
        direccion: '********',
        emailPersonal: '********',
      },
      sensiblesEnmascarados: enmascarado,
      salarioMensual: enmascarado ? null : parametros.salarioMensual,
      tarifaHora: enmascarado ? null : parametros.tarifaHora,
      topeMensual: enmascarado ? null : parametros.topeMensual,
      creadoEn: this.creadoEn,
      actualizadoEn: this.actualizadoEn,
    };
  }
}
