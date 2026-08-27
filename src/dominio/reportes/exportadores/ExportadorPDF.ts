import type { FormatoExportacion, ReporteDTO } from '../../../compartido/tipos.js';
import { Exportador } from './Exportador.js';

/**
 * Generador de PDF escrito a mano.
 *
 * No hay librerias: el archivo se arma objeto por objeto (Catalogo -> Pages ->
 * Page -> Contents) con su tabla `xref` y su `trailer`. La consecuencia
 * importante es que los desplazamientos de la `xref` se miden en BYTES reales
 * del buffer, nunca en `String.length`, y que todo el cuerpo se escribe en
 * latin1: una sola secuencia UTF-8 de dos bytes desplazaria cada objeto
 * posterior y ningun lector abriria el documento.
 */

const VERSION_PDF = '1.7';

// --- Geometria de pagina (puntos PostScript, 1 pt = 1/72") -----------------
// A4 apaisado: una tabla de reporte tiene muchas mas columnas que filas
// visibles, asi que el ancho vale mas que el alto.
const ANCHO_PAGINA = 842;
const ALTO_PAGINA = 595;

const MARGEN_X = 32;
const ANCHO_UTIL = ANCHO_PAGINA - MARGEN_X * 2;

const Y_TITULO = ALTO_PAGINA - 46;
const Y_DESCRIPCION = Y_TITULO - 17;
const Y_META = Y_DESCRIPCION - 12;
const Y_SEPARADOR = Y_META - 11;
const Y_TABLA = Y_SEPARADOR - 10;

const Y_PIE = 26;
/** Ninguna fila puede bajar de aqui o pisaria el pie de pagina. */
const Y_LIMITE_TABLA = Y_PIE + 16;

const ALTO_CABECERA = 18;
const ALTO_FILA = 15;
const RELLENO_CELDA = 4;

const TAMANO_TITULO = 16;
const TAMANO_SUBTITULO = 9;
const TAMANO_TABLA = 9;
const TAMANO_PIE = 8;

/**
 * Fraccion del cuerpo de fuente que ocupa una mayuscula en Helvetica (~0.72em).
 * Sirve para centrar la linea base dentro de la fila sin metricas reales.
 */
const ALTURA_MAYUSCULA = 0.72;

const GRIS_CABECERA = 0.85;
const GRIS_ZEBRA = 0.96;
const GRIS_TOTALES = 0.9;
const GRIS_LINEA = 0.6;
const GRIS_TENUE = 0.4;
const NEGRO = 0;

const ANCHO_MINIMO_COLUMNA = 34;
/** Holgura al medir: absorbe el error de coma flotante, invisible al imprimir. */
const TOLERANCIA_ANCHO = 0.01;
const PUNTOS_SUSPENSIVOS = '...';
const ETIQUETA_TOTALES = 'TOTALES';
const PIE_IZQUIERDA = 'EcoTech Solutions - Documento interno';
const MENSAJE_SIN_DATOS = 'Sin registros para mostrar.';

/** Filas de datos que entran por pagina, descontando cabecera y pie. */
const FILAS_POR_PAGINA = Math.max(
  1,
  Math.floor((Y_TABLA - Y_LIMITE_TABLA - ALTO_CABECERA) / ALTO_FILA),
);

// --- Numeracion de objetos --------------------------------------------------
const ID_CATALOGO = 1;
const ID_PAGINAS = 2;
const ID_FUENTE_NORMAL = 3;
const ID_FUENTE_NEGRITA = 4;
const ID_INFO = 5;
/** Cada pagina consume dos objetos: el diccionario /Page y su flujo /Contents. */
const ID_PRIMERA_PAGINA = 6;
const OBJETOS_POR_PAGINA = 2;

// ---------------------------------------------------------------------------
// Metricas de las fuentes base14
// ---------------------------------------------------------------------------

/**
 * Anchos de glifo de Helvetica en milesimas de em, para los codigos 32..126.
 * Son los valores del AFM oficial: sin ellos no se puede saber si un texto
 * entra en su columna ni centrar el numero de pagina.
 */
const ANCHOS_HELVETICA: readonly number[] = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333,
  389, 584, 278, 333, 278, 278, 556, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778,
  722, 278, 500, 667, 556, 833, 722, 778, 667, 778,
  722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556,
  278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
];

