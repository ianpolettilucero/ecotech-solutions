import { AlmacenKV } from '../infraestructura/AlmacenKV.js';
import { RepositorioKV } from '../infraestructura/RepositorioKV.js';
import { ServicioCripto } from '../infraestructura/ServicioCripto.js';
import { LimitadorTasa } from '../infraestructura/LimitadorTasa.js';
import { FabricaEmpleados } from '../dominio/fabricas/FabricaEmpleados.js';
import { Empleado, type EstadoEmpleado } from '../dominio/personas/Empleado.js';
import { Departamento, type EstadoDepartamento } from '../dominio/organizacion/Departamento.js';
import {
  Proyecto,
  type EstadoProyectoPersistido,
} from '../dominio/organizacion/Proyecto.js';
import {
  AsignacionProyecto,
  type EstadoAsignacion,
} from '../dominio/organizacion/AsignacionProyecto.js';
import {
  RegistroTiempo,
  type EstadoRegistroTiempo,
} from '../dominio/tiempo/RegistroTiempo.js';
import { Usuario, type EstadoUsuario } from '../dominio/seguridad/Usuario.js';
import {
  RegistroAuditoria,
  type EstadoRegistroAuditoria,
} from '../dominio/auditoria/RegistroAuditoria.js';
import type { Permiso, Rol } from '../compartido/tipos.js';
import { PoliticaAutorizacion } from '../dominio/seguridad/PoliticaAutorizacion.js';
import { ErrorAutorizacion } from '../dominio/base/errores.js';

/** Bindings declarados en `wrangler.jsonc`, más los secrets. */
export interface Entorno {
  ECOTECH_KV: KVNamespace;
  ASSETS: Fetcher;
  ENTORNO?: string;
  /** Secret. Clave maestra de la que se derivan las de cifrado e índice ciego. */
  CLAVE_MAESTRA?: string;
  /** Secret opcional. Contraseña del administrador sembrado en el primer arranque. */
  CLAVE_ADMIN_INICIAL?: string;
}

/** Identidad del solicitante, resuelta por el middleware de autenticación. */
export interface Solicitante {
  usuarioId: string;
  email: string;
  rol: Rol;
  /** Empleado que representa, si la cuenta está vinculada a uno. */
  empleadoId: string | null;
  ip: string | null;
}

/**
 * Contenedor de dependencias de una petición.
 *
 * Se construye uno por petición (los Workers no tienen estado global fiable
 * entre invocaciones) y agrupa los repositorios y servicios de infraestructura.
 * Que todo cuelgue de aquí hace que las dependencias de cada servicio sean
 * explicitas en su constructor: nada de singletons ni de imports con efectos
 * secundarios, que son justamente lo que vuelve imposible testear.
 *
 * Los repositorios se crean de forma perezosa: una petición que solo lista
 * departamentos no paga por instanciar los ocho.
 */
export class Contexto {
  readonly almacen: AlmacenKV;
  readonly cripto: ServicioCripto;
  readonly limitador: LimitadorTasa;

  private _empleados?: RepositorioKV<Empleado, EstadoEmpleado>;
  private _departamentos?: RepositorioKV<Departamento, EstadoDepartamento>;
  private _proyectos?: RepositorioKV<Proyecto, EstadoProyectoPersistido>;
  private _asignaciones?: RepositorioKV<AsignacionProyecto, EstadoAsignacion>;
  private _registros?: RepositorioKV<RegistroTiempo, EstadoRegistroTiempo>;
  private _usuarios?: RepositorioKV<Usuario, EstadoUsuario>;
  private _auditoria?: RepositorioKV<RegistroAuditoria, EstadoRegistroAuditoria>;

  /**
   * Diagnóstico del último fallo de siembra, si lo hubo.
   *
   * Se guarda en vez de propagarse porque una siembra rota no debe tumbar la
   * sonda de estado: precisamente cuando el sistema está mal es cuando hay que
   * poder preguntarle que le pasa.
   */
  errorDeSiembra: string | null = null;

  constructor(
    readonly entorno: Entorno,
    /** `null` mientras la petición no está autenticada (login, salud, assets). */
    public solicitante: Solicitante | null = null,
  ) {
    this.almacen = new AlmacenKV(entorno.ECOTECH_KV);
    this.cripto = new ServicioCripto(Contexto.resolverClaveMaestra(entorno));
    this.limitador = new LimitadorTasa(this.almacen);
  }

