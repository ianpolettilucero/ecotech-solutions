import { ErrorValidacion, normalizarError } from '../dominio/base/errores.js';
import type { RespuestaError, RespuestaOk } from '../compartido/tipos.js';

/**
 * Cabeceras de seguridad aplicadas a **toda** respuesta.
 *
 * - `Content-Security-Policy`: lista blanca cerrada. `default-src 'none'` niega
 *   todo por defecto y luego se habilita lo mínimo. Sin `unsafe-inline` ni
 *   `unsafe-eval`, que es lo que convierte un XSS reflejado en inofensivo. Por
 *   eso el cliente no lleva ni un solo script ni estilo en línea.
 * - `frame-ancestors 'none'`: sustituye a `X-Frame-Options` e impide el
 *   secuestro de clics montando la aplicación en un iframe.
 * - `form-action 'none'`: ningún formulario puede enviarse a otro origen,
 *   incluso si un atacante lograra inyectar uno.
 * - `Referrer-Policy`: evita filtrar identificadores de la URL a terceros.
 * - `X-Content-Type-Options`: impide que el navegador adivine el tipo y ejecute
 *   como script algo que devolvimos como texto.
 */
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');

export const CABECERAS_SEGURIDAD: Readonly<Record<string, string>> = Object.freeze({
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
});

export function aplicarCabecerasSeguridad(respuesta: Response): Response {
  const cabeceras = new Headers(respuesta.headers);
  for (const [clave, valor] of Object.entries(CABECERAS_SEGURIDAD)) {
    cabeceras.set(clave, valor);
  }
  return new Response(respuesta.body, {
    status: respuesta.status,
    statusText: respuesta.statusText,
    headers: cabeceras,
  });
}

/** Cabeceras comunes de las respuestas de la API. */
function cabecerasApi(extra?: Record<string, string>): Headers {
  const cabeceras = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    // Los datos de gestión nunca deben quedar en cache intermedia ni en disco.
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    Pragma: 'no-cache',
    ...CABECERAS_SEGURIDAD,
  });
  if (extra) {
    for (const [clave, valor] of Object.entries(extra)) cabeceras.append(clave, valor);
  }
  return cabeceras;
}

export function json<T>(datos: T, estado = 200, extra?: Record<string, string>): Response {
  const cuerpo: RespuestaOk<T> = { ok: true, datos };
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: cabecerasApi(extra) });
}

export function sinContenido(extra?: Record<string, string>): Response {
  // 204 no admite cuerpo, pero el cliente espera siempre JSON: se usa 200 con
  // un envoltorio vacío para no tener dos formas de exito que manejar.
  return json({ eliminado: true }, 200, extra);
}

/**
 * Convierte cualquier excepción en una respuesta.
 *
 * `normalizarError` colapsa lo desconocido a `ErrorInterno`, de modo que un
 * fallo inesperado nunca filtre el mensaje original ni la traza al cliente. El
 * detalle real se registra en el log del Worker, accesible solo para el equipo.
 */
export function errorARespuesta(e: unknown): Response {
  const error = normalizarError(e);
  if (error.codigoHttp >= 500) {
    console.error('Error no controlado:', e);
  }
  const cuerpo: RespuestaError = { ok: false, error: error.aRespuesta() };
  const extra: Record<string, string> = {};
  if (error.codigoHttp === 429 && 'reintentarEnSegundos' in error) {
    extra['Retry-After'] = String((error as { reintentarEnSegundos: number }).reintentarEnSegundos);
  }
  // Un 405 sin `Allow` obliga al cliente a adivinar; la norma la exige.
  if (error.codigoHttp === 405 && 'metodosPermitidos' in error) {
    const permitidos = (error as { metodosPermitidos: string[] }).metodosPermitidos;
    if (permitidos.length > 0) extra['Allow'] = permitidos.join(', ');
  }
  return new Response(JSON.stringify(cuerpo), {
    status: error.codigoHttp,
    headers: cabecerasApi(extra),
  });
}

/** Respuesta binaria para las descargas de informes. */
export function archivo(
  bytes: Uint8Array,
  tipoMime: string,
  nombreArchivo: string,
): Response {
  // El nombre se sanea porque acaba dentro de una cabecera HTTP: un salto de
  // línea o una comilla permitirian inyectar cabeceras adicionales.
  const seguro = nombreArchivo.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);
  const cuerpo = new Uint8Array(bytes);
  return new Response(cuerpo, {
    status: 200,
    headers: new Headers({
      'Content-Type': tipoMime,
      'Content-Disposition': `attachment; filename="${seguro}"`,
      'Content-Length': String(cuerpo.byteLength),
      'Cache-Control': 'no-store, private',
      ...CABECERAS_SEGURIDAD,
    }),
  });
}

/**
 * Lee el cuerpo JSON con dos protecciones:
 * 1. Exige `Content-Type: application/json`. Sin esto, un formulario HTML de
 *    otro origen podría enviar la petición (los formularios no están sujetos a
 *    CORS) y provocar un CSRF que la cookie autenticaría.
 * 2. Acota el tamano, para que un cuerpo enorme no agote la CPU del Worker.
 */
export async function leerJson(peticion: Request, limiteBytes = 64 * 1024): Promise<unknown> {
  const tipo = peticion.headers.get('Content-Type') ?? '';
  if (!tipo.toLowerCase().includes('application/json')) {
    throw new ErrorValidacion('Se esperaba Content-Type: application/json.');
  }
  const longitud = Number(peticion.headers.get('Content-Length') ?? '0');
  if (Number.isFinite(longitud) && longitud > limiteBytes) {
    throw new ErrorValidacion('El cuerpo de la petición es demasiado grande.');
  }
  const texto = await peticion.text();
  if (texto.length > limiteBytes) {
    throw new ErrorValidacion('El cuerpo de la petición es demasiado grande.');
  }
  if (texto.trim() === '') return {};
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    // Un cuerpo mal formado es culpa del cliente, no del servidor. Devolver 500
    // aquí además ensuciaría el registro de errores con ruido que no lo es.
    throw new ErrorValidacion('El cuerpo de la petición no es JSON válido.');
  }
}

/** IP del cliente según Cloudflare. */
export function ipDe(peticion: Request): string | null {
  return peticion.headers.get('CF-Connecting-IP');
}

/**
 * Huella débil del cliente, para detectar el uso de una cookie robada desde
 * otro navegador. Deliberadamente NO incluye la IP: las redes móviles cambian
 * de salida constantemente y expulsaría a usuarios legitimos.
 */
export function huellaDe(peticion: Request): string | null {
  const agente = peticion.headers.get('User-Agent');
  if (!agente) return null;
  let hash = 2166136261;
  for (let i = 0; i < agente.length; i++) {
    hash ^= agente.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Comprueba que una petición que muta datos provenga del mismo origen.
 * Es la barrera anti-CSRF que no depende de que el cliente mande nada.
 */
export function verificarOrigen(peticion: Request): boolean {
  const origen = peticion.headers.get('Origin');
  // Sin `Origin` no es una petición iniciada por script de otra página: los
  // navegadores lo envian siempre en peticiones cruzadas que mutan datos.
  if (!origen) return true;
  try {
    return new URL(origen).host === new URL(peticion.url).host;
  } catch {
    return false;
  }
}