/** Idem para Helvetica-Bold: la cabecera y los totales van en negrita. */
const ANCHOS_HELVETICA_NEGRITA: readonly number[] = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333,
  389, 584, 278, 333, 278, 278, 556, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 333, 333, 584, 584,
  584, 611, 975, 722, 722, 722, 722, 667, 611, 778,
  722, 278, 556, 722, 611, 833, 722, 778, 667, 778,
  722, 667, 611, 722, 667, 944, 667, 667, 611, 333,
  278, 333, 584, 556, 333, 556, 611, 556, 611, 556,
  333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556,
  500, 389, 280, 389, 584,
];

const PRIMER_CODIGO_MEDIDO = 32;
const ULTIMO_CODIGO_MEDIDO = 126;
/** Ancho supuesto para lo que no esta tabulado (ligaduras, simbolos WinAnsi). */
const ANCHO_GLIFO_POR_DEFECTO = 500;

/**
 * Anchos de la mitad alta de WinAnsi (0xA0..0xFF) deducidos de su letra base.
 *
 * Importa aqui mas que en otros sistemas: los datos son nombres en espanol, y
 * medir cada acentuada con el ancho por defecto desviaba hasta 222 milesimas
 * por glifo (una 'N con virgulilla' mide 722, no 500), asi que una celda en
 * mayusculas se juzgaba mas corta de lo que es y se pintaba invadiendo la
 * columna vecina en vez de recortarse.
 *
 * En Helvetica el glifo acentuado mide exactamente lo que la letra sin acento,
 * de modo que descomponer en NFD da el ancho real sin arrastrar una segunda
 * tabla AFM. Se resuelve una sola vez al cargar el modulo: cada celda se mide
 * varias veces (demanda de ancho, recorte y alineacion a la derecha) y
 * normalizar por caracter costaria mas que la tabla entera.
 */
function deducirAnchosAltos(tabla: readonly number[]): ReadonlyMap<number, number> {
  const deducidos = new Map<number, number>();
  for (let codigo = 0xa0; codigo <= 0xff; codigo += 1) {
    const base = String.fromCharCode(codigo).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Las ligaduras y los simbolos no se descomponen en una letra unica: para
    // ellos el ancho por defecto sigue siendo la mejor conjetura disponible.
    if (base.length !== 1) continue;
    const codigoBase = base.charCodeAt(0);
    if (codigoBase < PRIMER_CODIGO_MEDIDO || codigoBase > ULTIMO_CODIGO_MEDIDO) continue;
    const ancho = tabla[codigoBase - PRIMER_CODIGO_MEDIDO];
    if (ancho !== undefined) deducidos.set(codigo, ancho);
  }
  return deducidos;
}

const ANCHOS_ALTOS_HELVETICA = deducirAnchosAltos(ANCHOS_HELVETICA);
const ANCHOS_ALTOS_HELVETICA_NEGRITA = deducirAnchosAltos(ANCHOS_HELVETICA_NEGRITA);

// ---------------------------------------------------------------------------
// Texto: WinAnsi, escapado y medicion
// ---------------------------------------------------------------------------

/**
 * Signos tipograficos frecuentes que no existen en Latin-1 y si tienen un
 * equivalente ASCII razonable. Llegan copiados desde Word o desde un editor
 * con comillas inteligentes, asi que reemplazarlos evita llenar el reporte de
 * interrogantes.
 */
const SUSTITUCIONES: Record<string, string> = {
  '\u2018': "'",
  '\u2019': "'",
  '\u201a': "'",
  '\u201c': '"',
  '\u201d': '"',
  '\u201e': '"',
  '\u2013': '-',
  '\u2014': '-',
  '\u2212': '-',
  '\u2022': '-',
  '\u2026': '...',
  '\u00a0': ' ',
  '\u20ac': 'EUR',
  '\u2122': '(TM)',
};

/** `true` si el codigo se puede escribir tal cual bajo /WinAnsiEncoding. */
function esImprimibleWinAnsi(codigo: number): boolean {
  // 0x80..0x9F queda fuera a proposito: ahi WinAnsi y Latin-1 discrepan y el
  // resultado seria un glifo distinto del que traia el dato.
  return (codigo >= 0x20 && codigo <= 0x7e) || (codigo >= 0xa0 && codigo <= 0xff);
}

/**
 * Lleva cualquier cadena al repertorio /WinAnsiEncoding: lo que no existe en
 * la codificacion se translitera quitando diacriticos y, si aun asi no entra,
 * se degrada a '?' antes que corromper el flujo de contenido.
 */
