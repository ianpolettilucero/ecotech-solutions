import type { Enrutador } from '../Enrutador.js';
import { ServicioDepartamentos } from '../../aplicacion/ServicioDepartamentos.js';
import { json, leerJson, sinContenido } from '../http.js';
import { consulta, consultaBooleana, idDeRuta } from './comun.js';

export function registrarRutasDepartamentos(enrutador: Enrutador): void {
  // Se devuelve el conteo junto con la lista en una sola respuesta: la vista lo
  // necesita siempre, y separarlo obligaría al cliente a encadenar dos viajes.
  enrutador.get('/api/departamentos', async (api) => {
    const servicio = new ServicioDepartamentos(api.ctx);
    const [departamentos, conteoEmpleados] = await Promise.all([
      servicio.listar({ activo: consultaBooleana(api, 'activo'), texto: consulta(api, 'texto') }),
      servicio.conteoEmpleados(),
    ]);
    return json({ departamentos, conteoEmpleados });
  });

  enrutador.post('/api/departamentos', async (api) => {
    const servicio = new ServicioDepartamentos(api.ctx);
    return json(await servicio.crear(await leerJson(api.peticion)), 201);
  });

  enrutador.get('/api/departamentos/:id', async (api) => {
    const servicio = new ServicioDepartamentos(api.ctx);
    return json(await servicio.obtener(idDeRuta(api)));
  });

  enrutador.patch('/api/departamentos/:id', async (api) => {
    const servicio = new ServicioDepartamentos(api.ctx);
    return json(await servicio.actualizar(idDeRuta(api), await leerJson(api.peticion)));
  });

  enrutador.delete('/api/departamentos/:id', async (api) => {
    const servicio = new ServicioDepartamentos(api.ctx);
    await servicio.eliminar(idDeRuta(api));
    return sinContenido();
  });
}
