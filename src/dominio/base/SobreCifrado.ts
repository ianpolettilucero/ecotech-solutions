/**
 * Sobre de cifrado autenticado, tal como se persiste.
 *
 * Vive en el dominio y no junto a `ServicioCripto` a propósito: `Persona` tiene
 * que declarar el tipo de su bloque protegido, y si ese tipo colgara de
 * infraestructura el dominio dependería de la capa que lo implementa, que es
 * justo la flecha que la arquitectura prohibe. Aquí el dominio define *que
 * forma* tiene un dato cifrado, y la infraestructura decide *como* se produce.
 *
 * El campo `v` existe para poder rotar el algoritmo sin romper lo ya guardado:
 * un sobre `v: 1` seguira siendo legible cuando exista el `v: 2`.
 */
export interface SobreCifrado {
  /** Versión del esquema de cifrado. */
  v: 1;
  /** Vector de inicialización (12 bytes) en base64. */
  iv: string;
  /** Texto cifrado más el tag de autenticación, en base64. */
  ct: string;
}
