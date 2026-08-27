import type { Enrutador } from '../Enrutador.js';
import { ServicioRegistrosTiempo } from '../../aplicacion/ServicioRegistrosTiempo.js';
import { json, leerJson, sinContenido } from '../http.js';
import { consultaEnumerada, consultaFecha, consultaId, idDeRuta } from './comun.js';
import { ESTADOS_REGISTRO } from '../../compartido/tipos.js';
import { Esquema, campo } from '../../dominio/validacion/Esquema.js';
import { ReglaTexto } from '../../dominio/validacion/Regla.js';

const ESQUEMA_RECHAZO = new Esquema<{ motivo: string }>({
  motivo: campo(new ReglaTexto(5, 300)),
});

export function registrarRutasTiempo(enrutador: Enrutador): void {
  enrutador.get('/api/registros-tiempo', async (api) => {
    const servicio = new ServicioRegistrosTiempo(api.ctx);
    // Los filtros llegan tal cual del cliente; es el servicio quien fuerza
    // `empleadoId` al del solicitante cuando este solo puede ver lo suyo. Esa
    // comprobación NO puede vivir aquí: la capa HTTP no conoce los permisos.
    return json(
      await servicio.listar({
        empleadoId: consultaId(api, 'empleadoId'),
        proyectoId: consultaId(api, 'proyectoId'),
        desde: consultaFecha(api, 'desde'),
        hasta: consultaFecha(api, 'hasta'),
        estado: consultaEnumerada(api, 'estado', ESTADOS_REGISTRO),
      }),
    );
  });

  enrutador.post('/api/registros-tiempo', async (api) => {
    const servicio = new ServicioRegistrosTiempo(api.ctx);
    return json(await servicio.crear(await leerJson(api.peticion)), 201);
  });

  enrutador.get('/api/registros-tiempo/:id', async (api) => {
    const servicio = new ServicioRegistrosTiempo(api.ctx);
    return json(await servicio.obtener(idDeRuta(api)));
  });

  enrutador.patch('/api/registros-tiempo/:id', async (api) => {
    const servicio = new ServicioRegistrosTiempo(api.ctx);
    return json(await servicio.actualizar(idDeRuta(api), await leerJson(api.peticion)));
  });

  enrutador.delete('/api/registros-tiempo/:id', async (api) => {
    const servicio = new ServicioRegistrosTiempo(api.ctx);
    await servicio.eliminar(idDeRuta(api));
    return sinContenido();
  });

  enrutador.post('/api/registros-tiempo/:id/enviar', async (api) => {
    const servicio = new ServicioRegistrosTiempo(api.ctx);
    return json(await servicio.enviar(idDeRuta(api)));
  });

  enrutador.post('/api/registros-tiempo/:id/aprobar', async (api) => {
    const servicio = new ServicioRegistrosTiempo(api.ctx);
    return json(await servicio.aprobar(idDeRuta(api)));
  });

  enrutador.post('/api/registros-tiempo/:id/rechazar', async (api) => {
    const servicio = new ServicioRegistrosTiempo(api.ctx);
    const { motivo } = ESQUEMA_RECHAZO.validar(await leerJson(api.peticion));
    return json(await servicio.rechazar(idDeRuta(api), motivo));
  });
}
