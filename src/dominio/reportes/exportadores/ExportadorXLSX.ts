import type {
  ColumnaReporte,
  FormatoExportacion,
  ReporteDTO,
  ValorCelda,
} from '../../../compartido/tipos.js';
import { Exportador } from './Exportador.js';

// ---------------------------------------------------------------------------
// Contenedor ZIP
// ---------------------------------------------------------------------------

const CODIFICADOR = new TextEncoder();

const FIRMA_LOCAL = 0x04034b50;
const FIRMA_CENTRAL = 0x02014b50;
const FIRMA_FIN_CENTRAL = 0x06054b50;

/** Version 2.0 del formato: la minima que admite deflate. Es la que escribe Excel. */
const VERSION_ZIP = 20;

const METODO_ALMACENADO = 0;
const METODO_DEFLATE = 8;

/**
 * 1980-01-01 00:00 ya empaquetado al vuelo MS-DOS (anio-1980 << 9 | mes << 5 | dia).
 * Es la fecha mas antigua representable en ZIP y, al ser fija, dos exportaciones
 * del mismo reporte salen identicas byte a byte: la salida se puede comparar y
 * cachear sin sorpresas.
 */
const FECHA_DOS = 0x0021;
const HORA_DOS = 0x0000;

interface EntradaZip {
  readonly nombre: string;
  /** Contenido sin comprimir; el CRC-32 del ZIP se calcula sobre estos bytes. */
  readonly datos: Uint8Array;
}

let tablaCrc32: Uint32Array | null = null;

/** La tabla es 1 KiB que la mayoria de peticiones nunca necesita: se crea al primer uso. */
function obtenerTablaCrc32(): Uint32Array {
  if (tablaCrc32 !== null) return tablaCrc32;
  const tabla = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let valor = i;
    for (let bit = 0; bit < 8; bit++) {
      valor = (valor & 1) !== 0 ? 0xedb88320 ^ (valor >>> 1) : valor >>> 1;
    }
    tabla[i] = valor >>> 0;
  }
  tablaCrc32 = tabla;
  return tabla;
}

function crc32(datos: Uint8Array): number {
  const tabla = obtenerTablaCrc32();
  let acumulado = 0xffffffff;
  for (const byte of datos) {
    // El indice va enmascarado a 8 bits y la tabla tiene 256 entradas: el `?? 0`
    // existe unicamente para satisfacer a noUncheckedIndexedAccess.
    acumulado = (acumulado >>> 8) ^ (tabla[(acumulado ^ byte) & 0xff] ?? 0);
  }
  return (acumulado ^ 0xffffffff) >>> 0;
}

function concatenar(partes: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const parte of partes) total += parte.length;
  const salida = new Uint8Array(total);
  let posicion = 0;
  for (const parte of partes) {
    salida.set(parte, posicion);
    posicion += parte.length;
  }
  return salida;
}

/**
 * Comprime con deflate *crudo* (sin envoltura zlib), que es literalmente el
 * metodo 8 del ZIP. Devuelve `null` cuando el runtime no expone
 * `CompressionStream`, para que el contenedor caiga a "stored" (metodo 0): el
 * archivo pesa mas, pero sigue siendo un .xlsx valido.
 */
async function comprimirCrudo(datos: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const flujo = new CompressionStream('deflate-raw');
    const escritor = flujo.writable.getWriter();
    // WebCrypto y los flujos exigen un `ArrayBuffer` propio, no un
    // `ArrayBufferLike` (que admitiria memoria compartida). Se copia a un buffer
    // recien creado: son fragmentos XML de pocos KiB y el coste es irrelevante
    // frente a tener que sembrar aserciones de tipo por todo el modulo.
    const entrada = new Uint8Array(new ArrayBuffer(datos.byteLength));
    entrada.set(datos);
    // La escritura no se espera aqui: quien drena el flujo es el lector de abajo,
    // y esperarla antes se bloquearia en cuanto los datos superasen el buffer
    // interno del transformador.
    const escritura = escritor.write(entrada).then(() => escritor.close());
    const lector: ReadableStreamDefaultReader<Uint8Array> = flujo.readable.getReader();
    const trozos: Uint8Array[] = [];
    for (;;) {
      const resultado = await lector.read();
      if (resultado.done) break;
      trozos.push(resultado.value);
    }
    await escritura;
    return concatenar(trozos);
  } catch {
    return null;
  }
}

