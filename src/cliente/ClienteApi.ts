import type { DetalleErrorCampo, Respuesta } from '../compartido/tipos.js';

/** Error de la API con el detalle que devolvio el servidor. */
export class ErrorApi extends Error {
  constructor(
    readonly codigo: string,
    mensaje: string,
    readonly estado: number,
    readonly campos: DetalleErrorCampo[] = [],
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }

  /** Mensaje asociado a un campo concreto, para pintarlo bajo el input. */
  mensajeDe(campo: string): string | null {
    return this.campos.find((c) => c.campo === campo)?.mensaje ?? null;
  }
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Cliente HTTP de la API.
 *
 * La sesion viaja en una cookie `HttpOnly`, de modo que este codigo **nunca
 * toca el token**: aunque un XSS lograra ejecutarse, no tendria nada que robar.
 * Lo unico que guarda en memoria es el token CSRF, que por si solo no sirve
 * para autenticarse.
 */
export class ClienteApi {
  private static tokenCsrf: string | null = null;
  /** Se invoca cuando el servidor responde 401: la sesion caduco. */
  static alExpirarSesion: (() => void) | null = null;

  static fijarTokenCsrf(token: string | null): void {
    ClienteApi.tokenCsrf = token;
  }

  private static async peticion<T>(metodo: Metodo, ruta: string, cuerpo?: unknown): Promise<T> {
    const cabeceras: Record<string, string> = { Accept: 'application/json' };
    if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
    // El token CSRF solo hace falta en las peticiones que mutan datos.
    if (metodo !== 'GET' && ClienteApi.tokenCsrf) {
      cabeceras['X-Token-CSRF'] = ClienteApi.tokenCsrf;
    }

    let respuesta: Response;
    try {
      respuesta = await fetch(ruta, {
        method: metodo,
        headers: cabeceras,
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        credentials: 'same-origin',
      });
    } catch {
      throw new ErrorApi('RED', 'No se pudo contactar con el servidor.', 0);
    }

    let datos: Respuesta<T>;
    try {
      datos = (await respuesta.json()) as Respuesta<T>;
    } catch {
      throw new ErrorApi(
        'RESPUESTA_INVALIDA',
        `El servidor respondio ${respuesta.status} sin un cuerpo valido.`,
        respuesta.status,
      );
    }

    if (!datos.ok) {
      if (respuesta.status === 401 && ruta !== '/api/auth/sesion') {
        ClienteApi.alExpirarSesion?.();
      }
      throw new ErrorApi(
        datos.error.codigo,
        datos.error.mensaje,
        respuesta.status,
        datos.error.campos ?? [],
      );
    }
    return datos.datos;
  }

  static get<T>(ruta: string): Promise<T> {
    return ClienteApi.peticion<T>('GET', ruta);
  }

  static post<T>(ruta: string, cuerpo?: unknown): Promise<T> {
    return ClienteApi.peticion<T>('POST', ruta, cuerpo ?? {});
  }

  static put<T>(ruta: string, cuerpo?: unknown): Promise<T> {
    return ClienteApi.peticion<T>('PUT', ruta, cuerpo ?? {});
  }

  static patch<T>(ruta: string, cuerpo: unknown): Promise<T> {
    return ClienteApi.peticion<T>('PATCH', ruta, cuerpo);
  }

  static borrar<T>(ruta: string): Promise<T> {
    return ClienteApi.peticion<T>('DELETE', ruta);
  }

  /**
   * Descarga un informe binario.
   *
   * No se usa un enlace directo porque la respuesta necesita ir con las
   * credenciales y porque asi los errores (403, 422) se muestran como una
   * notificacion en vez de abrir una pestana con JSON crudo.
   */
  static async descargar(ruta: string): Promise<void> {
    const respuesta = await fetch(ruta, {
      headers: { Accept: '*/*' },
      credentials: 'same-origin',
    });

    if (!respuesta.ok) {
      let mensaje = `No se pudo generar el informe (${respuesta.status}).`;
      try {
        const cuerpo = (await respuesta.json()) as Respuesta<unknown>;
        if (!cuerpo.ok) mensaje = cuerpo.error.mensaje;
      } catch {
        // El cuerpo no era JSON; se conserva el mensaje generico.
      }
      throw new ErrorApi('DESCARGA', mensaje, respuesta.status);
    }

    const disposicion = respuesta.headers.get('Content-Disposition') ?? '';
    const coincidencia = /filename="([^"]+)"/.exec(disposicion);
    const nombre = coincidencia?.[1] ?? 'informe';

    const blob = await respuesta.blob();
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    // Se libera en el siguiente ciclo: revocar de inmediato aborta la descarga
    // en algunos navegadores.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Construye una cadena de consulta omitiendo los valores vacios. */
  static consulta(parametros: Record<string, string | number | boolean | null | undefined>): string {
    const partes = new URLSearchParams();
    for (const [clave, valor] of Object.entries(parametros)) {
      if (valor === null || valor === undefined || valor === '') continue;
      partes.set(clave, String(valor));
    }
    const texto = partes.toString();
    return texto ? `?${texto}` : '';
  }
}
