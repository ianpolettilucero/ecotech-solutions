import type { Contexto } from '../aplicacion/Contexto.js';
import type { DatosSesion } from '../dominio/seguridad/Sesion.js';
import { ErrorNoEncontrado } from '../dominio/base/errores.js';

/** Todo lo que un manejador necesita para atender una petición. */
export interface PeticionApi {
  peticion: Request;
  url: URL;
  /** Parámetros extraidos del patron de ruta, p.ej. `:id`. */
  parametros: Record<string, string>;
  ctx: Contexto;
  /** Sesión vigente, si la petición venía autenticada. */
  sesion: DatosSesion | null;
  /** Cabeceras extra que el manejador quiere anadir (p.ej. `Set-Cookie`). */
  cabecerasExtra: Record<string, string>;
}

export type Manejador = (api: PeticionApi) => Promise<Response>;

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface Ruta {
  metodo: Metodo;
  /** Segmentos del patron; los que empiezan por ':' son parámetros. */
  segmentos: string[];
  manejador: Manejador;
  /** Si es `false`, la ruta se atiende sin sesión (login, salud). */
  requiereSesion: boolean;
}

/**
 * Enrutador mínimo por segmentos.
 *
 * Se implementa a mano en vez de traer un framework por dos razones: cada
 * dependencia aumenta el tamano del bundle del Worker (que tiene un límite
 * duro) y la superficie de ataque, y el enrutado que necesita esta API cabe en
 * cien líneas. La comparación es por segmentos exactos, no por expresión
 * regular, de modo que no existe la clase de fallos de coincidencia parcial que
 * suele acabar en salto de autorización.
 */
export class Enrutador {
  private readonly rutas: Ruta[] = [];

  registrar(
    metodo: Metodo,
    patron: string,
    manejador: Manejador,
    opciones: { requiereSesion?: boolean } = {},
  ): this {
    this.rutas.push({
      metodo,
      segmentos: Enrutador.segmentar(patron),
      manejador,
      requiereSesion: opciones.requiereSesion ?? true,
    });
    return this;
  }

  get(patron: string, manejador: Manejador, opciones?: { requiereSesion?: boolean }): this {
    return this.registrar('GET', patron, manejador, opciones);
  }

  post(patron: string, manejador: Manejador, opciones?: { requiereSesion?: boolean }): this {
    return this.registrar('POST', patron, manejador, opciones);
  }

  put(patron: string, manejador: Manejador, opciones?: { requiereSesion?: boolean }): this {
    return this.registrar('PUT', patron, manejador, opciones);
  }

  patch(patron: string, manejador: Manejador, opciones?: { requiereSesion?: boolean }): this {
    return this.registrar('PATCH', patron, manejador, opciones);
  }

  delete(patron: string, manejador: Manejador, opciones?: { requiereSesion?: boolean }): this {
    return this.registrar('DELETE', patron, manejador, opciones);
  }

  /** Busca la ruta que atiende esta petición. `null` si ninguna coincide. */
  resolver(
    metodo: string,
    ruta: string,
  ): { ruta: Ruta; parametros: Record<string, string> } | null {
    const segmentos = Enrutador.segmentar(ruta);
    for (const candidata of this.rutas) {
      if (candidata.metodo !== metodo) continue;
      const parametros = Enrutador.emparejar(candidata.segmentos, segmentos);
      if (parametros) return { ruta: candidata, parametros };
    }
    return null;
  }

  /**
   * Métodos registrados para esa ruta. Vacío si la ruta no existe en absoluto.
   *
   * Devuelve la lista y no un booleano porque la respuesta 405 debe incluir la
   * cabecera `Allow`, y esa cabecera es lo único que convierte el error en una
   * pista útil en vez de en un callejon sin salida.
   */
  metodosDe(ruta: string): string[] {
    const segmentos = Enrutador.segmentar(ruta);
    const metodos = this.rutas
      .filter((r) => Enrutador.emparejar(r.segmentos, segmentos) !== null)
      .map((r) => r.metodo);
    return [...new Set(metodos)];
  }

  private static segmentar(ruta: string): string[] {
    return ruta.split('/').filter((s) => s.length > 0);
  }

  private static emparejar(
    patron: string[],
    reales: string[],
  ): Record<string, string> | null {
    if (patron.length !== reales.length) return null;
    const parametros: Record<string, string> = {};
    for (let i = 0; i < patron.length; i++) {
      const esperado = patron[i];
      const real = reales[i];
      if (esperado === undefined || real === undefined) return null;
      if (esperado.startsWith(':')) {
        // Se decodifica aquí una sola vez; los manejadores reciben el valor ya
        // legible y lo validan con `ReglaIdentificador` antes de usarlo.
        try {
          parametros[esperado.slice(1)] = decodeURIComponent(real);
        } catch {
          return null;
        }
      } else if (esperado !== real) {
        return null;
      }
    }
    return parametros;
  }
}

/** Lanza el 404 estándar de la API cuando ninguna ruta coincide. */
export function rutaNoEncontrada(url: URL): never {
  throw new ErrorNoEncontrado(`la ruta ${url.pathname}`);
}
