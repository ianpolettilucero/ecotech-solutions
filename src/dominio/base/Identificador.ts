/**
 * Generacion de identificadores.
 *
 * Requisito: "se debe asignar automaticamente un ID unico a cada empleado".
 * Se usa `crypto.randomUUID()` (disponible tanto en Workers como en Node >=19),
 * de modo que el ID no sea adivinable ni revele el orden de alta (a diferencia
 * de un autoincremental, que filtra volumen de negocio y facilita enumeracion).
 */
export function nuevoId(): string {
  return crypto.randomUUID();
}

/** Bytes aleatorios criptograficamente seguros en hexadecimal. */
export function tokenAleatorio(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Numero de legajo legible por humanos: `ECO-000123`.
 * El correlativo se persiste como contador aparte para no colisionar.
 */
export function formatearLegajo(correlativo: number): string {
  return `ECO-${String(correlativo).padStart(6, '0')}`;
}

/** Codigo de proyecto legible: `PRY-0042`. */
export function formatearCodigoProyecto(correlativo: number): string {
  return `PRY-${String(correlativo).padStart(4, '0')}`;
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function esIdValido(valor: unknown): valor is string {
  return typeof valor === 'string' && RE_UUID.test(valor);
}