/**
 * Serializa las entradas como un ZIP completo: cabecera local por entrada,
 * directorio central y End Of Central Directory.
 *
 * El crc y los dos tamanios se repiten en la cabecera local y en la central; si
 * no coinciden exactamente, Excel declara el libro danado en lugar de abrirlo.
 */
async function construirZip(entradas: readonly EntradaZip[]): Promise<Uint8Array> {
  const cuerpo: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let desplazamiento = 0;

  for (const entrada of entradas) {
    const nombre = CODIFICADOR.encode(entrada.nombre);
    const crc = crc32(entrada.datos);
    const comprimido = await comprimirCrudo(entrada.datos);
    const metodo = comprimido === null ? METODO_ALMACENADO : METODO_DEFLATE;
    const carga = comprimido ?? entrada.datos;

    const local = new Uint8Array(30 + nombre.length);
    const vistaLocal = new DataView(local.buffer);
    vistaLocal.setUint32(0, FIRMA_LOCAL, true);
    vistaLocal.setUint16(4, VERSION_ZIP, true);
    vistaLocal.setUint16(6, 0, true);
    vistaLocal.setUint16(8, metodo, true);
    vistaLocal.setUint16(10, HORA_DOS, true);
    vistaLocal.setUint16(12, FECHA_DOS, true);
    vistaLocal.setUint32(14, crc, true);
    vistaLocal.setUint32(18, carga.length, true);
    vistaLocal.setUint32(22, entrada.datos.length, true);
    vistaLocal.setUint16(26, nombre.length, true);
    vistaLocal.setUint16(28, 0, true);
    local.set(nombre, 30);

    const ficha = new Uint8Array(46 + nombre.length);
    const vistaFicha = new DataView(ficha.buffer);
    vistaFicha.setUint32(0, FIRMA_CENTRAL, true);
    vistaFicha.setUint16(4, VERSION_ZIP, true);
    vistaFicha.setUint16(6, VERSION_ZIP, true);
    vistaFicha.setUint16(8, 0, true);
    vistaFicha.setUint16(10, metodo, true);
    vistaFicha.setUint16(12, HORA_DOS, true);
    vistaFicha.setUint16(14, FECHA_DOS, true);
    vistaFicha.setUint32(16, crc, true);
    vistaFicha.setUint32(20, carga.length, true);
    vistaFicha.setUint32(24, entrada.datos.length, true);
    vistaFicha.setUint16(28, nombre.length, true);
    vistaFicha.setUint16(30, 0, true);
    vistaFicha.setUint16(32, 0, true);
    vistaFicha.setUint16(34, 0, true);
    vistaFicha.setUint16(36, 0, true);
    vistaFicha.setUint32(38, 0, true);
    vistaFicha.setUint32(42, desplazamiento, true);
    ficha.set(nombre, 46);

    cuerpo.push(local, carga);
    central.push(ficha);
    desplazamiento += local.length + carga.length;
  }

  let tamanioCentral = 0;
  for (const ficha of central) tamanioCentral += ficha.length;

  const fin = new Uint8Array(22);
  const vistaFin = new DataView(fin.buffer);
  vistaFin.setUint32(0, FIRMA_FIN_CENTRAL, true);
  vistaFin.setUint16(4, 0, true);
  vistaFin.setUint16(6, 0, true);
  vistaFin.setUint16(8, entradas.length, true);
  vistaFin.setUint16(10, entradas.length, true);
  vistaFin.setUint32(12, tamanioCentral, true);
  vistaFin.setUint32(16, desplazamiento, true);
  vistaFin.setUint16(20, 0, true);

  return concatenar([...cuerpo, ...central, fin]);
}

// ---------------------------------------------------------------------------
// Utilidades XML
// ---------------------------------------------------------------------------

/**
 * Caracteres de control que XML 1.0 prohibe incluso escapados: todo lo menor
 * que 0x20 salvo tab, LF y CR. Uno solo de ellos colado desde un campo de texto
 * deja el libro ilegible, asi que se eliminan antes de escapar. Van como
 * escapes unicode a proposito: en el fuente, los literales serian invisibles.
 */
const CONTROLES_PROHIBIDOS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