  /**
   * Resuelve la clave maestra de cifrado.
   *
   * En producción **debe** venir del secret `CLAVE_MAESTRA`. Si falta, se usa
   * una clave de desarrollo derivada del nombre del proyecto: permite levantar
   * el entorno local con `wrangler dev` sin configurar nada, pero deja el
   * sistema en un estado que `GET /api/salud` reporta explicitamente como
   * inseguro, para que no pase inadvertido. Nunca se silencia el problema.
   */
  private static resolverClaveMaestra(entorno: Entorno): string {
    const secreto = entorno.CLAVE_MAESTRA?.trim();
    if (secreto && secreto.length >= 32) return secreto;
    return 'ecotech-clave-de-desarrollo-no-apta-para-produccion-0001';
  }

  /** `true` si el cifrado está usando la clave de desarrollo. */
  get usaClaveDeDesarrollo(): boolean {
    const secreto = this.entorno.CLAVE_MAESTRA?.trim();
    return !secreto || secreto.length < 32;
  }

  // ---------------------------------------------------------------------------
  // Repositorios (perezosos)
  // ---------------------------------------------------------------------------

  get empleados(): RepositorioKV<Empleado, EstadoEmpleado> {
    this._empleados ??= new RepositorioKV<Empleado, EstadoEmpleado>(
      this.almacen,
      'empleados',
      (estado) => FabricaEmpleados.rehidratar(estado),
      'el empleado',
    );
    return this._empleados;
  }

  get departamentos(): RepositorioKV<Departamento, EstadoDepartamento> {
    this._departamentos ??= new RepositorioKV<Departamento, EstadoDepartamento>(
      this.almacen,
      'departamentos',
      (estado) => new Departamento(estado),
      'el departamento',
    );
    return this._departamentos;
  }

  get proyectos(): RepositorioKV<Proyecto, EstadoProyectoPersistido> {
    this._proyectos ??= new RepositorioKV<Proyecto, EstadoProyectoPersistido>(
      this.almacen,
      'proyectos',
      (estado) => new Proyecto(estado),
      'el proyecto',
    );
    return this._proyectos;
  }

  get asignaciones(): RepositorioKV<AsignacionProyecto, EstadoAsignacion> {
    this._asignaciones ??= new RepositorioKV<AsignacionProyecto, EstadoAsignacion>(
      this.almacen,
      'asignaciones',
      (estado) => new AsignacionProyecto(estado),
      'la asignación',
    );
    return this._asignaciones;
  }

  get registrosTiempo(): RepositorioKV<RegistroTiempo, EstadoRegistroTiempo> {
    this._registros ??= new RepositorioKV<RegistroTiempo, EstadoRegistroTiempo>(
      this.almacen,
      'registros-tiempo',
      (estado) => new RegistroTiempo(estado),
      'el registro de tiempo',
    );
    return this._registros;
  }

  get usuarios(): RepositorioKV<Usuario, EstadoUsuario> {
    this._usuarios ??= new RepositorioKV<Usuario, EstadoUsuario>(
      this.almacen,
      'usuarios',
      (estado) => new Usuario(estado),
      'el usuario',
    );
    return this._usuarios;
  }

  get auditoria(): RepositorioKV<RegistroAuditoria, EstadoRegistroAuditoria> {
    this._auditoria ??= new RepositorioKV<RegistroAuditoria, EstadoRegistroAuditoria>(
      this.almacen,
      'auditoria',
      (estado) => new RegistroAuditoria(estado),
      'el registro de auditoría',
    );
    return this._auditoria;
  }

  // ---------------------------------------------------------------------------
  // Autorización
  // ---------------------------------------------------------------------------

  /** Solicitante autenticado, o 403 si la petición es anónima. */
  exigirSolicitante(): Solicitante {
    if (!this.solicitante) {
      throw new ErrorAutorizacion('Esta operación requiere una sesión activa.');
    }
    return this.solicitante;
  }

  /** Comprueba un permiso del rol actual y devuelve el solicitante. */
  exigirPermiso(permiso: Permiso): Solicitante {
    const solicitante = this.exigirSolicitante();
    PoliticaAutorizacion.exigir(solicitante.rol, permiso);
    return solicitante;
  }

  puede(permiso: Permiso): boolean {
    return this.solicitante ? PoliticaAutorizacion.puede(this.solicitante.rol, permiso) : false;
  }
}
