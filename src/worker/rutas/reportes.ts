import type { Enrutador } from '../Enrutador.js';
import { ServicioReportes } from '../../aplicacion/ServicioReportes.js';
import { archivo, json } from '../http.js';
import { consultaEnumerada, consultaFecha, consultaId } from './comun.js';
import { FORMATOS_EXPORTACION, TIPOS_REPORTE } from '../../compartido/tipos.js';
import { ErrorValidacion } from '../../dominio/base/errores.js';
import type { FiltrosReporte } from '../../dominio/reportes/Reporte.js';
import type { PeticionApi } from '../Enrutador.js';

function filtrosDe(api: PeticionApi): FiltrosReporte {
  const filtros: FiltrosReporte = {};
  const desde = consultaFecha(api, 'desde');
  const hasta = consultaFecha(api, 'hasta');
  if (desde !== undefined) filtros.desde = desde;
  if (hasta !== undefined) filtros.hasta = hasta;
  const departamentoId = consultaId(api, 'departamentoId');
  if (departamentoId !== undefined) filtros.departamentoId = departamentoId;
  const proyectoId = consultaId(api, 'proyectoId');
  if (proyectoId !== undefined) filtros.proyectoId = proyectoId;
  const empleadoId = consultaId(api, 'empleadoId');
  if (empleadoId !== undefined) filtros.empleadoId = empleadoId;

  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    throw new ErrorValidacion('El rango de fechas esta invertido.', [
      { campo: 'desde', mensaje: 'No puede ser posterior a "hasta".' },
    ]);
  }
  return filtros;
}

export function registrarRutasReportes(enrutador: Enrutador): void {
  enrutador.get('/api/reportes/:tipo', async (api) => {
    // El tipo llega en la ruta, asi que se valida contra la lista blanca antes
    // de tocar nada: es lo que elige la clase de informe que se instancia.
    const tipo = api.parametros['tipo'];
    if (tipo === undefined || !TIPOS_REPORTE.includes(tipo as (typeof TIPOS_REPORTE)[number])) {
      throw new ErrorValidacion(
        `Tipo de informe desconocido. Debe ser uno de: ${TIPOS_REPORTE.join(', ')}.`,
      );
    }
    const tipoValido = tipo as (typeof TIPOS_REPORTE)[number];
    const formato = consultaEnumerada(api, 'formato', FORMATOS_EXPORTACION) ?? 'json';
    const filtros = filtrosDe(api);
    const servicio = new ServicioReportes(api.ctx);

    // `json` se devuelve como respuesta normal de la API para que el cliente
    // pueda previsualizar el informe en pantalla; el resto son descargas.
    if (formato === 'json') {
      return json(await servicio.generar(tipoValido, filtros));
    }

    const exportado = await servicio.exportar(tipoValido, formato, filtros);
    return archivo(exportado.bytes, exportado.tipoMime, exportado.nombreArchivo);
  });
}