function aWinAnsi(texto: string): string {
  let salida = '';
  for (const caracter of texto) {
    const codigo = caracter.codePointAt(0) ?? 0;

    // Tabulaciones y saltos de linea romperian la fila de la tabla.
    if (codigo === 0x09 || codigo === 0x0a || codigo === 0x0d) {
      salida += ' ';
      continue;
    }
    // La sustitucion se consulta ANTES del filtro de repertorio, y no despues,
    // por un solo caracter: el espacio duro (U+00A0) que `Intl` intercala entre
    // "ARS" y el importe si pertenece a WinAnsi, asi que preguntando primero
    // por el repertorio jamas llegaba al mapa. Se colaba entonces un 0xA0 cuyo
    // ancho no esta tabulado y cuyo glifo depende de una nota al pie de la
    // especificacion; un espacio normal no depende de nada.
    const sustituto = SUSTITUCIONES[caracter];
    if (sustituto !== undefined) {
      salida += sustituto;
      continue;
    }

    if (esImprimibleWinAnsi(codigo)) {
      salida += caracter;
      continue;
    }

    // NFD separa la letra de su marca combinante (U+0300..U+036F); lo que queda
    // suele ser la letra latina base, que si existe en WinAnsi.
    const base = caracter.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let transliterado = '';
    for (let indice = 0; indice < base.length; indice += 1) {
      transliterado += esImprimibleWinAnsi(base.charCodeAt(indice)) ? base.charAt(indice) : '';
    }
    salida += transliterado === '' ? '?' : transliterado;
  }
  return salida;
}

/** Escapado de cadena literal PDF: solo '\', '(' y ')' son especiales. */
function escaparCadena(texto: string): string {
  return texto.replace(/[\\()]/g, (caracter) => `\\${caracter}`);
}

/** Ancho de un caracter ya normalizado a WinAnsi, en puntos. */
function anchoCaracter(caracter: string, tamano: number, negrita: boolean): number {
  const codigo = caracter.charCodeAt(0);
  const tabla = negrita ? ANCHOS_HELVETICA_NEGRITA : ANCHOS_HELVETICA;
  const altos = negrita ? ANCHOS_ALTOS_HELVETICA_NEGRITA : ANCHOS_ALTOS_HELVETICA;
  const medido =
    codigo >= PRIMER_CODIGO_MEDIDO && codigo <= ULTIMO_CODIGO_MEDIDO
      ? tabla[codigo - PRIMER_CODIGO_MEDIDO]
      : altos.get(codigo);
  return ((medido ?? ANCHO_GLIFO_POR_DEFECTO) * tamano) / 1000;
}

function anchoTexto(texto: string, tamano: number, negrita: boolean): number {
  let total = 0;
  for (let indice = 0; indice < texto.length; indice += 1) {
    total += anchoCaracter(texto.charAt(indice), tamano, negrita);
  }
  return total;
}

/** Recorta con puntos suspensivos lo que no entra en el ancho disponible. */
function recortar(texto: string, anchoMaximo: number, tamano: number, negrita: boolean): string {
  if (anchoMaximo <= 0) return '';

  // El ancho disponible llega de sumar y restar rellenos en coma flotante, asi
  // que un texto que encaja exacto puede quedar 0.000001 pt por encima. Sin
  // esta tolerancia una cabecera perfectamente medida acaba como "Acti...".
  const limite = anchoMaximo + TOLERANCIA_ANCHO;
  if (anchoTexto(texto, tamano, negrita) <= limite) return texto;

  const anchoPuntos = anchoTexto(PUNTOS_SUSPENSIVOS, tamano, negrita);
  if (anchoPuntos > limite) return '';

  let recorte = '';
  let acumulado = 0;
  for (let indice = 0; indice < texto.length; indice += 1) {
    const caracter = texto.charAt(indice);
    const ancho = anchoCaracter(caracter, tamano, negrita);
    if (acumulado + ancho + anchoPuntos > limite) break;
    recorte += caracter;
    acumulado += ancho;
  }
  return recorte + PUNTOS_SUSPENSIVOS;
}

// ---------------------------------------------------------------------------
// Utilidades de bajo nivel del formato
// ---------------------------------------------------------------------------

/**
 * Cadena latin1 -> bytes, un byte por unidad de codigo.
 *
 * Deliberadamente NO se usa `TextEncoder`: codificaria en UTF-8 y cada
 * caracter no ASCII sumaria bytes invisibles que invalidarian la `xref`.
 */
