import type { EstadoEntidad } from '../dominio/base/Entidad.js';

/**
 * Capa de acceso a Workers KV.
 *
 * ## Por que un documento por colección
 *
 * KV cobra y limita por *operación*, no por byte: listar 200 empleados con una
 * clave por empleado costaría 1 `list` + 200 `get`. Guardamos en cambio la
 * colección entera bajo una sola clave (`col:empleados`), de modo que:
 *
 * - leer una colección = 1 lectura,
 * - escribir un registro = 1 lectura + 1 escritura.
 *
 * El precio es que las escrituras concurrentes sobre la misma colección siguen
 * un modelo "último en escribir gana". Es aceptable para el volumen de una
 * PyME (límite duro de KV: 25 MiB por valor, del orden de decenas de miles de
 * registros) y está documentado en `docs/08-modelo-datos-kv.md`.
 *
 * ## Consistencia
 *
 * KV es eventualmente consistente entre centros de datos. Para que el usuario
 * nunca vea su propia escritura "desaparecer", esta clase mantiene una cache de
 * escritura directa (write-through): tras un `escribir`, las lecturas
 * siguientes devuelven el valor nuevo sin volver a KV.
 *
 * El alcance de esa cache es **una petición**, no el isolate: el `Map` es un
 * campo de instancia y `Contexto` construye un `AlmacenKV` por petición. Es
 * deliberado. Una cache compartida entre peticiones del mismo isolate serviría
 * datos de un usuario a la petición de otro salvo que se invalidara con
 * cuidado, y el ahorro no compensa ese riesgo. Lo que si resuelve, que es el
 * problema real, es que dentro de una misma petición se lea varias veces la
 * misma colección (los informes leen cinco) y que una lectura posterior a una
 * escritura no vea el valor viejo.
 */
export class AlmacenKV {
  /** Cache de la petición en curso: clave -> { valor, expira }. */
  private readonly cache = new Map<string, { valor: unknown; expira: number }>();

  /** Escrituras en vuelo, para serializar el read-modify-write por clave
   *  dentro de esta petición. Entre peticiones concurrentes sigue rigiendo
   *  "el último en escribir gana"; ver docs/08-modelo-datos-kv.md. */
  private readonly enVuelo = new Map<string, Promise<unknown>>();

  private static readonly TTL_CACHE_MS = 5_000;

  constructor(private readonly kv: KVNamespace) {}

  private ahora(): number {
    return Date.now();
  }

  /** Lectura con cache de corta vida. */
  async leer<T>(clave: string): Promise<T | null> {
    const enCache = this.cache.get(clave);
    if (enCache && enCache.expira > this.ahora()) {
      return enCache.valor as T | null;
    }
    const valor = await this.kv.get<T>(clave, 'json');
    this.cache.set(clave, { valor, expira: this.ahora() + AlmacenKV.TTL_CACHE_MS });
    return valor ?? null;
  }

  /** Escritura + refresco inmediato de la cache local. */
  async escribir<T>(clave: string, valor: T, ttlSegundos?: number): Promise<void> {
    const opciones = ttlSegundos ? { expirationTtl: Math.max(60, ttlSegundos) } : undefined;
    await this.kv.put(clave, JSON.stringify(valor), opciones);
    this.cache.set(clave, { valor, expira: this.ahora() + AlmacenKV.TTL_CACHE_MS });
  }

  async borrar(clave: string): Promise<void> {
    await this.kv.delete(clave);
    this.cache.set(clave, { valor: null, expira: this.ahora() + AlmacenKV.TTL_CACHE_MS });
  }

  /** Invalida la cache local de una clave (útil tras escrituras externas). */
  invalidar(clave: string): void {
    this.cache.delete(clave);
  }

  /**
   * Lee-modifica-escribe serializado por clave dentro de esta petición.
   * Evita que dos operaciones de la misma petición se pisen entre si.
   */
  async mutar<T>(clave: string, mutador: (actual: T | null) => T | Promise<T>): Promise<T> {
    const previo = this.enVuelo.get(clave) ?? Promise.resolve();
    const tarea = previo
      .catch(() => undefined)
      .then(async () => {
        const actual = await this.leer<T>(clave);
        const siguiente = await mutador(actual);
        await this.escribir(clave, siguiente);
        return siguiente;
      });
    this.enVuelo.set(clave, tarea);
    try {
      return (await tarea) as T;
    } finally {
      if (this.enVuelo.get(clave) === tarea) this.enVuelo.delete(clave);
    }
  }

  // -------------------------------------------------------------------------
  // Colecciones (mapa id -> estado)
  // -------------------------------------------------------------------------

  static claveColeccion(coleccion: string): string {
    return `col:${coleccion}`;
  }

  async leerColeccion<E extends EstadoEntidad>(
    coleccion: string,
  ): Promise<Record<string, E>> {
    const datos = await this.leer<Record<string, E>>(AlmacenKV.claveColeccion(coleccion));
    return datos ?? {};
  }

  async mutarColeccion<E extends EstadoEntidad>(
    coleccion: string,
    mutador: (actual: Record<string, E>) => Record<string, E> | Promise<Record<string, E>>,
  ): Promise<Record<string, E>> {
    return this.mutar<Record<string, E>>(
      AlmacenKV.claveColeccion(coleccion),
      async (actual) => mutador(actual ?? {}),
    );
  }

  // -------------------------------------------------------------------------
  // Contadores (legajos, códigos de proyecto)
  // -------------------------------------------------------------------------

  async siguienteCorrelativo(nombre: string): Promise<number> {
    const resultado = await this.mutar<{ valor: number }>(`contador:${nombre}`, (actual) => ({
      valor: (actual?.valor ?? 0) + 1,
    }));
    return resultado.valor;
  }
}
