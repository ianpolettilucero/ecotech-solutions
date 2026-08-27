import type { Enrutador } from '../Enrutador.js';
import { ServicioProyectos } from '../../aplicacion/ServicioProyectos.js';
import { json, leerJson, sinContenido } from '../http.js';
import { consulta, consultaEnumerada, consultaId, idDeRuta } from './comun.js';
import { ESTADOS_PROYECTO } from '../../compartido/tipos.js';
import { Esquema, campo } from '../../dominio/validacion/Esquema.js';
import { ReglaEnumerado } from '../../dominio/validacion/Regla.js';
import type { EstadoProyecto } from '../../compartido/tipos.js';

const ESQUEMA_ESTADO = new Esquema<{ estado: EstadoProyecto }>({
  estado: campo(new ReglaEnumerado(ESTADOS_PROYECTO)),
});

export function registrarRutasProyectos(enrutador: Enrutador): void {
  enrutador.get('/api/proyectos', async (api) => {
    const servicio = new ServicioProyectos(api.ctx);
    const [proyectos, horasPorProyecto] = await Promise.all([
      servicio.listar({
        estado: consultaEnumerada(api, 'estado', ESTADOS_PROYECTO),
        departamentoId: consultaId(api, 'departamentoId'),
        texto: consulta(api, 'texto'),
      }),
      servicio.horasPorProyecto(),
    ]);
    return json({ proyectos, horasPorProyecto });
  });

  enrutador.post('/api/proyectos', async (api) => {
    const servicio = new ServicioProyectos(api.ctx);
    return json(await servicio.crear(await leerJson(api.peticion)), 201);
  });

  enrutador.get('/api/proyectos/:id', async (api) => {
    const servicio = new ServicioProyectos(api.ctx);
    return json(await servicio.obtener(idDeRuta(api)));
  });

  enrutador.patch('/api/proyectos/:id', async (api) => {
    const servicio = new ServicioProyectos(api.ctx);
    return json(await servicio.actualizar(idDeRuta(api), await leerJson(api.peticion)));
  });

  enrutador.put('/api/proyectos/:id/estado', async (api) => {
    const servicio = new ServicioProyectos(api.ctx);
    const { estado } = ESQUEMA_ESTADO.validar(await leerJson(api.peticion));
    return json(await servicio.cambiarEstado(idDeRuta(api), estado));
  });

  enrutador.delete('/api/proyectos/:id', async (api) => {
    const servicio = new ServicioProyectos(api.ctx);
    await servicio.eliminar(idDeRuta(api));
    return sinContenido();
  });
}
