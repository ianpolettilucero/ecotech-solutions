import type { Contexto, Solicitante } from './Contexto.js';
import { Usuario } from '../dominio/seguridad/Usuario.js';
import {
  CABECERA_CSRF,
  DURACION_SESION_SEGUNDOS,
  NOMBRE_COOKIE_SESION,
  claveSesion,
  sesionExpirada,
  type DatosSesion,
} from '../dominio/seguridad/Sesion.js';
import { ServicioCripto } from '../infraestructura/ServicioCripto.js';
import { tokenAleatorio } from '../dominio/base/Identificador.js';
import { PoliticaAutorizacion } from '../dominio/seguridad/PoliticaAutorizacion.js';
import {
  ErrorAutenticacion,
  ErrorAutorizacion,
  ErrorLimiteExcedido,
  ErrorValidacion,
} from '../dominio/base/errores.js';
import { Esquema, campo } from '../dominio/validacion/Esquema.js';
import { ReglaContrasena, ReglaEmail, ReglaTexto } from '../dominio/validacion/Regla.js';
import type { SesionDTO } from '../compartido/tipos.js';
import { ServicioAuditoria } from './ServicioAuditoria.js';

const ESQUEMA_LOGIN = new Esquema<{ email: string; contrasena: string }>({
  email: campo(new ReglaEmail()),
  // En el login NO se aplica `ReglaContrasena`: rechazar por politica una
  // contrasena mal escrita revelaria la politica exacta a un atacante y, peor,
  // distinguiria "formato invalido" de "credenciales incorrectas". Aqui solo se
  // acota la longitud para evitar el DoS por PBKDF2.
  contrasena: campo(new ReglaTexto(1, 128)),
});

const ESQUEMA_CAMBIO = new Esquema<{ contrasenaActual: string; contrasenaNueva: string }>({
  contrasenaActual: campo(new ReglaTexto(1, 128)),
  contrasenaNueva: campo(new ReglaContrasena()),
});

/** Intentos de login permitidos por IP dentro de la ventana. */
const MAX_INTENTOS_IP = 10;
const VENTANA_LOGIN_SEGUNDOS = 300;

export interface ResultadoLogin {
  sesion: SesionDTO;
  /** Token opaco que viaja en la cookie. Solo existe en esta respuesta. */
  token: string;
}

/**
 * Autenticacion y gestion de sesiones.
 *
 * ## Modelo de sesion
 *
 * Se usan **sesiones opacas del lado del servidor**, no JWT. Un JWT no se puede
 * revocar antes de que expire: si se despide a alguien o se le cambia el rol, su
 * token sigue siendo valido hasta el vencimiento. Con una sesion en KV, borrar
 * la clave corta el acceso al instante, que es lo que exige el requisito de
 * autorizacion.
 *
 * El token viaja en una cookie `__Host-` con `HttpOnly`, `Secure` y
 * `SameSite=Strict`. `HttpOnly` impide que un XSS lo lea; `SameSite=Strict`
 * bloquea el CSRF clasico; y el token CSRF de doble envio cubre el caso de que
 * un navegador antiguo ignore `SameSite`.
 *
 * ## Defensa contra fuerza bruta, en dos capas
 *
 * 1. Por IP, con `LimitadorTasa` (barato, atrapa el escaneo masivo).
 * 2. Por cuenta, con el contador de `Usuario` (exacto, atrapa el ataque dirigido).
 *
 * Y siempre se responde lo mismo ("credenciales invalidas") tarde el tiempo que
 * tarde, para no revelar si un email existe.
 */
