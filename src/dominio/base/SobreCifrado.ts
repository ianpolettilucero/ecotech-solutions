/**
 * Sobre de cifrado autenticado, tal como se persiste.
 *
 * Vive en el dominio y no junto a `ServicioCripto` a proposito: `Persona` tiene
 * que declarar el tipo de su bloque protegido, y si ese tipo colgara de
 * infraestructura el dominio dependeria de la capa que lo implementa, que es
 * justo la flecha que la arquitectura prohibe. Aqui el dominio define *que
 * forma* tiene un dato cifrado, y la infraestructura decide *como* se produce.
 *
 * El campo `v` existe para poder rotar el algoritmo sin romper lo ya guardado:
 * un sobre `v: 1` seguira siendo legible cuando exista el `v: 2`.
 */
export interface SobreCifrado {
  /** Version del esquema de cifrado. */
  v: 1;
  /** Vector de inicializacion (12 bytes) en base64. */
  iv: string;
  /** Texto cifrado mas el tag de autenticacion, en base64. */
  ct: string;
}
