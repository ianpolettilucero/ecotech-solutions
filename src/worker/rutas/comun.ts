import { ReglaIdentificador } from '../../dominio/validacion/Regla.js';
import { ErrorValidacion } from '../../dominio/base/errores.js';
import { FalloRegla } from '../../dominio/validacion/Regla.js';
import type { PeticionApi } from '../Enrutador.js';

const REGLA_ID = new ReglaIdentificador();

/**
 * Extrae y valida un identificador de la ruta.
 *
 * Validarlo aquí, antes de que llegue a un servicio, es lo que impide que un
 * valor arbitrario del cliente se use como clave del almacén. Sin esto, un `id`
 * como `../usuarios` podría intentar alcanzar otra colección.
 */
export function idDeRuta(api: PeticionApi, nombre = 'id'): string {
  const bruto = api.parametros[nombre];
  if (bruto === undefined) {
    throw new ErrorValidacion(`Falta el parámetro "${nombre}" en la ruta.`);
  }
  try {
    return REGLA_ID.aplicar(bruto, nombre);
  } catch (e) {
    if (e instanceof FalloRegla) throw new ErrorValidacion(e.message, [e.aDetalle()]);
    throw e;
  }
}

/** Lee un parámetro de consulta, devolviendo `undefined` si viene vacío. */
export function consulta(api: PeticionApi, nombre: string): string | undefined {
  const valor = api.url.searchParams.get(nombre);
  if (valor === null) return undefined;
  const limpio = valor.trim();
  return limpio === '' ? undefined : limpio;
}

/** Lee un parámetro booleano de consulta (`true` / `false`). */
export function consultaBooleana(api: PeticionApi, nombre: string): boolean | undefined {
  const valor = consulta(api, nombre);
  if (valor === undefined) return undefined;
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  throw new ErrorValidacion(`El parámetro "${nombre}" debe ser true o false.`);
}

/**
 * Lee un parámetro de consulta restringido a un conjunto cerrado.
 * Rechazar aquí lo que no está en la lista blanca evita que un valor arbitrario
 * llegue a los filtros de los servicios.
 */
export function consultaEnumerada<T extends string>(
  api: PeticionApi,
  nombre: string,
  permitidos: readonly T[],
): T | undefined {
  const valor = consulta(api, nombre);
  if (valor === undefined) return undefined;
  if (!permitidos.includes(valor as T)) {
    throw new ErrorValidacion(
      `El parámetro "${nombre}" debe ser uno de: ${permitidos.join(', ')}.`,
      [{ campo: nombre, mensaje: `Valor no permitido: "${valor}".` }],
    );
  }
  return valor as T;
}

/** Lee una fecha `AAAA-MM-DD` de la cadena de consulta. */
export function consultaFecha(api: PeticionApi, nombre: string): string | undefined {
  const valor = consulta(api, nombre);
  if (valor === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ErrorValidacion(`El parámetro "${nombre}" debe tener el formato AAAA-MM-DD.`, [
      { campo: nombre, mensaje: 'Formato de fecha invalido.' },
    ]);
  }
  return valor;
}

/** Lee un identificador opcional de la cadena de consulta. */
export function consultaId(api: PeticionApi, nombre: string): string | undefined {
  const valor = consulta(api, nombre);
  if (valor === undefined) return undefined;
  try {
    return REGLA_ID.aplicar(valor, nombre);
  } catch (e) {
    if (e instanceof FalloRegla) throw new ErrorValidacion(e.message, [e.aDetalle()]);
    throw e;
  }
}

/** Lee un entero acotado de la cadena de consulta. */
export function consultaEntero(
  api: PeticionApi,
  nombre: string,
  minimo: number,
  maximo: number,
): number | undefined {
  const valor = consulta(api, nombre);
  if (valor === undefined) return undefined;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
    throw new ErrorValidacion(
      `El parámetro "${nombre}" debe ser un entero entre ${minimo} y ${maximo}.`,
    );
  }
  return numero;
}