function aBytesLatin1(texto: string): Uint8Array {
  const bytes = new Uint8Array(texto.length);
  for (let indice = 0; indice < texto.length; indice += 1) {
    bytes[indice] = texto.charCodeAt(indice) & 0xff;
  }
  return bytes;
}

/** Numero para el flujo de contenido: sin notacion exponencial, que el PDF no admite. */
function num(valor: number): string {
  if (!Number.isFinite(valor)) return '0';
  const redondeado = Math.round(valor * 100) / 100;
  return Object.is(redondeado, -0) ? '0' : String(redondeado);
}

/** "2026-08-27T14:32:10Z" -> "27/08/2026 14:32"; si no es ISO, se deja igual. */
function fechaLegible(iso: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(iso);
  if (partes === null) return iso;
  const [, anio = '', mes = '', dia = '', hora = '', minuto = ''] = partes;
  return `${dia}/${mes}/${anio} ${hora}:${minuto}`;
}

/** Fecha del diccionario /Info, en el formato "D:AAAAMMDDHHmmSSZ". */
function fechaPdf(iso: string): string {
  const marca = Date.parse(iso);
  const fecha = Number.isNaN(marca) ? new Date() : new Date(marca);
  const dosDigitos = (valor: number): string => String(valor).padStart(2, '0');
  return (
    `D:${fecha.getUTCFullYear()}${dosDigitos(fecha.getUTCMonth() + 1)}` +
    `${dosDigitos(fecha.getUTCDate())}${dosDigitos(fecha.getUTCHours())}` +
    `${dosDigitos(fecha.getUTCMinutes())}${dosDigitos(fecha.getUTCSeconds())}Z`
  );
}

// ---------------------------------------------------------------------------
// Ordenes del flujo de contenido
// ---------------------------------------------------------------------------

/** Texto en una linea base dada. `g` fija el gris de relleno, que es el del texto. */
function ordenTexto(
  x: number,
  y: number,
  texto: string,
  tamano: number,
  negrita: boolean,
  gris: number,
): string {
  const fuente = negrita ? '/F2' : '/F1';
  return (
    `${num(gris)} g BT ${fuente} ${num(tamano)} Tf ` +
    `${num(x)} ${num(y)} Td (${escaparCadena(texto)}) Tj ET`
  );
}

function ordenRectangulo(x: number, y: number, ancho: number, alto: number, gris: number): string {
  return `${num(gris)} g ${num(x)} ${num(y)} ${num(ancho)} ${num(alto)} re f`;
}

function ordenLinea(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  grosor: number,
  gris: number,
): string {
  return (
    `${num(gris)} G ${num(grosor)} w ` +
    `${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`
  );
}

// ---------------------------------------------------------------------------
// Modelo interno de la tabla
// ---------------------------------------------------------------------------

interface FilaTabla {
  celdas: string[];
  /** La fila de totales se pinta distinto y va en negrita. */
  esTotal: boolean;
}

interface DisenoTabla {
  encabezados: string[];
  anchos: number[];
  /** Borde izquierdo acumulado de cada columna. */
  izquierdas: number[];
  /** Numeros e importes se alinean a la derecha para poder compararlos a ojo. */
  derecha: boolean[];
}

/**
 * Reparte el ancho util entre las columnas.
 *
 * El ancho que pide cada columna es el de su contenido mas largo, con un techo
 * por columna: sin el, una descripcion libre dejaria al resto en dos
 * milimetros. Solo las columnas de texto son elasticas, y es la decision de
 * fondo: un texto recortado sigue siendo legible, pero un importe o una fecha
 * a los que les falta el final no son "menos dato", son un dato falso. Asi que
 * lo rigido cobra primero y el sobrante se reparte entre el texto en
 * proporcion a lo que pedia. Si lo rigido no deja sitio suficiente se cae al
 * reparto proporcional puro, que al menos no descuadra la tabla.
 */
