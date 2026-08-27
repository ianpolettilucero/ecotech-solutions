import { Entidad, type EstadoEntidad } from '../base/Entidad.js';
import { ErrorValidacion } from '../base/errores.js';
import type { Rol, UsuarioDTO } from '../../compartido/tipos.js';

export interface EstadoUsuario extends EstadoEntidad {
  email: string;
  /** PBKDF2-SHA256 de la contraseña, en hexadecimal. Nunca la contraseña. */
  hashContrasena: string;
  /** Sal única por usuario, en hexadecimal. */
  salContrasena: string;
  rol: Rol;
  /** Empleado al que representa esta cuenta, si corresponde. */
  empleadoId: string | null;
  activo: boolean;
  debeCambiarContrasena: boolean;
  ultimoAcceso: string | null;
  intentosFallidos: number;
  /** ISO hasta el que la cuenta está bloqueada por intentos fallidos. */
  bloqueadoHasta: string | null;
}

/** Política de bloqueo por fuerza bruta. */
const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;

/**
 * Cuenta de acceso al sistema.
 *
 * ## Por que `Usuario` no hereda de `Empleado`
 *
 * Es la confusión más común (y la que suelen cometer los diagramas generados por
 * IA): "un usuario es un empleado que entra al sistema", luego `Usuario extends
 * Empleado`. Rompe por los dos extremos:
 *
 * - Hay **empleados sin usuario**: un operario que no usa el sistema igual cobra
 *   y tiene horas cargadas por su supervisor.
 * - Hay **usuarios sin empleado**: la cuenta del auditor externo o la cuenta
 *   técnica de administración no corresponden a nadie en nómina.
 *
 * Son dos conceptos con ciclos de vida independientes: dar de baja a alguien de
 * la empresa debe desactivar su cuenta, pero borrar una cuenta no borra a la
 * persona. La relación correcta es una asociación opcional 0..1 mediante
 * `empleadoId`, y eso es lo que se modela aquí.
 *
 * ## Encapsulamiento del secreto
 *
 * El hash y la sal son privados y no tienen `getter` público. La única forma de
 * usarlos es `aEstado()`, que consume el repositorio, y la verificación pasa por
 * `ServicioCripto`. La entidad nunca ve la contraseña en claro.
 */
export class Usuario extends Entidad<EstadoUsuario> {
  private _email: string;
  private _hashContrasena: string;
  private _salContrasena: string;
  private _rol: Rol;
  private _empleadoId: string | null;
  private _activo: boolean;
  private _debeCambiarContrasena: boolean;
  private _ultimoAcceso: string | null;
  private _intentosFallidos: number;
  private _bloqueadoHasta: string | null;

  constructor(estado: EstadoUsuario) {
    super(estado.id, estado.creadoEn, estado.actualizadoEn);
    this._email = estado.email;
    this._hashContrasena = estado.hashContrasena;
    this._salContrasena = estado.salContrasena;
    this._rol = estado.rol;
    this._empleadoId = estado.empleadoId;
    this._activo = estado.activo;
    this._debeCambiarContrasena = estado.debeCambiarContrasena;
    this._ultimoAcceso = estado.ultimoAcceso;
    this._intentosFallidos = estado.intentosFallidos;
    this._bloqueadoHasta = estado.bloqueadoHasta;
  }

  get email(): string {
    return this._email;
  }

  get rol(): Rol {
    return this._rol;
  }

  get empleadoId(): string | null {
    return this._empleadoId;
  }

  get activo(): boolean {
    return this._activo;
  }

  get debeCambiarContrasena(): boolean {
    return this._debeCambiarContrasena;
  }

  get ultimoAcceso(): string | null {
    return this._ultimoAcceso;
  }

  get intentosFallidos(): number {
    return this._intentosFallidos;
  }

