import { nuevoId } from './Identificador.js';

/** Forma persistida mínima de cualquier entidad. */
export interface EstadoEntidad {
  id: string;
  creadoEn: string;
  actualizadoEn: string;
}

/**
 * Raiz de la jerarquía de entidades del dominio.
 *
 * Aporta los tres fundamentos de POO que el resto del modelo reutiliza:
 *
 * - **Abstracción**: define *que* sabe hacer toda entidad (validarse,
 *   serializarse) sin decir *como*.
 * - **Encapsulamiento**: el identificador y las marcas de tiempo son
 *   `protected`/`readonly`; nadie fuera de la jerarquía los reescribe. Las
 *   mutaciones pasan por `tocar()`, que mantiene `actualizadoEn` coherente.
 * - **Herencia + polimorfismo**: `validar()` y `aEstado()` son abstractos, de
 *   modo que los repositorios trabajan con `Entidad` sin conocer subclases.
 */
export abstract class Entidad<E extends EstadoEntidad = EstadoEntidad> {
  readonly id: string;
  protected _creadoEn: string;
  protected _actualizadoEn: string;

  protected constructor(id?: string, creadoEn?: string, actualizadoEn?: string) {
    this.id = id ?? nuevoId();
    const ahora = new Date().toISOString();
    this._creadoEn = creadoEn ?? ahora;
    this._actualizadoEn = actualizadoEn ?? this._creadoEn;
  }

  get creadoEn(): string {
    return this._creadoEn;
  }

  get actualizadoEn(): string {
    return this._actualizadoEn;
  }

  /** Marca la entidad como modificada. Toda mutación debe invocarlo. */
  protected tocar(): void {
    this._actualizadoEn = new Date().toISOString();
  }

  /**
   * Comprueba los invariantes propios de la entidad.
   * Debe lanzar `Errorvalidación` / `ErrorReglaNegocio` si algo no cierra.
   */
  abstract validar(): void;

  /** Proyección serializable que se guarda en el almacén. */
  abstract aEstado(): E;

  /** Igualdad por identidad, no por valor: dos entidades son la misma si comparten id. */
  esIgualA(otra: Entidad): boolean {
    return this.constructor === otra.constructor && this.id === otra.id;
  }

  /** Campos comunes, para que las subclases compongan su `aEstado()`. */
  protected estadoBase(): EstadoEntidad {
    return { id: this.id, creadoEn: this._creadoEn, actualizadoEn: this._actualizadoEn };
  }
}
