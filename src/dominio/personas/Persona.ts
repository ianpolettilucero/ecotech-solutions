import { Entidad, type EstadoEntidad } from '../base/Entidad.js';
import type { SobreCifrado } from '../base/SobreCifrado.js';
import { ErrorValidacion } from '../base/errores.js';

/** Datos personales protegidos, en claro. Nunca se persisten asi. */
export interface DatosSensibles {
  documento: string;
  telefono: string;
  direccion: string;
  emailPersonal: string;
}

export interface EstadoPersona extends EstadoEntidad {
  nombre: string;
  apellido: string;
  emailCorporativo: string;
  /** Bloque AES-GCM con los `DatosSensibles`. Ver `ServicioCripto`. */
  datosSensibles: SobreCifrado;
  /** HMAC del documento: permite detectar duplicados sin descifrar. */
  indiceDocumento: string;
  /** HMAC del email personal, mismo proposito. */
  indiceEmailPersonal: string;
}

/**
 * Abstraccion de una persona fisica conocida por el sistema.
 *
 * ## Por que existe esta clase y no solo `Empleado`
 *
 * Separa dos responsabilidades que se rigen por reglas distintas:
 *
 * - Lo que hace de alguien una **persona** (identidad, contacto, domicilio) esta
 *   sujeto a normativa de datos personales: se cifra en reposo, se enmascara
 *   segun permisos y se audita cada acceso.
 * - Lo que hace de alguien un **empleado** (legajo, contrato, remuneracion,
 *   departamento) es informacion laboral, con otro ciclo de vida.
 *
 * Concentrar el bloque cifrado y los indices ciegos aqui garantiza que ninguna
 * subclase futura (un contacto de cliente, un proveedor) pueda "olvidarse" de
 * proteger los datos: la proteccion viene heredada, no repetida.
 *
 * `datosSensibles` se guarda **cifrado incluso en memoria**: la entidad nunca ve
 * el texto plano. Descifrar es una operacion asincronica y con permisos, y por
 * eso vive en la capa de servicio, no aqui. Asi la entidad permanece sincronica
 * y testeable sin criptografia.
 */
export abstract class Persona<E extends EstadoPersona = EstadoPersona> extends Entidad<E> {
  protected _nombre: string;
  protected _apellido: string;
  protected _emailCorporativo: string;
  protected _datosSensibles: SobreCifrado;
  protected _indiceDocumento: string;
  protected _indiceEmailPersonal: string;

  protected constructor(estado: EstadoPersona) {
    super(estado.id, estado.creadoEn, estado.actualizadoEn);
    this._nombre = estado.nombre;
    this._apellido = estado.apellido;
    this._emailCorporativo = estado.emailCorporativo;
    this._datosSensibles = estado.datosSensibles;
    this._indiceDocumento = estado.indiceDocumento;
    this._indiceEmailPersonal = estado.indiceEmailPersonal;
  }

  get nombre(): string {
    return this._nombre;
  }

  get apellido(): string {
    return this._apellido;
  }

  get emailCorporativo(): string {
    return this._emailCorporativo;
  }

  /** Sobre cifrado. Solo `ServicioCripto` puede abrirlo. */
  get datosSensibles(): SobreCifrado {
    return this._datosSensibles;
  }

  get indiceDocumento(): string {
    return this._indiceDocumento;
  }

  get indiceEmailPersonal(): string {
    return this._indiceEmailPersonal;
  }

  /** Formato "Apellido, Nombre", que es el orden de listado en RRHH. */
  nombreCompleto(): string {
    return `${this._apellido}, ${this._nombre}`;
  }

  /** Formato "Nombre Apellido", para saludos y encabezados. */
  nombreParaMostrar(): string {
    return `${this._nombre} ${this._apellido}`;
  }

  /** Iniciales, usadas por el avatar del cliente. */
  iniciales(): string {
    const n = this._nombre.trim().charAt(0);
    const a = this._apellido.trim().charAt(0);
    return `${n}${a}`.toUpperCase();
  }

  renombrar(nombre: string, apellido: string): void {
    this._nombre = nombre;
    this._apellido = apellido;
    this.tocar();
  }

  /** Reemplaza el bloque cifrado y sus indices tras una edicion de datos. */
  actualizarDatosSensibles(
    sobre: SobreCifrado,
    indiceDocumento: string,
    indiceEmailPersonal: string,
  ): void {
    this._datosSensibles = sobre;
    this._indiceDocumento = indiceDocumento;
    this._indiceEmailPersonal = indiceEmailPersonal;
    this.tocar();
  }

  cambiarEmailCorporativo(email: string): void {
    this._emailCorporativo = email;
    this.tocar();
  }

  /** Como se describe esta persona en informes. Cada subclase lo concreta. */
  abstract descripcionRol(): string;

  override validar(): void {
    if (this._nombre.trim().length < 2) {
      throw new ErrorValidacion('El nombre debe tener al menos 2 caracteres.', [
        { campo: 'nombre', mensaje: 'Debe tener al menos 2 caracteres.' },
      ]);
    }
    if (this._apellido.trim().length < 2) {
      throw new ErrorValidacion('El apellido debe tener al menos 2 caracteres.', [
        { campo: 'apellido', mensaje: 'Debe tener al menos 2 caracteres.' },
      ]);
    }
    if (!this._emailCorporativo.includes('@')) {
      throw new ErrorValidacion('El email corporativo no es valido.', [
        { campo: 'emailCorporativo', mensaje: 'No es una direccion valida.' },
      ]);
    }
  }

  protected estadoPersona(): EstadoPersona {
    return {
      ...this.estadoBase(),
      nombre: this._nombre,
      apellido: this._apellido,
      emailCorporativo: this._emailCorporativo,
      datosSensibles: this._datosSensibles,
      indiceDocumento: this._indiceDocumento,
      indiceEmailPersonal: this._indiceEmailPersonal,
    };
  }
}
