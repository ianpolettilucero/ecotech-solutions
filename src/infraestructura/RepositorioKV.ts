import type { Entidad, EstadoEntidad } from '../dominio/base/Entidad.js';
import { ErrorNoEncontrado } from '../dominio/base/errores.js';
import type { Repositorio } from './Repositorio.js';
import type { AlmacenKV } from './AlmacenKV.js';

/**
 * Implementacion generica del contrato `Repositorio` sobre Workers KV.
 *
 * Es *generica* en dos ejes: el tipo de entidad `T` y su estado persistido `E`.
 * La reconstruccion (estado plano -> objeto de dominio) se delega en la funcion
 * `rehidratar` que recibe por constructor, de modo que una sola clase sirve a
 * empleados, proyectos, departamentos, etc., sin duplicar codigo de acceso.
 *
 * Esto es composicion sobre herencia: en lugar de una subclase de repositorio
 * por entidad, se parametriza la unica que hay.
 */
export class RepositorioKV<T extends Entidad<E>, E extends EstadoEntidad>
  implements Repositorio<T, E>
{
  constructor(
    private readonly almacen: AlmacenKV,
    private readonly coleccion: string,
    private readonly rehidratar: (estado: E) => T,
    private readonly nombreLegible: string = coleccion,
  ) {}

  private async mapa(): Promise<Record<string, E>> {
    return this.almacen.leerColeccion<E>(this.coleccion);
  }

  async obtener(id: string): Promise<T | null> {
    const estado = (await this.mapa())[id];
    return estado ? this.rehidratar(estado) : null;
  }

  async obtenerOFallar(id: string): Promise<T> {
    const entidad = await this.obtener(id);
    if (!entidad) throw new ErrorNoEncontrado(this.nombreLegible, id);
    return entidad;
  }

  async listar(filtro?: (entidad: T) => boolean): Promise<T[]> {
    const entidades = Object.values(await this.mapa()).map((e) => this.rehidratar(e));
    return filtro ? entidades.filter(filtro) : entidades;
  }

  async guardar(entidad: T): Promise<T> {
    entidad.validar();
    await this.almacen.mutarColeccion<E>(this.coleccion, (actual) => ({
      ...actual,
      [entidad.id]: entidad.aEstado(),
    }));
    return entidad;
  }

  async guardarVarias(entidades: T[]): Promise<void> {
    if (entidades.length === 0) return;
    for (const e of entidades) e.validar();
    await this.almacen.mutarColeccion<E>(this.coleccion, (actual) => {
      const siguiente = { ...actual };
      for (const e of entidades) siguiente[e.id] = e.aEstado();
      return siguiente;
    });
  }

  async eliminar(id: string): Promise<boolean> {
    let existia = false;
    await this.almacen.mutarColeccion<E>(this.coleccion, (actual) => {
      existia = id in actual;
      if (!existia) return actual;
      const siguiente = { ...actual };
      delete siguiente[id];
      return siguiente;
    });
    return existia;
  }

  async existe(id: string): Promise<boolean> {
    return id in (await this.mapa());
  }

  async contar(filtro?: (entidad: T) => boolean): Promise<number> {
    if (!filtro) return Object.keys(await this.mapa()).length;
    return (await this.listar(filtro)).length;
  }

  async buscarUno(predicado: (entidad: T) => boolean): Promise<T | null> {
    for (const estado of Object.values(await this.mapa())) {
      const entidad = this.rehidratar(estado);
      if (predicado(entidad)) return entidad;
    }
    return null;
  }
}
