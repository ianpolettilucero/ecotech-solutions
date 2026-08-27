import type { DetalleErrorCampo } from '../../compartido/tipos.js';

/**
 * Reglas de validacion como jerarquia de clases.
 *
 * Requisito: "implementa una rigurosa validacion de todas las entradas del
 * usuario para prevenir ataques comunes".
 *
 * Cada regla es un objeto con una unica responsabilidad que sabe (a) si un
 * valor la cumple y (b) como normalizarlo. El esquema recorre la lista sin
 * saber que regla concreta esta aplicando: agregar `ReglaCUIT` no obliga a
 * modificar ni el esquema ni el router. Es polimorfismo puro, y sustituye a la
 * tipica cascada de `if` que se vuelve inmantenible.
 */
export abstract class Regla<E = unknown, S = E> {
  /**
   * Aplica la regla. Devuelve el valor normalizado o lanza `FalloRegla`.
   * Se usa excepcion en vez de `boolean` para poder devolver mensajes precisos.
   */
  abstract aplicar(valor: E, campo: string): S;

  /** Descripcion legible, usada por la documentacion de la API. */
  abstract describir(): string;
}

/** Fallo puntual de una regla; el esquema los agrega en un `ErrorValidacion`. */
export class FalloRegla extends Error {
  constructor(
    readonly campo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'FalloRegla';
  }

  aDetalle(): DetalleErrorCampo {
    return { campo: this.campo, mensaje: this.message };
  }
}

/** Caracteres de control C0 y DEL: se eliminan siempre de toda entrada. */
const CARACTERES_CONTROL = /[\u0000-\u001F\u007F]/g;

// ---------------------------------------------------------------------------
// Reglas de texto
// ---------------------------------------------------------------------------

/**
 * Texto saneado.
 *
 * Recorta, normaliza a NFC y **elimina caracteres de control** (incluido el
 * byte nulo), que son el vehiculo habitual de inyeccion en logs, de
 * contrabando de cabeceras HTTP y de truncamiento en capas inferiores.
 *
 * No se escapa HTML aqui a proposito: el escape corresponde al punto de salida
 * (el cliente pinta con `textContent`, nunca con `innerHTML`). Escapar en la
 * entrada corrompe el dato almacenado y produce el clasico "Jos&eacute;".
 */
export class ReglaTexto extends Regla<unknown, string> {
  constructor(
    private readonly min = 0,
    private readonly max = 255,
    private readonly patron?: RegExp,
    private readonly descripcionPatron?: string,
  ) {
    super();
  }

  override aplicar(valor: unknown, campo: string): string {
    if (typeof valor !== 'string') {
      throw new FalloRegla(campo, 'Debe ser una cadena de texto.');
    }
    const limpio = valor.normalize('NFC').replace(CARACTERES_CONTROL, '').trim();
    if (limpio.length < this.min) {
      throw new FalloRegla(campo, `Debe tener al menos ${this.min} caracteres.`);
    }
    if (limpio.length > this.max) {
      throw new FalloRegla(campo, `No puede superar los ${this.max} caracteres.`);
    }
    if (this.patron && limpio.length > 0 && !this.patron.test(limpio)) {
      throw new FalloRegla(campo, this.descripcionPatron ?? 'El formato no es valido.');
    }
    return limpio;
  }

  override describir(): string {
    return `texto (${this.min}-${this.max} caracteres)`;
  }
}

/** Correo electronico. Valida forma y longitud, y normaliza a minusculas. */
export class ReglaEmail extends Regla<unknown, string> {
  private static readonly PATRON = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$/;

  override aplicar(valor: unknown, campo: string): string {
    const texto = new ReglaTexto(5, 254).aplicar(valor, campo).toLowerCase();
    if (!ReglaEmail.PATRON.test(texto)) {
      throw new FalloRegla(campo, 'Debe ser una direccion de correo valida.');
    }
    return texto;
  }

  override describir(): string {
    return 'correo electronico';
  }
}

/** Telefono en formato internacional laxo: digitos, espacios, `+`, `-`, `()`. */
export class ReglaTelefono extends Regla<unknown, string> {
  private static readonly PATRON = /^\+?[0-9\s\-()]{7,20}$/;

  override aplicar(valor: unknown, campo: string): string {
    const texto = new ReglaTexto(7, 20).aplicar(valor, campo);
    if (!ReglaTelefono.PATRON.test(texto)) {
      throw new FalloRegla(campo, 'Debe ser un telefono valido (7 a 20 digitos).');
    }
    return texto;
  }

  override describir(): string {
    return 'telefono';
  }
}

/** Documento de identidad: alfanumerico, 6 a 20 caracteres. */
export class ReglaDocumento extends Regla<unknown, string> {
  private static readonly PATRON = /^[A-Za-z0-9.-]{6,20}$/;

  override aplicar(valor: unknown, campo: string): string {
    const texto = new ReglaTexto(6, 20).aplicar(valor, campo);
    if (!ReglaDocumento.PATRON.test(texto)) {
      throw new FalloRegla(campo, 'Debe ser un documento alfanumerico de 6 a 20 caracteres.');
    }
    return texto.toUpperCase();
  }

  override describir(): string {
    return 'documento de identidad';
  }
}

/**
 * Contrasena robusta.
 *
 * Requisito: "sistema de autenticacion robusto con contrasenas seguras".
 * Se exige longitud >= 12 y tres de las cuatro familias de caracteres, y se
 * rechazan las mas explotadas. El tope de 128 evita el DoS por PBKDF2 con
 * entradas gigantes (cada intento cuesta 210.000 iteraciones de CPU).
 */