export class ServicioAutenticacion {
  constructor(private readonly ctx: Contexto) {}

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  async iniciarSesion(datos: unknown, ip: string | null, huella: string | null): Promise<ResultadoLogin> {
    const { email, contrasena } = ESQUEMA_LOGIN.validar(datos);
    const auditoria = new ServicioAuditoria(this.ctx);

    // Capa 1: limite por IP.
    const limite = await this.ctx.limitador.consumir(
      `login:ip:${ip ?? 'desconocida'}`,
      MAX_INTENTOS_IP,
      VENTANA_LOGIN_SEGUNDOS,
    );
    if (!limite.permitido) {
      await auditoria.registrar({
        accion: 'LOGIN_BLOQUEADO_POR_TASA',
        entidad: 'Usuario',
        detalle: `email=${email}`,
        exito: false,
      });
      throw new ErrorLimiteExcedido(
        'Demasiados intentos desde esta direccion. Intente mas tarde.',
        limite.reintentarEnSegundos,
      );
    }

    const usuario = await this.ctx.usuarios.buscarUno((u) => u.email === email);

    // Se verifica SIEMPRE una contrasena, exista el usuario o no. Sin este
    // senuelo, un email inexistente responderia en microsegundos y uno real
    // tardaria los 210.000 ciclos de PBKDF2: la diferencia de tiempo permitiria
    // enumerar la plantilla completa de la empresa.
    const credenciales = usuario?.credencialesParaVerificar() ?? {
      hash: '0'.repeat(64),
      sal: '0'.repeat(32),
    };
    const contrasenaCorrecta = await this.ctx.cripto.verificarContrasena(
      contrasena,
      credenciales.hash,
      credenciales.sal,
    );

    // Capa 2: bloqueo por cuenta.
    //
    // Se comprueba DESPUES del senuelo y se responde con el mismo error
    // generico que cualquier otro fallo. Un mensaje propio ("la cuenta esta
    // bloqueada", y ademas con otro codigo HTTP) convertiria el bloqueo en un
    // oraculo de enumeracion: bastaria con fallar cinco veces contra un email
    // para saber si pertenece a alguien de la empresa, que es justo lo que el
    // resto de este metodo se esfuerza en no revelar.
    //
    // El bloqueo sigue siendo efectivo: no se abre sesion aunque la contrasena
    // sea correcta. Tampoco se suma un intento mas, para que insistir durante
    // la ventana no la prolongue indefinidamente. Quien necesita saber que una
    // cuenta esta bloqueada es el auditor, y para eso queda el asiento.
    if (usuario && usuario.estaBloqueado()) {
      await auditoria.registrar({
        accion: 'LOGIN_CUENTA_BLOQUEADA',
        entidad: 'Usuario',
        entidadId: usuario.id,
        detalle: `email=${email}`,
        exito: false,
      });
      throw new ErrorAutenticacion('Email o contrasena incorrectos.');
    }

    if (!usuario || !contrasenaCorrecta || !usuario.activo) {
      if (usuario && !contrasenaCorrecta) {
        usuario.registrarIntentoFallido();
        await this.ctx.usuarios.guardar(usuario);
      }
      await auditoria.registrar({
        accion: 'LOGIN_FALLIDO',
        entidad: 'Usuario',
        entidadId: usuario?.id ?? null,
        detalle: `email=${email}`,
        exito: false,
      });
      // Mensaje unico e indistinguible para los tres casos.
      throw new ErrorAutenticacion('Email o contrasena incorrectos.');
    }

    usuario.registrarAccesoExitoso();
    await this.ctx.usuarios.guardar(usuario);
    await this.ctx.limitador.reiniciar(`login:ip:${ip ?? 'desconocida'}`);

    const { token, sesion } = await this.crearSesion(usuario, huella);

    // El solicitante se fija ya, para que la auditoria del login lo atribuya.
    this.ctx.solicitante = {
      usuarioId: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      empleadoId: usuario.empleadoId,
      ip,
    };
    await auditoria.registrar({
      accion: 'LOGIN_EXITOSO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      detalle: `rol=${usuario.rol}`,
      exito: true,
    });

    return { token, sesion: await this.aDTO(usuario, sesion) };
  }

  // ---------------------------------------------------------------------------
  // Ciclo de vida de la sesion
  // ---------------------------------------------------------------------------

  private async crearSesion(
    usuario: Usuario,
    huella: string | null,
  ): Promise<{ token: string; sesion: DatosSesion }> {
    const token = tokenAleatorio(32);
    const hashToken = await ServicioCripto.sha256(token);
    const ahora = new Date();
    const sesion: DatosSesion = {
      usuarioId: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      empleadoId: usuario.empleadoId,
      tokenCsrf: tokenAleatorio(24),
      creadaEn: ahora.toISOString(),
      expiraEn: new Date(ahora.getTime() + DURACION_SESION_SEGUNDOS * 1000).toISOString(),
      huellaCliente: huella,
    };
    // Se guarda con TTL: KV la borra sola al expirar, sin tarea de limpieza.
    await this.ctx.almacen.escribir(claveSesion(hashToken), sesion, DURACION_SESION_SEGUNDOS);
    return { token, sesion };
  }

  /**
   * Resuelve la identidad del solicitante a partir de la cookie.
   * Devuelve `null` si no hay sesion valida; nunca lanza, porque las rutas
   * publicas tambien pasan por aqui.
   */
  async resolverSolicitante(
    token: string | null,
    ip: string | null,
    huella: string | null,
  ): Promise<{ solicitante: Solicitante; sesion: DatosSesion } | null> {
    if (!token) return null;
    const hashToken = await ServicioCripto.sha256(token);
    const sesion = await this.ctx.almacen.leer<DatosSesion>(claveSesion(hashToken));
    if (!sesion) return null;

    if (sesionExpirada(sesion)) {
      await this.ctx.almacen.borrar(claveSesion(hashToken));
      return null;
    }

    // Si la huella del cliente cambio, el token pudo haber sido robado y
    // reutilizado desde otro navegador. Se invalida la sesion por precaucion.
    if (sesion.huellaCliente && huella && sesion.huellaCliente !== huella) {
      await this.ctx.almacen.borrar(claveSesion(hashToken));
      return null;
    }

    // El rol se revalida contra el usuario real: si RRHH le cambio el rol o lo
    // desactivo hace un minuto, la sesion en curso debe reflejarlo de inmediato.
    const usuario = await this.ctx.usuarios.obtener(sesion.usuarioId);
    if (!usuario || !usuario.activo) {
      await this.ctx.almacen.borrar(claveSesion(hashToken));
      return null;
    }

    return {
      solicitante: {
        usuarioId: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        empleadoId: usuario.empleadoId,
        ip,
      },
      sesion: { ...sesion, rol: usuario.rol, empleadoId: usuario.empleadoId },
    };
  }

