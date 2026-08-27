import { ErrorValidacion } from '../base/errores.js';
import type { DetalleErrorCampo } from '../../compartido/tipos.js';
import { FalloRegla, type Regla } from './Regla.js';

/** Definicion de un campo dentro de un esquema. */
export interface CampoEsquema<S = unknown> {
  regla: Regla<unknown, S>;
  /** Si es opcional y viene ausente, se usa `porDefecto` (o se omite). */
  opcional?: boolean;
  porDefecto?: S;
  /** Permite `null` explicito (util para desasignar un departamento). */
  admiteNulo?: boolean;
}

export type DefinicionEsquema = Record<string, CampoEsquema<never>>;

/**
 * Validador de cuerpos de peticion.
 *
 * Tres decisiones deliberadas de seguridad:
 *
 * 1. **Lista blanca estricta**: cualquier propiedad no declarada se rechaza.
 *    Esto cierra la puerta al *mass assignment* (que un cliente mande
 *    `{"rol":"ADMIN_RRHH"}` en su propio perfil y escale privilegios).
 * 2. **Se acumulan todos los fallos** antes de responder, para que el
 *    formulario del cliente marque todos los campos de una vez.
 * 3. **Se rechazan claves peligrosas** (`__proto__`, `constructor`,
 *    `prototype`) para evitar contaminacion de prototipos al construir el
 *    objeto de salida.
 */
export class Esquema<T extends Record<string, unknown>> {
  private static readonly CLAVES_PROHIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);

  constructor(private readonly definicion: Record<string, CampoEsquema<unknown>>) {}

  /**
   * Valida y normaliza. Devuelve un objeto nuevo con exclusivamente los campos
   * declarados. Lanza `ErrorValidacion` con el detalle campo a campo.
   */
  validar(entrada: unknown): T {
    if (entrada === null || typeof entrada !== 'object' || Array.isArray(entrada)) {
      throw new ErrorValidacion('El cuerpo de la peticion debe ser un objeto JSON.');
    }

    const bruto = entrada as Record<string, unknown>;
    const fallos: DetalleErrorCampo[] = [];
    const salida = Object.create(null) as Record<string, unknown>;

    // 1. Rechazar campos no declarados (lista blanca).
    for (const clave of Object.keys(bruto)) {
      if (Esquema.CLAVES_PROHIBIDAS.has(clave)) {
        fallos.push({ campo: clave, mensaje: 'Nombre de campo no permitido.' });
        continue;
      }
      if (!(clave in this.definicion)) {
        fallos.push({ campo: clave, mensaje: 'Campo no reconocido.' });
      }
    }

    // 2. Aplicar cada regla declarada.
    for (const [clave, campo] of Object.entries(this.definicion)) {
      const presente = Object.prototype.hasOwnProperty.call(bruto, clave);
      const valor = presente ? bruto[clave] : undefined;

      if (!presente || valor === undefined) {
        if (campo.opcional) {
          if (campo.porDefecto !== undefined) salida[clave] = campo.porDefecto;
          continue;
        }
        fallos.push({ campo: clave, mensaje: 'Es obligatorio.' });
        continue;
      }

      if (valor === null) {
        if (campo.admiteNulo) {
          salida[clave] = null;
          continue;
        }
        fallos.push({ campo: clave, mensaje: 'No puede ser nulo.' });
        continue;
      }

      try {
        salida[clave] = campo.regla.aplicar(valor, clave);
      } catch (e) {
        if (e instanceof FalloRegla) fallos.push(e.aDetalle());
        else fallos.push({ campo: clave, mensaje: 'Valor invalido.' });
      }
    }

    if (fallos.length > 0) {
      throw new ErrorValidacion('Se encontraron errores de validacion.', fallos);
    }

    return { ...salida } as T;
  }

  /**
   * Variante para actualizaciones parciales (PATCH): todos los campos pasan a
   * ser opcionales, pero los que vengan se validan con la misma severidad.
   */
  parcial(): Esquema<Partial<T>> {
    const definicionParcial: Record<string, CampoEsquema<unknown>> = {};
    for (const [clave, campo] of Object.entries(this.definicion)) {
      definicionParcial[clave] = { ...campo, opcional: true, porDefecto: undefined };
    }
    return new Esquema<Partial<T>>(definicionParcial);
  }

  /** Documentacion legible del esquema, usada por `docs/07-api.md`. */
  describir(): Record<string, string> {
    const salida: Record<string, string> = {};
    for (const [clave, campo] of Object.entries(this.definicion)) {
      const partes = [campo.regla.describir()];
      if (campo.opcional) partes.push('opcional');
      if (campo.admiteNulo) partes.push('admite null');
      salida[clave] = partes.join(', ');
    }
    return salida;
  }
}

/** Azucar sintactico para declarar campos con menos ruido. */
export function campo<S>(regla: Regla<unknown, S>, opciones: Omit<CampoEsquema<S>, 'regla'> = {}): CampoEsquema<S> {
  return { regla, ...opciones };
}