function calcularAnchos(
  encabezados: string[],
  cuerpo: FilaTabla[],
  elasticas: boolean[],
): number[] {
  const cantidad = encabezados.length;
  if (cantidad === 0) return [];

  const demandas = encabezados.map(
    (titulo) => anchoTexto(titulo, TAMANO_TABLA, true) + RELLENO_CELDA * 2,
  );
  for (const fila of cuerpo) {
    for (let indice = 0; indice < cantidad; indice += 1) {
      const ancho =
        anchoTexto(fila.celdas[indice] ?? '', TAMANO_TABLA, fila.esTotal) + RELLENO_CELDA * 2;
      if (ancho > (demandas[indice] ?? 0)) demandas[indice] = ancho;
    }
  }

  // El techo evita que una descripcion libre de 400 caracteres se lleve media
  // hoja solo porque "la pidio".
  const techo = Math.max(ANCHO_UTIL * 0.3, ANCHO_UTIL / cantidad);
  const acotadas = demandas.map((demanda) => Math.min(demanda, techo));

  const indicesRigidos: number[] = [];
  const indicesElasticos: number[] = [];
  for (let indice = 0; indice < cantidad; indice += 1) {
    if (elasticas[indice] === true) indicesElasticos.push(indice);
    else indicesRigidos.push(indice);
  }

  const demandaRigida = indicesRigidos.reduce((suma, i) => suma + (acotadas[i] ?? 0), 0);
  const salida = new Array<number>(cantidad).fill(0);

  // Caso normal: lo rigido cobra su demanda completa y lo elastico se reparte
  // el resto. Un importe o una fecha a los que les falta el final no son "menos
  // dato", son un dato falso; un texto recortado sigue siendo legible.
  if (demandaRigida + indicesElasticos.length * ANCHO_MINIMO_COLUMNA <= ANCHO_UTIL) {
    for (const i of indicesRigidos) salida[i] = acotadas[i] ?? 0;
    const reparto = repartirEquitativo(
      indicesElasticos.map((i) => acotadas[i] ?? 0),
      ANCHO_UTIL - demandaRigida,
      ANCHO_MINIMO_COLUMNA,
    );
    indicesElasticos.forEach((i, k) => {
      salida[i] = reparto[k] ?? ANCHO_MINIMO_COLUMNA;
    });
    return salida;
  }

  // Ni siquiera lo rigido entra (demasiadas columnas): se reparte todo junto.
  return repartirEquitativo(acotadas, ANCHO_UTIL, ANCHO_MINIMO_COLUMNA);
}

/**
 * Reparto equitativo maximo-minimo ("water-filling").
 *
 * Es la correccion de un fallo real: repartir el ancho *en proporcion a la
 * demanda* parece justo, pero encoge a todos por igual, incluidas las columnas
 * que ya cabian holgadas. Con once columnas y una de texto libre, el factor de
 * escala bajaba a 0,63 y un legajo de diez caracteres se imprimia como
 * "ECO-...": la tabla quedaba formalmente correcta y practicamente inservible.
 *
 * Este reparto, en cambio, atiende primero a quien pide poco. Recorre las
 * demandas de menor a mayor y da a cada columna la suya entera mientras no
 * supere la cuota que le tocaria a partes iguales del espacio que queda; en
 * cuanto una la supera, ella y todas las siguientes (que piden mas) se llevan
 * exactamente esa cuota. El resultado es que las columnas cortas salen intactas
 * y el recorte lo absorben unicamente las largas, que es donde no duele.
 */
function repartirEquitativo(
  demandas: number[],
  disponible: number,
  minimo: number,
): number[] {
  const cantidad = demandas.length;
  if (cantidad === 0) return [];
  // Si no hay sitio ni para el minimo, no queda mas que repartir a partes
  // iguales: cualquier otra cosa descuadraria el ancho de la tabla.
  if (disponible <= cantidad * minimo) return demandas.map(() => disponible / cantidad);

  const orden = demandas
    .map((_, indice) => indice)
    .sort((a, b) => (demandas[a] ?? 0) - (demandas[b] ?? 0));

  const salida = new Array<number>(cantidad).fill(minimo);
  let restante = disponible;
  let quedan = cantidad;

  for (const indice of orden) {
    const cuota = restante / quedan;
    const demanda = Math.max(demandas[indice] ?? 0, minimo);
    const asignado = demanda <= cuota ? demanda : cuota;
    salida[indice] = asignado;
    restante -= asignado;
    quedan -= 1;
  }

  return salida;
}

