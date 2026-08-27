import type { FormatoExportacion, ReporteDTO } from '../../../compartido/tipos.js';
import { Exportador } from './Exportador.js';

/** Sangria del JSON: el reporte se descarga y se lee a ojo, no se transporta. */
const SANGRIA = 2;

/**
 * Exportacion a JSON.
 *
 * Es el formato "sin perdida": entrega los valores crudos del `ReporteDTO` sin
 * pasarlos por `formatearCelda`, porque quien pide JSON normalmente va a
 * procesarlo con otra herramienta y necesita el numero, no "ARS 1.234,56".
 */
export class ExportadorJSON extends Exportador {
  override get formato(): FormatoExportacion {
    return 'json';
  }

  override get tipoMime(): string {
    return 'application/json; charset=utf-8';
  }

  override get extension(): string {
    return 'json';
  }

  override async exportar(reporte: ReporteDTO): Promise<Uint8Array> {
    // Se copian los campos uno a uno en vez de serializar `reporte` entero: fija
    // el orden de claves del archivo y evita que un campo agregado manana al
    // DTO (interno, o sensible) se filtre solo en la descarga.
    const contenido = {
      // `tipo` es parte del contrato de `ReporteDTO` y de nada sirve un archivo
      // "sin perdida" del que haya que deducir a que informe pertenece; ademas
      // ya viaja en el nombre del archivo, asi que no revela nada nuevo.
      tipo: reporte.tipo,
      titulo: reporte.titulo,
      descripcion: reporte.descripcion,
      generadoEn: reporte.generadoEn,
      generadoPor: reporte.generadoPor,
      columnas: reporte.columnas,
      filas: reporte.filas,
      totales: reporte.totales,
    };

    return new TextEncoder().encode(JSON.stringify(contenido, null, SANGRIA));
  }
}
