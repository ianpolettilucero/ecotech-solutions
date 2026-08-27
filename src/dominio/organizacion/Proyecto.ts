import { Entidad, type EstadoEntidad } from '../base/Entidad.js';
import { ErrorReglaNegocio, ErrorValidacion } from '../base/errores.js';
import type { EstadoProyecto, ProyectoDTO } from '../../compartido/tipos.js';

export interface EstadoProyectoPersistido extends EstadoEntidad {
  codigo: string;
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFinEstimada: string | null;
  estado: EstadoProyecto;
  departamentoId: string | null;
  presupuestoHoras: number;
}

/**
 * Transiciones permitidas del ciclo de vida de un proyecto.
 *
 * Se declara como tabla y no como cadena de `if`: la máquina de estados queda
 * legible de un vistazo y es imposible que dos métodos discrepen sobre que
 * transición es valida. FINALIZADO y CANCELADO son terminales a propósito; para
 * revivir un proyecto se crea uno nuevo, de modo que los informes de periodos
 * cerrados nunca cambien retroactivamente.
 */
const TRANSICIONES: Readonly<Record<EstadoProyecto, readonly EstadoProyecto[]>> = Object.freeze({
  PLANIFICADO: ['EN_CURSO', 'CANCELADO'],
  EN_CURSO: ['PAUSADO', 'FINALIZADO', 'CANCELADO'],
  PAUSADO: ['EN_CURSO', 'CANCELADO'],
  FINALIZADO: [],
  CANCELADO: [],
});

/**
 * Proyecto de la empresa.
 *
 * Concentra dos invariantes que las hojas de cálculo no podian sostener: que la
 * fecha de fin estimada nunca sea anterior al inicio, y que el estado solo
 * avance por transiciones legitimas.
 */
export class Proyecto extends Entidad<EstadoProyectoPersistido> {
  private _codigo: string;
  private _nombre: string;
  private _descripcion: string;
  private _fechaInicio: string;
  private _fechaFinEstimada: string | null;
  private _estado: EstadoProyecto;
  private _departamentoId: string | null;
  private _presupuestoHoras: number;

  constructor(estado: EstadoProyectoPersistido) {
    super(estado.id, estado.creadoEn, estado.actualizadoEn);
    this._codigo = estado.codigo;
    this._nombre = estado.nombre;
    this._descripcion = estado.descripcion;
    this._fechaInicio = estado.fechaInicio;
    this._fechaFinEstimada = estado.fechaFinEstimada;
    this._estado = estado.estado;
    this._departamentoId = estado.departamentoId;
    this._presupuestoHoras = estado.presupuestoHoras;
  }

  get codigo(): string {
    return this._codigo;
  }

  get nombre(): string {
    return this._nombre;
  }

  get descripcion(): string {
    return this._descripcion;
  }

  get fechaInicio(): string {
    return this._fechaInicio;
  }

  get fechaFinEstimada(): string | null {
    return this._fechaFinEstimada;
  }

  get estado(): EstadoProyecto {
    return this._estado;
  }

  get departamentoId(): string | null {
    return this._departamentoId;
  }

  get presupuestoHoras(): number {
    return this._presupuestoHoras;
  }

  /** Un proyecto cerrado no admite nuevas horas ni asignaciones. */
  estaAbierto(): boolean {
    return this._estado === 'PLANIFICADO' || this._estado === 'EN_CURSO' || this._estado === 'PAUSADO';
  }

  /** Solo un proyecto EN_CURSO admite carga de horas. */
  admiteCargaDeHoras(): boolean {
    return this._estado === 'EN_CURSO';
  }

  /** Porcentaje de presupuesto consumido, acotado para la barra de progreso. */
  porcentajeConsumido(horasImputadas: number): number {
    if (this._presupuestoHoras <= 0) return 0;
    return Math.round((horasImputadas / this._presupuestoHoras) * 1000) / 10;
  }