export class ReglaContrasena extends Regla<unknown, string> {
  private static readonly PROHIBIDAS = new Set([
    'password1234',
    'contrasena12',
    'administrador',
    'ecotech12345',
    'passw0rd1234',
    'qwertyuiop12',
    '123456789012',
  ]);

  override aplicar(valor: unknown, campo: string): string {
    if (typeof valor !== 'string') {
      throw new FalloRegla(campo, 'Debe ser una cadena de texto.');
    }
    if (valor.length < 12) {
      throw new FalloRegla(campo, 'Debe tener al menos 12 caracteres.');
    }
    if (valor.length > 128) {
      throw new FalloRegla(campo, 'No puede superar los 128 caracteres.');
    }
    const familias = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) =>
      r.test(valor),
    ).length;
    if (familias < 3) {
      throw new FalloRegla(
        campo,
        'Debe combinar al menos tres de: minusculas, mayusculas, numeros y simbolos.',
      );
    }
    if (ReglaContrasena.PROHIBIDAS.has(valor.toLowerCase())) {
      throw new FalloRegla(campo, 'Esta contrasena figura en listas publicas de filtraciones.');
    }
    return valor;
  }

  override describir(): string {
    return 'contrasena de 12+ caracteres combinando 3 familias de caracteres';
  }
}

// ---------------------------------------------------------------------------
// Reglas numericas, de fecha y de conjunto
// ---------------------------------------------------------------------------

export class ReglaNumero extends Regla<unknown, number> {
  constructor(
    private readonly min = Number.NEGATIVE_INFINITY,
    private readonly max = Number.POSITIVE_INFINITY,
    private readonly entero = false,
  ) {
    super();
  }

  override aplicar(valor: unknown, campo: string): number {
    const numero = typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor;
    if (typeof numero !== 'number' || !Number.isFinite(numero)) {
      throw new FalloRegla(campo, 'Debe ser un numero.');
    }
    if (this.entero && !Number.isInteger(numero)) {
      throw new FalloRegla(campo, 'Debe ser un numero entero.');
    }
    if (numero < this.min) throw new FalloRegla(campo, `No puede ser menor que ${this.min}.`);
    if (numero > this.max) throw new FalloRegla(campo, `No puede ser mayor que ${this.max}.`);
    // Se redondea a 2 decimales: aplica tanto a importes como a horas.
    return this.entero ? numero : Math.round(numero * 100) / 100;
  }

  override describir(): string {
    return `numero entre ${this.min} y ${this.max}`;
  }
}

/** Fecha ISO `AAAA-MM-DD`, validada como fecha real del calendario. */
export class ReglaFecha extends Regla<unknown, string> {
  private static readonly PATRON = /^\d{4}-\d{2}-\d{2}$/;

  constructor(
    private readonly permitirFuturo = true,
    private readonly minimo = '1950-01-01',
  ) {
    super();
  }

  override aplicar(valor: unknown, campo: string): string {
    if (typeof valor !== 'string' || !ReglaFecha.PATRON.test(valor.trim())) {
      throw new FalloRegla(campo, 'Debe tener el formato AAAA-MM-DD.');
    }
    const texto = valor.trim();
    const fecha = new Date(`${texto}T00:00:00Z`);
    // Rechaza fechas imposibles como 2025-02-31, que `Date` normalizaria en silencio.
    if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== texto) {
      throw new FalloRegla(campo, 'No es una fecha real del calendario.');
    }
    if (texto < this.minimo) {
      throw new FalloRegla(campo, `No puede ser anterior a ${this.minimo}.`);
    }
    if (!this.permitirFuturo && texto > new Date().toISOString().slice(0, 10)) {
      throw new FalloRegla(campo, 'No puede ser una fecha futura.');
    }
    return texto;
  }

  override describir(): string {
    return this.permitirFuturo ? 'fecha AAAA-MM-DD' : 'fecha AAAA-MM-DD no futura';
  }
}

export class ReglaBooleano extends Regla<unknown, boolean> {
  override aplicar(valor: unknown, campo: string): boolean {
    if (typeof valor === 'boolean') return valor;
    if (valor === 'true') return true;
    if (valor === 'false') return false;
    throw new FalloRegla(campo, 'Debe ser verdadero o falso.');
  }

  override describir(): string {
    return 'booleano';
  }
}

/** Valor perteneciente a un conjunto cerrado (lista blanca). */
export class ReglaEnumerado<T extends string> extends Regla<unknown, T> {
  constructor(private readonly permitidos: readonly T[]) {
    super();
  }

  override aplicar(valor: unknown, campo: string): T {
    if (typeof valor !== 'string' || !this.permitidos.includes(valor as T)) {
      throw new FalloRegla(campo, `Debe ser uno de: ${this.permitidos.join(', ')}.`);
    }
    return valor as T;
  }

  override describir(): string {
    return `uno de: ${this.permitidos.join(' | ')}`;
  }
}

/** Identificador UUID emitido por el propio sistema. */
export class ReglaIdentificador extends Regla<unknown, string> {
  private static readonly PATRON =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  override aplicar(valor: unknown, campo: string): string {
    if (typeof valor !== 'string' || !ReglaIdentificador.PATRON.test(valor.trim())) {
      throw new FalloRegla(campo, 'No es un identificador valido.');
    }
    return valor.trim().toLowerCase();
  }

  override describir(): string {
    return 'identificador UUID';
  }
}
