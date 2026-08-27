import type { Enrutador } from '../Enrutador.js';
import { ServicioAsignaciones } from '../../aplicacion/ServicioAsignaciones.js';
import { json, leerJson } from '../http.js';
import { consultaBooleana, consultaFecha, consultaId, idDeRuta } from './comun.js';

export function registrarRutasAsignaciones(enrutador: Enrutador): void {
  enrutador.get('/api/asignaciones', async (api) => {
    const servicio = new ServicioAsignaciones(api.ctx);
    return json(
      await servicio.listar({
        empleadoId: consultaId(api, 'empleadoId'),
        proyectoId: consultaId(api, 'proyectoId'),
        activa: consultaBooleana(api, 'activa'),
      }),
    );
  });

  enrutador.post('/api/asignaciones', async (api) => {
    const servicio = new ServicioAsignaciones(api.ctx);
    return json(await servicio.asignar(await leerJson(api.peticion)), 201);
  });

  enrutador.patch('/api/asignaciones/:id', async (api) => {
    const servicio = new ServicioAsignaciones(api.ctx);
    return json(await servicio.actualizar(idDeRuta(api), await leerJson(api.peticion)));
  });

  // DELETE cierra la asignacion con fecha, no borra la fila: las horas cargadas
  // durante ese periodo tienen que seguir teniendo un vinculo que las explique.
  enrutador.delete('/api/asignaciones/:id', async (api) => {
    const servicio = new ServicioAsignaciones(api.ctx);
    return json(await servicio.desasignar(idDeRuta(api), consultaFecha(api, 'fecha')));
  });
}
