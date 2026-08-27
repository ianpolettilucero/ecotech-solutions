import type { Rol } from '../../compartido/tipos.js';

/**
 * Sesion activa, tal como se guarda en KV.
 *
 * ## Decisiones de seguridad
 *
 * - Se persiste el **hash** del token, no el token. Un volcado del almacen no
 *   permite suplantar a nadie: quien lo obtenga tendria que invertir SHA-256.
 * - La clave de KV incluye ese hash, de modo que validar una sesion es una sola
 *   lectura directa, sin recorrer una coleccion.
 * - Se apoya en el TTL nativo de KV: la sesion se borra sola al expirar y no
 *   hace falta una tarea de limpieza.
 * - Lleva su propio `tokenCsrf`, distinto del token de sesion, para el patron de
 *   doble envio (cookie + cabecera) en las peticiones que mutan datos.
 * - `rol` va desnormalizado aqui para poder autorizar sin leer el usuario en
 *   cada peticion; `ServicioAutenticacion` revalida contra el usuario real en
 *   las operaciones sensibles, de modo que un cambio de rol no quede latente.
 */
export interface DatosSesion {
  usuarioId: string;
  email: string;
  rol: Rol;
  empleadoId: string | null;
  tokenCsrf: string;
  creadaEn: string;
  expiraEn: string;
  /** Huella del cliente: detecta reutilizacion del token desde otro origen. */
  huellaCliente: string | null;
}

/** Duracion de una sesion inactiva. */
export const DURACION_SESION_SEGUNDOS = 8 * 60 * 60;

/** Nombre de la cookie de sesion. El prefijo `__Host-` exige HTTPS,
 *  `Path=/` y ausencia de `Domain`, e impide que un subdominio la sobrescriba. */
export const NOMBRE_COOKIE_SESION = '__Host-ecotech_sesion';

/** Cabecera donde el cliente reenvia el token CSRF. */
export const CABECERA_CSRF = 'X-Token-CSRF';

export function claveSesion(hashToken: string): string {
  return `sesion:${hashToken}`;
}

export function sesionExpirada(sesion: DatosSesion, ahora: Date = new Date()): boolean {
  return new Date(sesion.expiraEn).getTime() <= ahora.getTime();
}
