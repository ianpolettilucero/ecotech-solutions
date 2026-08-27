import { Entidad, type EstadoEntidad } from '../base/Entidad.js';
import type { RegistroAuditoriaDTO } from '../../compartido/tipos.js';

export interface EstadoRegistroAuditoria extends EstadoEntidad {
  usuarioId: string | null;
  emailUsuario: string | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: string;
  exito: boolean;
  ip: string | null;
}

/**
 * Asiento de la traza de auditoria.
 *
 * Responde al problema de "falta de trazabilidad": deja constancia de quien hizo
 * que, sobre que entidad y cuando, incluidos los intentos fallidos (un login
 * rechazado o un 403 son justamente lo que interesa detectar).
 *
 * Es **inmutable por diseno**: no expone ningun metodo de mutacion. Un asiento
 * que se puede editar no sirve como evidencia. Por eso tampoco hereda el patron
 * de `tocar()` del resto de entidades.
 */
export class RegistroAuditoria extends Entidad<EstadoRegistroAuditoria> {
  private readonly _usuarioId: string | null;
  private readonly _emailUsuario: string | null;
  private readonly _accion: string;
  private readonly _entidad: string;
  private readonly _entidadId: string | null;
  private readonly _detalle: string;
  private readonly _exito: boolean;
  private readonly _ip: string | null;

  constructor(estado: EstadoRegistroAuditoria) {
    super(estado.id, estado.creadoEn, estado.actualizadoEn);
    this._usuarioId = estado.usuarioId;
    this._emailUsuario = estado.emailUsuario;
    this._accion = estado.accion;
    this._entidad = estado.entidad;
    this._entidadId = estado.entidadId;
    this._detalle = estado.detalle;
    this._exito = estado.exito;
    this._ip = estado.ip;
  }

  static registrar(datos: {
    usuarioId: string | null;
    emailUsuario: string | null;
    accion: string;
    entidad: string;
    entidadId?: string | null;
    detalle?: string;
    exito: boolean;
    ip?: string | null;
  }): RegistroAuditoria {
    const ahora = new Date().toISOString();
    return new RegistroAuditoria({
      id: crypto.randomUUID(),
      creadoEn: ahora,
      actualizadoEn: ahora,
      usuarioId: datos.usuarioId,
      emailUsuario: datos.emailUsuario,
      accion: datos.accion,
      entidad: datos.entidad,
      entidadId: datos.entidadId ?? null,
      // Se recorta el detalle: la traza no debe convertirse en un vertedero de
      // cuerpos de peticion, que ademas podrian contener datos personales.
      detalle: (datos.detalle ?? '').slice(0, 300),
      exito: datos.exito,
      ip: datos.ip ?? null,
    });
  }

  get accion(): string {
    return this._accion;
  }

  get exito(): boolean {
    return this._exito;
  }

  get entidad(): string {
    return this._entidad;
  }

  override validar(): void {
    // Un asiento se construye siempre por la fabrica estatica con datos ya
    // normalizados; no hay ruta por la que llegue invalido.
  }

  override aEstado(): EstadoRegistroAuditoria {
    return {
      ...this.estadoBase(),
      usuarioId: this._usuarioId,
      emailUsuario: this._emailUsuario,
      accion: this._accion,
      entidad: this._entidad,
      entidadId: this._entidadId,
      detalle: this._detalle,
      exito: this._exito,
      ip: this._ip,
    };
  }

  aDTO(): RegistroAuditoriaDTO {
    return {
      id: this.id,
      usuarioId: this._usuarioId,
      emailUsuario: this._emailUsuario,
      accion: this._accion,
      entidad: this._entidad,
      entidadId: this._entidadId,
      detalle: this._detalle,
      exito: this._exito,
      ip: this._ip,
      creadoEn: this.creadoEn,
    };
  }
}
