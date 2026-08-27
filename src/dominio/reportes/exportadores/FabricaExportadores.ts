import type { FormatoExportacion } from '../../../compartido/tipos.js';
import { ErrorValidacion } from '../../base/errores.js';
import type { Exportador } from './Exportador.js';
import { ExportadorCSV } from './ExportadorCSV.js';
import { ExportadorJSON } from './ExportadorJSON.js';
import { ExportadorPDF } from './ExportadorPDF.js';
import { ExportadorXLSX } from './ExportadorXLSX.js';

/**
 * Fabrica de exportadores.
 *
 * ## Por que vive en su propio módulo y no como estático de `Exportador`
 *
 * Poner la fabrica dentro de la clase base obliga a que esta importe a sus
 * cuatro subclases, y las subclases ya importan a la base para heredar de ella.
 * Ese ciclo **no es inocuo en módulos ES**: la clausula `extends` se evalua
 * cuando se ejecuta el cuerpo del módulo, no cuando se instancia la clase. Si
 * el grafo se entra por la base, las subclases se evaluan mientras el binding
 * `Exportador` sigue en su zona muerta temporal, y el programa revienta con
 * "Cannot access 'Exportador' before initialization" en tiempo de carga.
 *
 * Separar la fabrica rompe el ciclo (base <- subclases <- fabrica, un árbol) y
 * además respeta la responsabilidad única: una abstracción no tiene por que
 * conocer el catálogo de sus implementaciones.
 *
 * El resto del sistema pide "exportame esto en xlsx" y nunca nombra una clase
 * concreta: ese es el punto de extensión polimórfico del módulo de reportes.
 * Anadir un formato es anadir una clase y un caso aquí.
 */
export class FabricaExportadores {
  static crear(formato: FormatoExportacion): Exportador {
    switch (formato) {
      case 'json':
        return new ExportadorJSON();
      case 'csv':
        return new ExportadorCSV();
      case 'xlsx':
        return new ExportadorXLSX();
      case 'pdf':
        return new ExportadorPDF();
      default:
        // El tipo no protege en tiempo de ejecución: `formato` llega de la
        // cadena de consulta, así que el caso "imposible" se valida igual.
        throw new ErrorValidacion(`Formato de exportación no soportado: "${String(formato)}".`, [
          { campo: 'formato', mensaje: 'Debe ser uno de: json, csv, xlsx, pdf.' },
        ]);
    }
  }
}