  async cerrarSesion(token: string | null): Promise<void> {
    if (!token) return;
    const hashToken = await ServicioCripto.sha256(token);
    await this.ctx.almacen.borrar(claveSesion(hashToken));
    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'LOGOUT',
      entidad: 'Usuario',
      entidadId: this.ctx.solicitante?.usuarioId ?? null,
      exito: true,
    });
  }

  /**
   * Verificacion CSRF de doble envio para toda peticion que muta datos.
   * `SameSite=Strict` ya cubre el caso habitual; esto es la segunda barrera.
   */
  verificarCsrf(sesion: DatosSesion, cabecera: string | null): void {
    if (!cabecera || !ServicioCripto.comparacionConstante(cabecera, sesion.tokenCsrf)) {
      throw new ErrorAutorizacion(
        `Token ${CABECERA_CSRF} ausente o invalido. Recargue la pagina e intente de nuevo.`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Cambio de contrasena
  // ---------------------------------------------------------------------------

  async cambiarContrasena(datos: unknown): Promise<void> {
    const solicitante = this.ctx.exigirSolicitante();
    const { contrasenaActual, contrasenaNueva } = ESQUEMA_CAMBIO.validar(datos);

    const usuario = await this.ctx.usuarios.obtenerOFallar(solicitante.usuarioId);
    const credenciales = usuario.credencialesParaVerificar();
    const correcta = await this.ctx.cripto.verificarContrasena(
      contrasenaActual,
      credenciales.hash,
      credenciales.sal,
    );
    if (!correcta) {
      await new ServicioAuditoria(this.ctx).registrar({
        accion: 'CAMBIO_CONTRASENA_FALLIDO',
        entidad: 'Usuario',
        entidadId: usuario.id,
        exito: false,
      });
      throw new ErrorAutenticacion('La contrasena actual no es correcta.');
    }
    if (contrasenaActual === contrasenaNueva) {
      throw new ErrorValidacion('La contrasena nueva debe ser distinta de la actual.', [
        { campo: 'contrasenaNueva', mensaje: 'Debe ser distinta de la actual.' },
      ]);
    }

    const { hash, sal } = await this.ctx.cripto.hashearContrasena(contrasenaNueva);
    usuario.cambiarCredenciales(hash, sal, false);
    await this.ctx.usuarios.guardar(usuario);

    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'CAMBIO_CONTRASENA',
      entidad: 'Usuario',
      entidadId: usuario.id,
      exito: true,
    });
  }

  // ---------------------------------------------------------------------------
  // Proyeccion
  // ---------------------------------------------------------------------------

  /** Arma el DTO de sesion que consume el cliente para pintar el menu. */
  async aDTO(usuario: Usuario, sesion: DatosSesion): Promise<SesionDTO> {
    let empleado = null;
    if (usuario.empleadoId) {
      const entidad = await this.ctx.empleados.obtener(usuario.empleadoId);
      // El propio interesado siempre ve sus datos completos.
      if (entidad) {
        const sensibles = await this.ctx.cripto
          .descifrarObjeto<{
            documento: string;
            telefono: string;
            direccion: string;
            emailPersonal: string;
          }>(entidad.datosSensibles)
          .catch(() => null);
        empleado = entidad.aDTO(sensibles);
      }
    }
    return {
      usuario: usuario.aDTO(),
      permisos: PoliticaAutorizacion.permisosDe(usuario.rol),
      empleado,
      tokenCsrf: sesion.tokenCsrf,
      expiraEn: sesion.expiraEn,
    };
  }

  /** Cabecera `Set-Cookie` para instalar la sesion. */
  static cookieDeSesion(token: string): string {
    return [
      `${NOMBRE_COOKIE_SESION}=${token}`,
      'Path=/',
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      `Max-Age=${DURACION_SESION_SEGUNDOS}`,
    ].join('; ');
  }

  /** Cabecera `Set-Cookie` para borrarla. */
  static cookieDeCierre(): string {
    return `${NOMBRE_COOKIE_SESION}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
  }

  /** Lee el token de sesion de la cabecera `Cookie`. */
  static leerTokenDeCookie(cabeceraCookie: string | null): string | null {
    if (!cabeceraCookie) return null;
    for (const parte of cabeceraCookie.split(';')) {
      const separador = parte.indexOf('=');
      if (separador === -1) continue;
      const nombre = parte.slice(0, separador).trim();
      if (nombre === NOMBRE_COOKIE_SESION) {
        const valor = parte.slice(separador + 1).trim();
        return /^[0-9a-f]{64}$/.test(valor) ? valor : null;
      }
    }
    return null;
  }
}
