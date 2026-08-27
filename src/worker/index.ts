import { Contexto, type Entorno } from '../aplicacion/Contexto.js';
import { Semilla } from '../aplicacion/Semilla.js';
import { ServicioAutenticacion } from '../aplicacion/ServicioAutenticacion.js';
import { Enrutador, type PeticionApi } from './Enrutador.js';
import {
  aplicarCabecerasSeguridad,
  errorARespuesta,
  huellaDe,
  ipDe,
  verificarOrigen,
} from './http.js';
import {
  ErrorAutenticacion,
  ErrorAutorizacion,
  ErrorMetodoNoPermitido,
  ErrorNoEncontrado,
} from '../dominio/base/errores.js';
import { CABECERA_CSRF } from '../dominio/seguridad/Sesion.js';
import { registrarRutasAutenticacion } from './rutas/autenticacion.js';
import { registrarRutasEmpleados } from './rutas/empleados.js';
import { registrarRutasDepartamentos } from './rutas/departamentos.js';
import { registrarRutasProyectos } from './rutas/proyectos.js';
import { registrarRutasAsignaciones } from './rutas/asignaciones.js';
import { registrarRutasTiempo } from './rutas/tiempo.js';
import { registrarRutasReportes } from './rutas/reportes.js';
import { registrarRutasSistema } from './rutas/sistema.js';

/**
 * Tabla de rutas, construida una sola vez por isolate.
 *
 * Se arma a nivel de modulo y no por peticion porque el registro es puro (no
 * depende del entorno) y asi solo se paga en el arranque en frio.
 */
const enrutador = new Enrutador();
registrarRutasAutenticacion(enrutador);
registrarRutasEmpleados(enrutador);
registrarRutasDepartamentos(enrutador);
registrarRutasProyectos(enrutador);
registrarRutasAsignaciones(enrutador);
registrarRutasTiempo(enrutador);
registrarRutasReportes(enrutador);
registrarRutasSistema(enrutador);

/** Metodos que modifican estado y por tanto exigen defensa anti-CSRF. */
const METODOS_MUTANTES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Punto de entrada del Worker.
 *
 * `wrangler.jsonc` esta configurado con `run_worker_first: ["/api/*"]`, de modo
 * que este codigo solo se ejecuta para la API; el resto de rutas las sirve
 * directamente el almacen de assets con reserva de SPA a `index.html`. Es la
 * configuracion mas barata: servir el frontend no consume ni una invocacion.
 */
export default {
  // `ExecutionContext` no se usa: las escrituras de auditoria se esperan en
  // linea a proposito, porque un asiento perdido vale menos que un asiento
  // dudoso. Se mantiene en la firma porque el runtime la exige.
  async fetch(peticion: Request, entorno: Entorno, _contextoEjecucion: ExecutionContext): Promise<Response> {
    const url = new URL(peticion.url);

    // Red de seguridad: si por un cambio de configuracion llegara aqui algo que
    // no es de la API, se delega en los assets en vez de devolver un 404 de API.
    if (!url.pathname.startsWith('/api/')) {
      return aplicarCabecerasSeguridad(await entorno.ASSETS.fetch(peticion));
    }

    const ctx = new Contexto(entorno);

    try {
      // La siembra se ejecuta de forma perezosa: en Workers no hay un paso de
      // "post-despliegue" donde correr migraciones, y sin ella un despliegue
      // limpio no tendria ningun usuario con el que entrar. Es idempotente.
      //
      // Su fallo NO aborta la peticion. Antes si lo hacia, y el resultado era el
      // peor posible: un problema de infraestructura devolvia 500 en *todos* los
      // puntos, incluida la sonda de estado, que es justo la que hay que poder
      // consultar cuando algo va mal. Ahora el fallo se anota y `GET /api/salud`
      // lo explica; el resto de rutas fallara igual, pero por su cuenta y con su
      // propio error, que es informacion util y no ruido.
      try {
        await new Semilla(ctx).ejecutarSiHaceFalta();
      } catch (e) {
        const detalle = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
        ctx.errorDeSiembra = detalle.slice(0, 300);
        console.error('Fallo la siembra inicial:', e);
      }

      const autenticacion = new ServicioAutenticacion(ctx);
      const token = ServicioAutenticacion.leerTokenDeCookie(peticion.headers.get('Cookie'));
      const resuelto = await autenticacion.resolverSolicitante(
        token,
        ipDe(peticion),
        huellaDe(peticion),
      );
      if (resuelto) {
        ctx.solicitante = resuelto.solicitante;
      }

      const coincidencia = enrutador.resolver(peticion.method, url.pathname);
      if (!coincidencia) {
        const permitidos = enrutador.metodosDe(url.pathname);
        if (permitidos.length > 0) {
          throw new ErrorMetodoNoPermitido(peticion.method, url.pathname, permitidos);
        }
        throw new ErrorNoEncontrado(`la ruta ${url.pathname}`);
      }

      const { ruta, parametros } = coincidencia;

      if (ruta.requiereSesion && !resuelto) {
        throw new ErrorAutenticacion('Debe iniciar sesion para acceder a este recurso.');
      }

      if (METODOS_MUTANTES.has(peticion.method)) {
        // Primera barrera: la peticion debe venir del mismo origen. No depende
        // de que el cliente coopere, asi que cubre incluso a un cliente antiguo.
        if (!verificarOrigen(peticion)) {
          throw new ErrorAutorizacion('Peticion rechazada: origen no permitido.');
        }
        // Segunda barrera: token de doble envio. Solo aplica cuando ya hay
        // sesion; el login todavia no tiene ninguno que enviar.
        if (resuelto) {
          autenticacion.verificarCsrf(resuelto.sesion, peticion.headers.get(CABECERA_CSRF));
        }
      }

      const api: PeticionApi = {
        peticion,
        url,
        parametros,
        ctx,
        sesion: resuelto?.sesion ?? null,
        cabecerasExtra: {},
      };

      return await ruta.manejador(api);
    } catch (e) {
      return errorARespuesta(e);
    }
  },
};
