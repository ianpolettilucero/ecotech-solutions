import { Entidad, type EstadoEntidad } from '../base/Entidad.js';
import { ErrorValidacion } from '../base/errores.js';
import type { DepartamentoDTO } from '../../compartido/tipos.js';

export interface EstadoDepartamento extends EstadoEntidad {
  nombre: string;
  /** Nombre en minusculas y sin espacios repetidos: clave de unicidad. */
  nombreNormalizado: string;
  descripcion: string;
  gerenteId: string | null;
  activo: boolean;
}

/**
 * Unidad organizativa de la empresa (Desarrollo Sostenible, I+D, Ventas, RRHH...).
 *
 * ## La gerencia es una asociacion, no una herencia
 *
 * `gerenteId` apunta a un `Empleado`. El gerente **sigue siendo un empleado
 * normal**: tiene legajo, carga horas y pertenece a un departamento (no
 * necesariamente al que dirige). Modelarlo como subclase `Gerente extends
 * Empleado` obligaria a recrear el objeto cada vez que alguien asume o deja el
 * cargo, perdiendo su identidad y su historial.
 *
 * Se guarda el **identificador** y no la instancia para evitar ciclos de
 * referencia al serializar y para que un cambio en el empleado no obligue a
 * reescribir todos los departamentos. La integridad referencial (que el id
 * exista y corresponda a un empleado activo) la verifica `ServicioDepartamentos`,
 * porque requiere consultar otro repositorio y la entidad no debe conocerlo.
 */
export class Departamento extends Entidad<EstadoDepartamento> {
  private _nombre: string;
  private _descripcion: string;
  private _gerenteId: string | null;
  private _activo: boolean;

  constructor(estado: EstadoDepartamento) {
    super(estado.id, estado.creadoEn, estado.actualizadoEn);
    this._nombre = estado.nombre;
    this._descripcion = estado.descripcion;
    this._gerenteId = estado.gerenteId;
    this._activo = estado.activo;
  }

  /** Normalizacion usada como clave de unicidad de nombre. */
  static normalizarNombre(nombre: string): string {
    return nombre.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  get nombre(): string {
    return this._nombre;
  }

  get nombreNormalizado(): string {
    return Departamento.normalizarNombre(this._nombre);
  }

  get descripcion(): string {
    return this._descripcion;
  }

  get gerenteId(): string | null {
    return this._gerenteId;
  }

  get activo(): boolean {
    return this._activo;
  }

  tieneGerente(): boolean {
    return this._gerenteId !== null;
  }

  renombrar(nombre: string): void {
    this._nombre = nombre;
    this.tocar();
  }

  cambiarDescripcion(descripcion: string): void {
    this._descripcion = descripcion;
    this.tocar();
  }

  /** Designa gerente. `null` deja el puesto vacante. */
  designarGerente(empleadoId: string | null): void {
    this._gerenteId = empleadoId;
    this.tocar();
  }

  /**
   * Si el empleado indicado dirige este departamento, deja el puesto vacante.
   * Lo invoca la baja de empleados para no dejar una referencia colgada.
   */
  liberarSiEsGerente(empleadoId: string): boolean {
    if (this._gerenteId !== empleadoId) return false;
    this._gerenteId = null;
    this.tocar();
    return true;
  }

  desactivar(): void {
    this._activo = false;
    this._gerenteId = null;
    this.tocar();
  }

  reactivar(): void {
    this._activo = true;
    this.tocar();
  }

  override validar(): void {
    const nombre = this._nombre.trim();
    if (nombre.length < 3) {
      throw new ErrorValidacion('El nombre del departamento es demasiado corto.', [
        { campo: 'nombre', mensaje: 'Debe tener al menos 3 caracteres.' },
      ]);
    }
    if (nombre.length > 80) {
      throw new ErrorValidacion('El nombre del departamento es demasiado largo.', [
        { campo: 'nombre', mensaje: 'No puede superar los 80 caracteres.' },
      ]);
    }
    if (this._descripcion.length > 500) {
      throw new ErrorValidacion('La descripcion es demasiado larga.', [
        { campo: 'descripcion', mensaje: 'No puede superar los 500 caracteres.' },
      ]);
    }
  }

  override aEstado(): EstadoDepartamento {
    return {
      ...this.estadoBase(),
      nombre: this._nombre,
      nombreNormalizado: this.nombreNormalizado,
      descripcion: this._descripcion,
      gerenteId: this._gerenteId,
      activo: this._activo,
    };
  }

  aDTO(): DepartamentoDTO {
    return {
      id: this.id,
      nombre: this._nombre,
      descripcion: this._descripcion,
      gerenteId: this._gerenteId,
      activo: this._activo,
      creadoEn: this.creadoEn,
      actualizadoEn: this.actualizadoEn,
    };
  }
}