/** Ordenes de texto de una fila completa, ya recortadas y alineadas. */
function celdasDeFila(
  diseno: DisenoTabla,
  celdas: string[],
  base: number,
  alto: number,
  negrita: boolean,
): string[] {
  const lineaBase = base + (alto - TAMANO_TABLA * ALTURA_MAYUSCULA) / 2;
  const ordenes: string[] = [];

  for (let indice = 0; indice < diseno.anchos.length; indice += 1) {
    const ancho = diseno.anchos[indice] ?? 0;
    const izquierda = diseno.izquierdas[indice] ?? MARGEN_X;
    const texto = recortar(
      celdas[indice] ?? '',
      ancho - RELLENO_CELDA * 2,
      TAMANO_TABLA,
      negrita,
    );
    if (texto === '') continue;

    const x =
      diseno.derecha[indice] === true
        ? izquierda + ancho - RELLENO_CELDA - anchoTexto(texto, TAMANO_TABLA, negrita)
        : izquierda + RELLENO_CELDA;
    ordenes.push(ordenTexto(x, lineaBase, texto, TAMANO_TABLA, negrita, NEGRO));
  }
  return ordenes;
}

// ---------------------------------------------------------------------------
// Exportador
// ---------------------------------------------------------------------------

/**
 * Exportacion a PDF 1.7 con fuentes base14 (no incrustadas), pensada para
 * imprimir o adjuntar: A4 apaisado, cabecera de tabla repetida en cada pagina,
 * zebra para seguir la fila con la vista y totales al final del listado.
 */
export class ExportadorPDF extends Exportador {
  override get formato(): FormatoExportacion {
    return 'pdf';
  }

  override get tipoMime(): string {
    return 'application/pdf';
  }

  override get extension(): string {
    return 'pdf';
  }

  override async exportar(reporte: ReporteDTO): Promise<Uint8Array> {
    const encabezados = reporte.columnas.map((columna) => aWinAnsi(columna.titulo));
    const cuerpo = this.construirCuerpo(reporte);

    const anchos = calcularAnchos(
      encabezados,
      cuerpo,
      reporte.columnas.map((columna) => columna.tipo === 'texto'),
    );
    const izquierdas: number[] = [];
    let acumulado = MARGEN_X;
    for (const ancho of anchos) {
      izquierdas.push(acumulado);
      acumulado += ancho;
    }

    const diseno: DisenoTabla = {
      encabezados,
      anchos,
      izquierdas,
      derecha: reporte.columnas.map(
        (columna) => columna.tipo === 'numero' || columna.tipo === 'moneda',
      ),
    };

    const paginas: FilaTabla[][] = [];
    for (let inicio = 0; inicio < cuerpo.length; inicio += FILAS_POR_PAGINA) {
      paginas.push(cuerpo.slice(inicio, inicio + FILAS_POR_PAGINA));
    }
    // Un reporte vacio sigue siendo un documento: cabecera, mensaje y pie.
    if (paginas.length === 0) paginas.push([]);

    const cuerposObjeto = this.construirObjetos(reporte, diseno, paginas);
    return this.ensamblar(cuerposObjeto);
  }

  /**
   * Aplana el reporte a filas de texto ya formateadas. La fila de totales se
   * suma al mismo flujo en vez de tratarse aparte: asi cae sola al final de la
   * ultima pagina y, si esa pagina esta llena, la paginacion le abre una nueva
   * con su cabecera en lugar de dejarla fuera del papel.
   */
  private construirCuerpo(reporte: ReporteDTO): FilaTabla[] {
    const cuerpo: FilaTabla[] = reporte.filas.map((fila) => ({
      celdas: reporte.columnas.map((columna) =>
        aWinAnsi(this.formatearCelda(fila[columna.clave] ?? null, columna)),
      ),
      esTotal: false,
    }));

    if (Object.keys(reporte.totales).length > 0) {
      cuerpo.push({
        celdas: reporte.columnas.map((columna, indice) =>
          // La etiqueta pisa la primera columna aunque tenga total propio: sin
          // ella la ultima fila parece un registro mas del listado.
          indice === 0
            ? ETIQUETA_TOTALES
            : aWinAnsi(this.formatearCelda(reporte.totales[columna.clave] ?? null, columna)),
        ),
        esTotal: true,
      });
    }
    return cuerpo;
  }

