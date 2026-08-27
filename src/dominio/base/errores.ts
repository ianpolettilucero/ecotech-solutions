import type { DetalleErrorCampo } from '../../compartido/tipos.js';

/**
 * Jerarquía de errores del dominio.
 *
 * Aplica *polimorfismo*: la capa HTTP no interroga el tipo concreto del error
 * con `instanceof` encadenados, sino que pregunta a cada error por su propio
 * `codigoHttp` y `código`. Agregar un nuevo error no obliga a tocar el router.
 */
export abstract class ErrorDominio extends Error {
  abstract readonly codigoHttp: number;
  abstract readonly codigo: string;

  /** Detalle por campo, usado por los errores de validación. */
  readonly campos: DetalleErrorCampo[];

  constructor(mensaje: string, campos: DetalleErrorCampo[] = []) {
    super(mensaje);
    this.name = new.target.name;
    this.campos = campos;
  }

  /** Representación serializable y segura (nunca expone el stack). */
  aRespuesta(): { codigo: string; mensaje: string; campos?: DetalleErrorCampo[] } {
    return this.campos.length > 0
      ? { codigo: this.codigo, mensaje: this.message, campos: this.campos }
      : { codigo: this.codigo, mensaje: this.message };
  }
}

/** 400 - la entrada no cumple el esquema o las reglas de formato. */
export class ErrorValidacion extends ErrorDominio {
  override readonly codigoHttp = 400;
  override readonly codigo = 'VALIDACION';

  constructor(mensaje = 'Los datos enviados no son válidos.', campos: DetalleErrorCampo[] = []) {
    super(mensaje, campos);
  }
}

/** 401 - no hay sesión valida o las credenciales son incorrectas. */
export class ErrorAutenticacion extends ErrorDominio {
  override readonly codigoHttp = 401;
  override readonly codigo = 'NO_AUTENTICADO';

  constructor(mensaje = 'Credenciales invalidas o sesión expirada.') {
    super(mensaje);
  }
}

/** 403 - hay sesión, pero el rol no habilita la operación. */
export class ErrorAutorizacion extends ErrorDominio {
  override readonly codigoHttp = 403;
  override readonly codigo = 'NO_AUTORIZADO';

  constructor(mensaje = 'No tiene permisos para realizar esta operación.') {
    super(mensaje);
  }
}

/** 404 - la entidad referenciada no existe. */
export class ErrorNoEncontrado extends ErrorDominio {
  override readonly codigoHttp = 404;
  override readonly codigo = 'NO_ENCONTRADO';

  constructor(entidad: string, id?: string) {
    super(id ? `No se encontro ${entidad} con id "${id}".` : `No se encontro ${entidad}.`);
  }
}

/**
 * 405 - la ruta existe, pero no para este método.
 *
 * Se distingue del 404 a propósito: decirle a un cliente "esa ruta no existe"
 * cuando en realidad existe con otro verbo manda a depurar en la dirección
 * equivocada. La cabecera `Allow` la completa la capa HTTP.
 */
export class ErrorMetodoNoPermitido extends ErrorDominio {
  override readonly codigoHttp = 405;
  override readonly codigo = 'METODO_NO_PERMITIDO';

  constructor(
    metodo: string,
    ruta: string,
    readonly metodosPermitidos: string[] = [],
  ) {
    super(`El método ${metodo} no está permitido en ${ruta}.`);
  }
}

/** 409 - choca con un invariante de unicidad (duplicidad de información). */
export class ErrorConflicto extends ErrorDominio {
  override readonly codigoHttp = 409;
  override readonly codigo = 'CONFLICTO';
}

/** 422 - la entrada es sintácticamente valida pero viola una regla de negocio. */
export class ErrorReglaNegocio extends ErrorDominio {
  override readonly codigoHttp = 422;
  override readonly codigo = 'REGLA_NEGOCIO';
}

/** 429 - se excedio el límite de intentos (fuerza bruta / abuso). */
export class ErrorLimiteExcedido extends ErrorDominio {
  override readonly codigoHttp = 429;
  override readonly codigo = 'LIMITE_EXCEDIDO';

  constructor(
    mensaje = 'Demasiados intentos. Espere unos minutos.',
    readonly reintentarEnSegundos = 60,
  ) {
    super(mensaje);
  }
}

/** 500 - fallo interno no atribuible al cliente. */
export class ErrorInterno extends ErrorDominio {
  override readonly codigoHttp = 500;
  override readonly codigo = 'ERROR_INTERNO';

  constructor(mensaje = 'Ocurrio un error inesperado.') {
    super(mensaje);
  }
}

/** Normaliza cualquier excepción a un `ErrorDominio`, sin filtrar internals. */
export function normalizarError(e: unknown): ErrorDominio {
  if (e instanceof ErrorDominio) return e;
  return new ErrorInterno();
}