function escaparXml(texto: string): string {
  return texto
    .replace(CONTROLES_PROHIBIDOS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Indice de columna (base 0) a referencia A1: A, B, ... Z, AA, AB...
 * Es una numeracion biyectiva en base 26 (no existe un digito "cero"), de ahi
 * el -1 antes de cada division.
 */
function letrasColumna(indice: number): string {
  let restante = indice + 1;
  let letras = '';
  while (restante > 0) {
    const resto = (restante - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    restante = Math.floor((restante - 1) / 26);
  }
  return letras;
}

/** `xml:space="preserve"` evita que Excel recorte los espacios significativos. */
function celdaTexto(referencia: string, texto: string, estilo: number): string {
  return `<c r="${referencia}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(texto)}</t></is></c>`;
}

function celdaVacia(referencia: string, estilo: number): string {
  return `<c r="${referencia}" s="${estilo}"/>`;
}

// ---------------------------------------------------------------------------
// Partes fijas del paquete OOXML
// ---------------------------------------------------------------------------

const DECLARACION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

const ESPACIO_HOJA = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const ESPACIO_RELACIONES = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const TIPOS_CONTENIDO = [
  DECLARACION,
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
  '<Default Extension="xml" ContentType="application/xml"/>',
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
  '</Types>',
].join('');

const RELACIONES_RAIZ = [
  DECLARACION,
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
  `<Relationship Id="rId1" Type="${ESPACIO_RELACIONES}/officeDocument" Target="xl/workbook.xml"/>`,
  '</Relationships>',
].join('');

const RELACIONES_LIBRO = [
  DECLARACION,
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
  `<Relationship Id="rId1" Type="${ESPACIO_RELACIONES}/worksheet" Target="worksheets/sheet1.xml"/>`,
  `<Relationship Id="rId2" Type="${ESPACIO_RELACIONES}/styles" Target="styles.xml"/>`,
  '</Relationships>',
].join('');

/** Indices dentro de `<cellXfs>`; el atributo `s` de cada celda apunta aqui. */
const ESTILO_NORMAL = 0;
const ESTILO_CABECERA = 1;
const ESTILO_MONEDA = 2;
const ESTILO_FECHA = 3;
const ESTILO_TOTAL = 4;
const ESTILO_TOTAL_MONEDA = 5;

/**
 * Hoja de estilos minima pero completa: Excel exige que existan las colecciones
 * fonts/fills/borders/cellStyleXfs aunque no se usen, y que los dos primeros
 * rellenos sean justamente "none" y "gray125".
 *
 * No se referencian colores ni fuentes de tema (`theme`, `scheme`) porque el
 * paquete no incluye `theme1.xml`: una referencia colgada resuelve a colores
 * arbitrarios y hace que LibreOffice avise al abrir.
 */
const ESTILOS = [
  DECLARACION,
  `<styleSheet xmlns="${ESPACIO_HOJA}">`,
  '<numFmts count="2">',
  '<numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/>',
  '<numFmt numFmtId="165" formatCode="yyyy-mm-dd"/>',
  '</numFmts>',
  '<fonts count="2">',
  '<font><sz val="11"/><color rgb="FF1F2933"/><name val="Calibri"/><family val="2"/></font>',
  '<font><b/><sz val="11"/><color rgb="FF1F2933"/><name val="Calibri"/><family val="2"/></font>',
  '</fonts>',
  '<fills count="3">',
  '<fill><patternFill patternType="none"/></fill>',
  '<fill><patternFill patternType="gray125"/></fill>',
  '<fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill>',
  '</fills>',
  '<borders count="2">',
  '<border><left/><right/><top/><bottom/><diagonal/></border>',
  '<border><left/><right/><top/><bottom style="thin"><color rgb="FF8C8C8C"/></bottom><diagonal/></border>',
  '</borders>',
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
  '<cellXfs count="6">',
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>',
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>',
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>',
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>',
  '<xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>',
  '</cellXfs>',
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
  '<dxfs count="0"/>',
  '<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>',
  '</styleSheet>',
].join('');

const ANCHO_MINIMO = 8;
const ANCHO_MAXIMO = 60;
/** Filas que se inspeccionan para estimar el ancho. Recorrer un reporte de
 *  decenas de miles de filas para ganar un par de caracteres no compensa. */
const MUESTRA_ANCHO = 50;

/**
 * Excel prohibe `: \ / ? * [ ]` en el nombre de hoja, lo limita a 31 caracteres
 * y rechaza el apostrofo en los extremos. Un titulo de reporte no cumple nada de
 * eso por si solo, y un nombre invalido impide abrir el libro.
 */
function nombreHoja(titulo: string): string {
  const limpio = titulo
    .replace(CONTROLES_PROHIBIDOS, '')
    .replace(/[\\/:*?[\]']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31)
    .trim();
  return limpio.length > 0 ? limpio : 'Reporte';
}

// ---------------------------------------------------------------------------
// Exportador
// ---------------------------------------------------------------------------

/**
 * Exportador a XLSX real (OOXML SpreadsheetML dentro de un ZIP), sin ninguna
 * dependencia de terceros.
 *
 * Un .xlsx no es mas que un ZIP de partes XML, pero el runtime de Workers no
 * trae escritor de ZIP: el contenedor se emite a mano mas arriba y esta clase
 * se ocupa solo de generar las partes.
 *
 * Decision: no se genera `sharedStrings.xml`. Las cadenas van embebidas en la
 * celda (`t="inlineStr"`), lo que cuesta algo de tamanio pero ahorra una parte
 * entera y su tabla de deduplicacion, que no aportan nada en reportes de un
 * solo uso generados al vuelo.
 */
export class ExportadorXLSX extends Exportador {
  override get formato(): FormatoExportacion {
    return 'xlsx';
  }

  override get tipoMime(): string {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  override get extension(): string {
    return 'xlsx';
  }

  override async exportar(reporte: ReporteDTO): Promise<Uint8Array> {
    const partes: EntradaZip[] = [
      { nombre: '[Content_Types].xml', datos: CODIFICADOR.encode(TIPOS_CONTENIDO) },
      { nombre: '_rels/.rels', datos: CODIFICADOR.encode(RELACIONES_RAIZ) },
      { nombre: 'xl/workbook.xml', datos: CODIFICADOR.encode(this.construirLibro(reporte)) },
      { nombre: 'xl/_rels/workbook.xml.rels', datos: CODIFICADOR.encode(RELACIONES_LIBRO) },
      { nombre: 'xl/styles.xml', datos: CODIFICADOR.encode(ESTILOS) },
      {
        nombre: 'xl/worksheets/sheet1.xml',
        datos: CODIFICADOR.encode(this.construirHoja(reporte)),
      },
    ];
    return construirZip(partes);
  }

  private construirLibro(reporte: ReporteDTO): string {
    return [
      DECLARACION,
      `<workbook xmlns="${ESPACIO_HOJA}" xmlns:r="${ESPACIO_RELACIONES}">`,
      '<sheets>',
      `<sheet name="${escaparXml(nombreHoja(reporte.titulo))}" sheetId="1" r:id="rId1"/>`,
      '</sheets>',
      '</workbook>',
    ].join('');
  }

  /** El orden de los hijos de `<worksheet>` no es libre: el esquema exige
   *  dimension, sheetViews, sheetFormatPr, cols, sheetData y solo despues
   *  autoFilter. Alterarlo hace que Excel rechace la hoja. */
  private construirHoja(reporte: ReporteDTO): string {
    const totalColumnas = reporte.columnas.length;
    const hayTotales = Object.keys(reporte.totales).length > 0;
    const ultimaFilaDatos = 1 + reporte.filas.length;
    const ultimaFila = ultimaFilaDatos + (hayTotales ? 1 : 0);
    const ultimaColumna = totalColumnas > 0 ? letrasColumna(totalColumnas - 1) : 'A';

    const dimension = totalColumnas > 0 ? `A1:${ultimaColumna}${ultimaFila}` : 'A1';
    // El autofiltro cubre cabecera y datos pero nunca la fila de totales: si
    // entrase en el rango, Excel la ordenaria y filtraria junto al resto.
    const autofiltro =
      totalColumnas > 0 ? `<autoFilter ref="A1:${ultimaColumna}${ultimaFilaDatos}"/>` : '';

    return [
      DECLARACION,
      `<worksheet xmlns="${ESPACIO_HOJA}">`,
      `<dimension ref="${dimension}"/>`,
      '<sheetViews>',
      '<sheetView tabSelected="1" workbookViewId="0">',
      '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>',
      '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>',
      '</sheetView>',
      '</sheetViews>',
      '<sheetFormatPr defaultRowHeight="15"/>',
      this.construirAnchos(reporte),
      '<sheetData>',
      this.construirFilas(reporte, hayTotales),
      '</sheetData>',
      autofiltro,
      '</worksheet>',
    ].join('');
  }

  private construirAnchos(reporte: ReporteDTO): string {
    if (reporte.columnas.length === 0) return '';
    const columnas = reporte.columnas.map((columna, indice) => {
      let ancho = columna.titulo.length;
      const muestra = Math.min(reporte.filas.length, MUESTRA_ANCHO);
      for (let i = 0; i < muestra; i++) {
        const fila = reporte.filas[i];
        if (fila === undefined) continue;
        const valor = fila[columna.clave] ?? null;
        const largo = valor === null ? 0 : this.formatearCelda(valor, columna).length;
        if (largo > ancho) ancho = largo;
      }
      // El +2 deja aire para el desplegable del autofiltro en la cabecera.
      const ajustado = Math.min(ANCHO_MAXIMO, Math.max(ANCHO_MINIMO, ancho + 2));
      const posicion = indice + 1;
      return `<col min="${posicion}" max="${posicion}" width="${ajustado}" customWidth="1"/>`;
    });
    return `<cols>${columnas.join('')}</cols>`;
  }

  private construirFilas(reporte: ReporteDTO, hayTotales: boolean): string {
    const columnas = reporte.columnas;
    if (columnas.length === 0) return '';
    const rango = `1:${columnas.length}`;
    const filas: string[] = [];

    const cabecera = columnas
      .map((columna, indice) =>
        celdaTexto(`${letrasColumna(indice)}1`, columna.titulo, ESTILO_CABECERA),
      )
      .join('');
    filas.push(`<row r="1" spans="${rango}">${cabecera}</row>`);

    reporte.filas.forEach((fila, indiceFila) => {
      const numeroFila = indiceFila + 2;
      const celdas = columnas
        .map((columna, indice) => {
          const referencia = `${letrasColumna(indice)}${numeroFila}`;
          return this.construirCelda(referencia, fila[columna.clave] ?? null, columna, false);
        })
        .join('');
      filas.push(`<row r="${numeroFila}" spans="${rango}">${celdas}</row>`);
    });

    if (hayTotales) {
      const numeroFila = reporte.filas.length + 2;
      const celdas = columnas
        .map((columna, indice) => {
          const referencia = `${letrasColumna(indice)}${numeroFila}`;
          const valor = reporte.totales[columna.clave];
          if (valor === undefined) {
            // La primera columna (legajo, codigo, nombre...) casi nunca tiene
            // total propio; sin una etiqueta, la fila final queda huerfana.
            return indice === 0
              ? celdaTexto(referencia, 'TOTALES', ESTILO_TOTAL)
              : celdaVacia(referencia, ESTILO_TOTAL);
          }
          return this.construirCelda(referencia, valor, columna, true);
        })
        .join('');
      filas.push(`<row r="${numeroFila}" spans="${rango}">${celdas}</row>`);
    }

    return filas.join('');
  }

  /**
   * Las columnas numericas y de moneda se emiten como numero de verdad (`<v>`)
   * y se dejan formatear a la hoja de estilos: exportar el texto ya formateado
   * impediria sumar, ordenar o graficar la columna desde Excel.
   *
   * Las fechas viajan como texto pese a llevar formato de fecha aplicado: el DTO
   * las trae como cadena ISO cuya precision y zona horaria no estan
   * garantizadas, y convertirlas a numero de serie desplazaria el dia en
   * silencio.
   */
  private construirCelda(
    referencia: string,
    valor: ValorCelda,
    columna: ColumnaReporte,
    esTotal: boolean,
  ): string {
    const esNumerica = columna.tipo === 'numero' || columna.tipo === 'moneda';
    const estilo = this.estiloDeColumna(columna, esTotal);

    if (valor === null) return celdaVacia(referencia, estilo);

    // Se descartan NaN e Infinity: son texto valido en XML, pero dentro de `<v>`
    // hacen que Excel marque el libro como danado.
    if (esNumerica && typeof valor === 'number' && Number.isFinite(valor)) {
      return `<c r="${referencia}" s="${estilo}"><v>${valor}</v></c>`;
    }

    const texto = this.formatearCelda(valor, columna);
    return texto === '' ? celdaVacia(referencia, estilo) : celdaTexto(referencia, texto, estilo);
  }

  private estiloDeColumna(columna: ColumnaReporte, esTotal: boolean): number {
    if (columna.tipo === 'moneda') return esTotal ? ESTILO_TOTAL_MONEDA : ESTILO_MONEDA;
    if (esTotal) return ESTILO_TOTAL;
    return columna.tipo === 'fecha' ? ESTILO_FECHA : ESTILO_NORMAL;
  }
}
