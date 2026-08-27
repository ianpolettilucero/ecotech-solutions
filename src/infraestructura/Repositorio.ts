import type { Entidad, EstadoEntidad } from '../dominio/base/Entidad.js';

/**
 * Contrato de persistencia, independiente del motor de almacenamiento.
 *
 * El dominio y los servicios dependen de esta *abstracción*, nunca de Workers
 * KV. Ese desacoplamiento es lo que permite sustituir el almacén (KV hoy, D1 o
 * Postgres mañana) sin tocar una sola regla de negocio, y es también lo que
 * hace testeable el nucleo sin infraestructura.
 */
export interface Repositorio<T extends Entidad<E>, E extends EstadoEntidad = EstadoEntidad> {
  /** Devuelve la entidad o `null` si no existe. */
  obtener(id: string): Promise<T | null>;

  /** Devuelve la entidad o lanza `ErrorNoEncontrado`. */
  obtenerOFallar(id: string): Promise<T>;

  /** Todas las entidades de la colección, opcionalmente filtradas en memoria. */
  listar(filtro?: (entidad: T) => boolean): Promise<T[]>;

  /** Alta o actualización (upsert) por id. */
  guardar(entidad: T): Promise<T>;

  /** Persiste varias entidades en una sola escritura. */
  guardarVarias(entidades: T[]): Promise<void>;

  /** Elimina por id; `false` si no existía. */
  eliminar(id: string): Promise<boolean>;

  existe(id: string): Promise<boolean>;

  contar(filtro?: (entidad: T) => boolean): Promise<number>;

  /** Primera coincidencia, o `null`. */
  buscarUno(predicado: (entidad: T) => boolean): Promise<T | null>;
}