  /**
   * Material para verificar la contraseña. Es `internal` por convención: solo lo
   * consume `Servicioautenticación`. Se expone como método y no como propiedades
   * para que cualquier uso quede visible en una búsqueda del código.
   */
  credencialesParaVerificar(): { hash: string; sal: string } {
    return { hash: this._hashContrasena, sal: this._salContrasena };
  }

  estaBloqueado(ahora: Date = new Date()): boolean {
    if (this._bloqueadoHasta === null) return false;
    return new Date(this._bloqueadoHasta).getTime() > ahora.getTime();
  }

  /** Segundos que faltan para que se levante el bloqueo. */
  segundosDeBloqueoRestantes(ahora: Date = new Date()): number {
    if (this._bloqueadoHasta === null) return 0;
    const restante = new Date(this._bloqueadoHasta).getTime() - ahora.getTime();
    return restante > 0 ? Math.ceil(restante / 1000) : 0;
  }

  /**
   * Suma un intento fallido y bloquea la cuenta al llegar al tope.
   * El bloqueo temporal (y no permanente) evita que un atacante deje fuera del
   * sistema a un empleado legítimo simplemente fallando su contraseña.
   */
  registrarIntentoFallido(ahora: Date = new Date()): void {
    this._intentosFallidos += 1;
    if (this._intentosFallidos >= MAX_INTENTOS) {
      this._bloqueadoHasta = new Date(ahora.getTime() + MINUTOS_BLOQUEO * 60_000).toISOString();
      this._intentosFallidos = 0;
    }
    this.tocar();
  }

  registrarAccesoExitoso(ahora: Date = new Date()): void {
    this._intentosFallidos = 0;
    this._bloqueadoHasta = null;
    this._ultimoAcceso = ahora.toISOString();
    this.tocar();
  }

  /** Instala credenciales nuevas y levanta cualquier bloqueo vigente. */
  cambiarCredenciales(hash: string, sal: string, forzarCambio = false): void {
    this._hashContrasena = hash;
    this._salContrasena = sal;
    this._debeCambiarContrasena = forzarCambio;
    this._intentosFallidos = 0;
    this._bloqueadoHasta = null;
    this.tocar();
  }

  cambiarRol(rol: Rol): void {
    this._rol = rol;
    this.tocar();
  }

  vincularEmpleado(empleadoId: string | null): void {
    this._empleadoId = empleadoId;
    this.tocar();
  }

  desactivar(): void {
    this._activo = false;
    this.tocar();
  }

  reactivar(): void {
    this._activo = true;
    this._intentosFallidos = 0;
    this._bloqueadoHasta = null;
    this.tocar();
  }

  override validar(): void {
    if (!this._email.includes('@') || this._email.length < 5) {
      throw new ErrorValidacion('El email del usuario no es válido.', [
        { campo: 'email', mensaje: 'No es una dirección válida.' },
      ]);
    }
    if (this._hashContrasena.length < 32 || this._salContrasena.length < 16) {
      throw new ErrorValidacion('Las credenciales del usuario no son válidas.');
    }
  }

  override aEstado(): EstadoUsuario {
    return {
      ...this.estadoBase(),
      email: this._email,
      hashContrasena: this._hashContrasena,
      salContrasena: this._salContrasena,
      rol: this._rol,
      empleadoId: this._empleadoId,
      activo: this._activo,
      debeCambiarContrasena: this._debeCambiarContrasena,
      ultimoAcceso: this._ultimoAcceso,
      intentosFallidos: this._intentosFallidos,
      bloqueadoHasta: this._bloqueadoHasta,
    };
  }

  /** Proyección pública. Nunca incluye hash, sal ni estado de bloqueo. */
  aDTO(): UsuarioDTO {
    return {
      id: this.id,
      email: this._email,
      rol: this._rol,
      empleadoId: this._empleadoId,
      activo: this._activo,
      debeCambiarContrasena: this._debeCambiarContrasena,
      ultimoAcceso: this._ultimoAcceso,
      creadoEn: this.creadoEn,
      actualizadoEn: this.actualizadoEn,
    };
  }
}
