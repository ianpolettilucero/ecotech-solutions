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
   * Sonda de estado. Es publica, pero deliberadamente parca: revela si el
   * sistema esta sembrado y si el cifrado usa la clave de desarrollo (una
   * advertencia que debe ser imposible de pasar por alto), y nada mas. No
   * expone versiones, rutas internas ni conteos, que serian reconocimiento
   * gratuito para un atacante.
   */
  enrutador.get(
    '/api/salud',
    async (api) => {
      const sembrado = await api.ctx.almacen
        .leer<{ hecho: boolean }>('sistema:sembrado')
        .then((valor) => valor?.hecho === true)
        .catch(() => false);

      return json({
        estado: 'operativo',
        almacen: 'workers-kv',
        sembrado,
        cifradoConClaveDeDesarrollo: api.ctx.usaClaveDeDesarrollo,
        advertencia: api.ctx.usaClaveDeDesarrollo
          ? 'Defina el secret CLAVE_MAESTRA: los datos personales se estan cifrando con una clave publica.'
          : null,
      });
    },
    { requiereSesion: false },
  );
}
