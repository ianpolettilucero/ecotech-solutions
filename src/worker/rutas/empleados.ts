import type { Enrutador } from '../Enrutador.js';
import { ServicioEmpleados } from '../../aplicacion/ServicioEmpleados.js';
import { json, leerJson, sinContenido } from '../http.js';
import { consulta, consultaBooleana, consultaEnumerada, consultaId, idDeRuta } from './comun.js';
import { TIPOS_CONTRATO } from '../../compartido/tipos.js';
import { Esquema, campo } from '../../dominio/validacion/Esquema.js';
import { ReglaIdentificador } from '../../dominio/validacion/Regla.js';

const ESQUEMA_DEPARTAMENTO = new Esquema<{ departamentoId: string | null }>({
  departamentoId: campo(new ReglaIdentificador(), { admiteNulo: true }),
});

export function registrarRutasEmpleados(enrutador: Enrutador): void {
  enrutador.get('/api/empleados', async (api) => {
    const servicio = new ServicioEmpleados(api.ctx);
    return json(
      await servicio.listar({
        departamentoId: consultaId(api, 'departamentoId'),
        activo: consultaBooleana(api, 'activo'),
        texto: consulta(api, 'texto'),
        tipoContrato: consultaEnumerada(api, 'tipoContrato', TIPOS_CONTRATO),
      }),
    );
  });

  enrutador.post('/api/empleados', async (api) => {
    const servicio = new ServicioEmpleados(api.ctx);
    return json(await servicio.crear(await leerJson(api.peticion)), 201);
  });

  enrutador.get('/api/empleados/:id', async (api) => {
    const servicio = new ServicioEmpleados(api.ctx);
    return json(await servicio.obtener(idDeRuta(api)));
  });

  enrutador.patch('/api/empleados/:id', async (api) => {
    const servicio = new ServicioEmpleados(api.ctx);
    return json(await servicio.actualizar(idDeRuta(api), await leerJson(api.peticion)));
  });

  enrutador.delete('/api/empleados/:id', async (api) => {
    const servicio = new ServicioEmpleados(api.ctx);
    await servicio.eliminar(idDeRuta(api));
    return sinContenido();
  });

  enrutador.put('/api/empleados/:id/departamento', async (api) => {
    const servicio = new ServicioEmpleados(api.ctx);
    const { departamentoId } = ESQUEMA_DEPARTAMENTO.validar(await leerJson(api.peticion));
    return json(await servicio.asignarDepartamento(idDeRuta(api), departamentoId));
  });
}