  /** Cuerpos de todos los objetos, en orden estricto de numero de objeto. */
  private construirObjetos(
    reporte: ReporteDTO,
    diseno: DisenoTabla,
    paginas: FilaTabla[][],
  ): string[] {
    const idsPagina = paginas.map((_, i) => ID_PRIMERA_PAGINA + i * OBJETOS_POR_PAGINA);
    const hijos = idsPagina.map((id) => `${id} 0 R`).join(' ');
    const recursos = `<< /Font << /F1 ${ID_FUENTE_NORMAL} 0 R /F2 ${ID_FUENTE_NEGRITA} 0 R >> >>`;

    const objetos: string[] = [
      envolver(ID_CATALOGO, `<< /Type /Catalog /Pages ${ID_PAGINAS} 0 R >>`),
      envolver(ID_PAGINAS, `<< /Type /Pages /Count ${paginas.length} /Kids [${hijos}] >>`),
      envolver(ID_FUENTE_NORMAL, fuenteBase14('Helvetica')),
      envolver(ID_FUENTE_NEGRITA, fuenteBase14('Helvetica-Bold')),
      envolver(
        ID_INFO,
        `<< /Title (${escaparCadena(aWinAnsi(reporte.titulo))})` +
          ` /Author (${escaparCadena(aWinAnsi(reporte.generadoPor))})` +
          ' /Creator (EcoTech Solutions) /Producer (EcoTech Solutions)' +
          ` /CreationDate (${fechaPdf(reporte.generadoEn)}) >>`,
      ),
    ];

    for (let indice = 0; indice < paginas.length; indice += 1) {
      const idPagina = idsPagina[indice] ?? ID_PRIMERA_PAGINA;
      const idContenido = idPagina + 1;
      objetos.push(
        envolver(
          idPagina,
          `<< /Type /Page /Parent ${ID_PAGINAS} 0 R` +
            ` /MediaBox [0 0 ${ANCHO_PAGINA} ${ALTO_PAGINA}]` +
            ` /Resources ${recursos} /Contents ${idContenido} 0 R >>`,
        ),
      );
      objetos.push(
        envolverFlujo(
          idContenido,
          this.contenidoPagina(reporte, diseno, paginas[indice] ?? [], indice + 1, paginas.length),
        ),
      );
    }
    return objetos;
  }

  /** Flujo de contenido de una pagina: cabecera, tabla y pie. */
  private contenidoPagina(
    reporte: ReporteDTO,
    diseno: DisenoTabla,
    filas: FilaTabla[],
    numeroPagina: number,
    totalPaginas: number,
  ): string {
    const ordenes: string[] = [];

    const titulo = recortar(aWinAnsi(reporte.titulo), ANCHO_UTIL, TAMANO_TITULO, true);
    ordenes.push(ordenTexto(MARGEN_X, Y_TITULO, titulo, TAMANO_TITULO, true, NEGRO));

    const descripcion = aWinAnsi(reporte.descripcion);
    if (descripcion !== '') {
      ordenes.push(
        ordenTexto(
          MARGEN_X,
          Y_DESCRIPCION,
          recortar(descripcion, ANCHO_UTIL, TAMANO_SUBTITULO, false),
          TAMANO_SUBTITULO,
          false,
          GRIS_TENUE,
        ),
      );
    }

    const meta = aWinAnsi(
      `Generado: ${fechaLegible(reporte.generadoEn)}  |  Por: ${reporte.generadoPor}`,
    );
    ordenes.push(
      ordenTexto(
        MARGEN_X,
        Y_META,
        recortar(meta, ANCHO_UTIL, TAMANO_SUBTITULO, false),
        TAMANO_SUBTITULO,
        false,
        GRIS_TENUE,
      ),
    );
    ordenes.push(
      ordenLinea(MARGEN_X, Y_SEPARADOR, MARGEN_X + ANCHO_UTIL, Y_SEPARADOR, 0.8, GRIS_LINEA),
    );

    ordenes.push(...this.ordenesTabla(diseno, filas));

    ordenes.push(
      ordenLinea(MARGEN_X, Y_PIE + 12, MARGEN_X + ANCHO_UTIL, Y_PIE + 12, 0.5, 0.75),
    );
    ordenes.push(ordenTexto(MARGEN_X, Y_PIE, PIE_IZQUIERDA, TAMANO_PIE, false, GRIS_TENUE));

    const numeracion = `Pagina ${numeroPagina} de ${totalPaginas}`;
    const xNumeracion = (ANCHO_PAGINA - anchoTexto(numeracion, TAMANO_PIE, false)) / 2;
    ordenes.push(ordenTexto(xNumeracion, Y_PIE, numeracion, TAMANO_PIE, false, GRIS_TENUE));

    return ordenes.join('\n');
  }

