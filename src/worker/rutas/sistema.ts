import type { Enrutador } from '../Enrutador.js';
import { ServicioReportes } from '../../aplicacion/ServicioReportes.js';
import { ServicioAuditoria } from '../../aplicacion/ServicioAuditoria.js';
import { json } from '../http.js';
import { consulta, consultaBooleana, consultaEntero } from './comun.js';

export function registrarRutasSistema(enrutador: Enrutador): void {
  enrutador.get('/api/panel', async (api) => {
    const servicio = new ServicioReportes(api.ctx);
    return json(await servicio.metricasPanel());
  });

  enrutador.get('/api/auditoria', async (api) => {
    const servicio = new ServicioAuditoria(api.ctx);
    return json(
      await servicio.listar({
        accion: consulta(api, 'accion'),
        entidad: consulta(api, 'entidad'),
        exito: consultaBooleana(api, 'exito'),
        limite: consultaEntero(api, 'limite', 1, 1000),
      }),
    );
  });

  /**
   * Sonda de estado. Es pública, pero deliberadamente parca: revela si el
   * sistema está sembrado y si el cifrado usa la clave de desarrollo (una
   * advertencia que debe ser imposible de pasar por alto), y nada más. No
   * expone versiones, rutas internas ni conteos, que serían reconocimiento
   * gratuito para un atacante.
   */
  enrutador.get(
    '/api/salud',
    async (api) => {
      // Se comprueba el almacén por separado de la siembra: distinguir "KV no
      // responde" de "KV responde pero está vacío" es la mitad del diagnóstico.
      let almacenAccesible = true;
      let errorAlmacen: string | null = null;
      let sembrado = false;
      try {
        sembrado =
          (await api.ctx.almacen.leer<{ hecho: boolean }>('sistema:sembrado'))?.hecho === true;
      } catch (e) {
        almacenAccesible = false;
        errorAlmacen = (e instanceof Error ? `${e.name}: ${e.message}` : String(e)).slice(0, 300);
      }

      const sano = almacenAccesible && sembrado && api.ctx.errorDeSiembra === null;

      return json(
        {
          estado: sano ? 'operativo' : 'degradado',
          almacen: 'workers-kv',
          almacenAccesible,
          sembrado,
          cifradoConClaveDeDesarrollo: api.ctx.usaClaveDeDesarrollo,
          advertencia: api.ctx.usaClaveDeDesarrollo
            ? 'Defina el secret CLAVE_MAESTRA: los datos personales se están cifrando con una clave pública.'
            : null,
          // El detalle solo se pública mientras el sistema NO está sembrado.
          // En ese estado no hay ningún dato que proteger todavía, y a cambio se
          // puede diagnosticar el despliegue desde fuera. Una vez sembrado, el
          // detalle desaparece y queda solo en los registros del Worker.
          diagnostico: sembrado
            ? null
            : { errorAlmacen, errorSiembra: api.ctx.errorDeSiembra },
        },
        sano ? 200 : 503,
      );
    },
    { requiereSesion: false },
  );
}