  excedePresupuesto(horasImputadas: number): boolean {
    return this._presupuestoHoras > 0 && horasImputadas > this._presupuestoHoras;
  }

  actualizarDatos(campos: {
    nombre?: string;
    descripcion?: string;
    fechaInicio?: string;
    fechaFinEstimada?: string | null;
    departamentoId?: string | null;
    presupuestoHoras?: number;
  }): void {
    if (campos.nombre !== undefined) this._nombre = campos.nombre;
    if (campos.descripcion !== undefined) this._descripcion = campos.descripcion;
    if (campos.fechaInicio !== undefined) this._fechaInicio = campos.fechaInicio;
    if (campos.fechaFinEstimada !== undefined) this._fechaFinEstimada = campos.fechaFinEstimada;
    if (campos.departamentoId !== undefined) this._departamentoId = campos.departamentoId;
    if (campos.presupuestoHoras !== undefined) this._presupuestoHoras = campos.presupuestoHoras;
    this.tocar();
    this.validar();
  }

  /** Cambia de estado solo si la transición figura en la tabla. */
  cambiarEstado(nuevo: EstadoProyecto): void {
    if (nuevo === this._estado) return;
    const permitidas = TRANSICIONES[this._estado] ?? [];
    if (!permitidas.includes(nuevo)) {
      throw new ErrorReglaNegocio(
        `No se puede pasar de ${this._estado} a ${nuevo}. Transiciones validas: ` +
          (permitidas.length > 0 ? permitidas.join(', ') : 'ninguna (estado terminal)'),
      );
    }
    this._estado = nuevo;
    this.tocar();
  }

  /** Estados a los que este proyecto puede moverse ahora. Lo usa el cliente. */
  transicionesPosibles(): EstadoProyecto[] {
    return [...(TRANSICIONES[this._estado] ?? [])];
  }

  override validar(): void {
    if (this._nombre.trim().length < 3) {
      throw new ErrorValidacion('El nombre del proyecto es demasiado corto.', [
        { campo: 'nombre', mensaje: 'Debe tener al menos 3 caracteres.' },
      ]);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this._fechaInicio)) {
      throw new ErrorValidacion('La fecha de inicio no es válida.', [
        { campo: 'fechaInicio', mensaje: 'Debe tener el formato AAAA-MM-DD.' },
      ]);
    }
    if (this._fechaFinEstimada !== null && this._fechaFinEstimada < this._fechaInicio) {
      throw new ErrorValidacion('La fecha de fin no puede ser anterior al inicio.', [
        { campo: 'fechaFinEstimada', mensaje: 'Debe ser posterior a la fecha de inicio.' },
      ]);
    }
    if (this._presupuestoHoras < 0) {
      throw new ErrorValidacion('El presupuesto de horas no puede ser negativo.', [
        { campo: 'presupuestoHoras', mensaje: 'Debe ser cero o mayor.' },
      ]);
    }
  }

  override aEstado(): EstadoProyectoPersistido {
    return {
      ...this.estadoBase(),
      codigo: this._codigo,
      nombre: this._nombre,
      descripcion: this._descripcion,
      fechaInicio: this._fechaInicio,
      fechaFinEstimada: this._fechaFinEstimada,
      estado: this._estado,
      departamentoId: this._departamentoId,
      presupuestoHoras: this._presupuestoHoras,
    };
  }

  aDTO(): ProyectoDTO {
    return {
      id: this.id,
      codigo: this._codigo,
      nombre: this._nombre,
      descripcion: this._descripcion,
      fechaInicio: this._fechaInicio,
      fechaFinEstimada: this._fechaFinEstimada,
      estado: this._estado,
      departamentoId: this._departamentoId,
      presupuestoHoras: this._presupuestoHoras,
      creadoEn: this.creadoEn,
      actualizadoEn: this.actualizadoEn,
    };
  }
}