  private ordenesTabla(diseno: DisenoTabla, filas: FilaTabla[]): string[] {
    if (diseno.encabezados.length === 0 || filas.length === 0) {
      const y = Y_TABLA - ALTO_FILA;
      return [ordenTexto(MARGEN_X, y, MENSAJE_SIN_DATOS, TAMANO_TABLA, false, GRIS_TENUE)];
    }

    const ordenes: string[] = [];

    // La cabecera se repite en cada pagina: una tabla partida sin encabezados
    // obliga a volver a la primera hoja para saber que columna se esta leyendo.
    ordenes.push(
      ordenRectangulo(MARGEN_X, Y_TABLA - ALTO_CABECERA, ANCHO_UTIL, ALTO_CABECERA, GRIS_CABECERA),
    );
    ordenes.push(
      ...celdasDeFila(diseno, diseno.encabezados, Y_TABLA - ALTO_CABECERA, ALTO_CABECERA, true),
    );

    let tope = Y_TABLA - ALTO_CABECERA;
    for (let indice = 0; indice < filas.length; indice += 1) {
      const fila = filas[indice];
      if (fila === undefined) continue;
      const base = tope - ALTO_FILA;

      if (fila.esTotal) {
        ordenes.push(ordenRectangulo(MARGEN_X, base, ANCHO_UTIL, ALTO_FILA, GRIS_TOTALES));
        ordenes.push(ordenLinea(MARGEN_X, tope, MARGEN_X + ANCHO_UTIL, tope, 0.8, GRIS_LINEA));
      } else if (indice % 2 === 1) {
        ordenes.push(ordenRectangulo(MARGEN_X, base, ANCHO_UTIL, ALTO_FILA, GRIS_ZEBRA));
      }

      ordenes.push(...celdasDeFila(diseno, fila.celdas, base, ALTO_FILA, fila.esTotal));
      tope = base;
    }
    return ordenes;
  }

  /**
   * Escribe cabecera, objetos, `xref` y `trailer` midiendo los bytes emitidos.
   *
   * El contador se lleva sobre el buffer y no sobre las cadenas porque es la
   * unica forma de que los desplazamientos de la `xref` apunten de verdad al
   * "N 0 obj" correspondiente.
   */
  private ensamblar(objetos: string[]): Uint8Array {
    const piezas: Uint8Array[] = [];
    let total = 0;

    const escribir = (texto: string): void => {
      const bytes = aBytesLatin1(texto);
      piezas.push(bytes);
      total += bytes.length;
    };

    escribir(`%PDF-${VERSION_PDF}\n`);
    // Comentario con cuatro bytes altos: marca el archivo como binario para que
    // las herramientas de transferencia no lo traten como texto y lo mutilen.
    escribir('%\u00e2\u00e3\u00cf\u00d3\n');

    // `objetos` viene en orden 1..N, asi que el i-esimo desplazamiento anotado
    // es exactamente el del objeto i+1 en la tabla.
    const desplazamientos: number[] = [];
    for (const objeto of objetos) {
      desplazamientos.push(total);
      escribir(objeto);
    }

    const inicioXref = total;
    const tamano = objetos.length + 1;
    escribir(`xref\n0 ${tamano}\n`);
    // Cada entrada mide exactamente 20 bytes, incluido el espacio antes del salto.
    escribir('0000000000 65535 f \n');
    for (const desplazamiento of desplazamientos) {
      escribir(`${String(desplazamiento).padStart(10, '0')} 00000 n \n`);
    }

    escribir(
      `trailer\n<< /Size ${tamano} /Root ${ID_CATALOGO} 0 R /Info ${ID_INFO} 0 R >>\n` +
        `startxref\n${inicioXref}\n%%EOF\n`,
    );

    const salida = new Uint8Array(total);
    let posicion = 0;
    for (const pieza of piezas) {
      salida.set(pieza, posicion);
      posicion += pieza.length;
    }
    return salida;
  }
}

/** Objeto indirecto con su envoltura "N 0 obj ... endobj". */
function envolver(id: number, contenido: string): string {
  return `${id} 0 obj\n${contenido}\nendobj\n`;
}

/**
 * Flujo sin comprimir. /Length se mide en bytes reales del cuerpo: si mintiera,
 * el lector cortaria el contenido a mitad de una orden de dibujo.
 */
function envolverFlujo(id: number, contenido: string): string {
  const longitud = aBytesLatin1(contenido).length;
  return `${id} 0 obj\n<< /Length ${longitud} >>\nstream\n${contenido}\nendstream\nendobj\n`;
}

/** Fuente base14: no se incrusta nada, el lector ya tiene las metricas. */
function fuenteBase14(nombre: string): string {
  return (
    `<< /Type /Font /Subtype /Type1 /BaseFont /${nombre}` +
    ' /Encoding /WinAnsiEncoding >>'
  );
}
