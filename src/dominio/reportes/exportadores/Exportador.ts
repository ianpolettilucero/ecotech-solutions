import type {
  ColumnaReporte,
  FormatoExportacion,
  ReporteDTO,
  ValorCelda,
} from '../../../compartido/tipos.js';

/** Locale de referencia del sistema: separador de miles '.' y decimal ','. */
const LOCALE = 'es-AR';

/** Moneda única del sistema; no hay operaciones multimoneda todavía. */
const MONEDA = 'ARS';

/**
 * Deja un segmento de nombre de archivo en [a-z0-9-].
 *
 * El nombre termina en una cabecera `Content-Disposition`, donde una comilla o
 * un salto de línea permitiría inyectar directivas o partir la respuesta. Se
 * filtra en origen en lugar de confiar en que cada llamador lo recuerde.
 */
function sanearSegmento(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Formato numérico es-AR construido a mano (miles con punto, decimales con
 * coma). Solo se usa cuando `Intl` no conoce la locale: algunas builds de
 * runtime se compilan con ICU reducido y un reporte no puede caerse por eso.
 */
function formatearNumeroManual(numero: number, decimalesMin: number, decimalesMax: number): string {
  const fijo = Math.abs(numero).toFixed(decimalesMax);
  const partes = fijo.split('.');
  const entero = partes[0] ?? '0';
  let decimal = partes[1] ?? '';
  while (decimal.length > decimalesMin && decimal.endsWith('0')) {
    decimal = decimal.slice(0, -1);
  }
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cuerpo = decimal.length > 0 ? `${conMiles},${decimal}` : conMiles;
  // Number(fijo) evita el "-0,00" que sale de redondear un negativo diminuto.
  return numero < 0 && Number(fijo) !== 0 ? `-${cuerpo}` : cuerpo;
}

/**
 * Respaldo de `Intl` para importes.
 *
 * Reproduce la forma exacta que da es-AR con `currencyDisplay: 'code'`: espacio
 * duro (U+00A0, no uno normal) entre el código y la cifra, y el signo *delante*
 * del código ("-ARS 1.234,50"). Componerlo como `${MONEDA} ${número}` producía
 * "ARS -1.234,50" con un espacio corriente, de modo que un runtime con ICU
 * reducido cambiaba el aspecto del mismo reporte -- justo lo que este respaldo
 * existe para evitar. El PDF ya cuenta con el espacio duro al medir anchos.
 */
function formatearMonedaManual(numero: number): string {
  const texto = formatearNumeroManual(numero, 2, 2);
  return texto.startsWith('-')
    ? `-${MONEDA}\u00a0${texto.slice(1)}`
    : `${MONEDA}\u00a0${texto}`;
}

/**
 * Base abstracta de la exportación de reportes.
 *
 * Es el punto de *polimorfismo* del módulo: el servicio de reportes construye
 * un `ReporteDTO` y pide `Exportador.crear(formato).exportar(reporte)` sin
 * nombrar jamás una clase concreta. Agregar un formato nuevo se reduce a
 * escribir una subclase y sumar un caso a la fabrica; ni el servicio ni el
 * router se enteran.
 *
 * La clase concentra además lo que todo formato comparte -- el nombre de
 * archivo sugerido y el formateo de celdas según el tipo declarado en la
 * columna -- para que dos exportadores no puedan discrepar en como se ve una
 * misma fecha o un mismo importe.
 */
export abstract class Exportador {
  /** Formato que implementa esta subclase. */
  abstract get formato(): FormatoExportacion;

  /** Valor de `Content-Type` para la descarga. */
  abstract get tipoMime(): string;

  /** Extensión de archivo, sin punto. */
  abstract get extension(): string;

  /** Serializa el reporte al formato concreto. */
  abstract exportar(reporte: ReporteDTO): Promise<Uint8Array>;

  /** Nombre de archivo sugerido, p.ej. "ecotech-empleados-2026-08-27.csv" */
  nombreArchivo(reporte: ReporteDTO): string {
    // `generadoEn` es ISO, así que los diez primeros caracteres son AAAA-MM-DD.
    const fecha = reporte.generadoEn.slice(0, 10);
    const base = sanearSegmento(`ecotech-${reporte.tipo}-${fecha}`) || 'ecotech-reporte';
    const extension = sanearSegmento(this.extension) || 'bin';
    return `${base}.${extension}`;
  }

  /** Formatea una celda a texto según el tipo declarado en la columna. */
  protected formatearCelda(valor: ValorCelda, columna: ColumnaReporte): string {
    if (valor === null) return '';

    switch (columna.tipo) {
      case 'booleano':
        // Solo se traduce un booleano real: un texto guardado en una columna
        // booleana se muestra tal cual antes que mentir con un 'No'.
        return typeof valor === 'boolean' ? (valor ? 'Sí' : 'No') : String(valor);

      case 'moneda': {
        const numero = typeof valor === 'number' ? valor : Number(valor);
        if (!Number.isFinite(numero)) return String(valor);
        try {
          // 'code' en lugar del símbolo: en es-AR el símbolo es '$', el mismo
          // que usa el dolar, y una liquidación no puede ser ambigua.
          return new Intl.NumberFormat(LOCALE, {
            style: 'currency',
            currency: MONEDA,
            currencyDisplay: 'code',
          }).format(numero);
        } catch {
          return formatearMonedaManual(numero);
        }
      }

      case 'numero': {
        const numero = typeof valor === 'number' ? valor : Number(valor);
        if (!Number.isFinite(numero)) return String(valor);
        try {
          return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(numero);
        } catch {
          return formatearNumeroManual(numero, 0, 2);
        }
      }

      case 'fecha': {
        const texto = String(valor);
        // Se reordena solo si de verdad es ISO; cualquier otro texto (un rango,
        // un "sin definir") se respeta en lugar de convertirlo en basura.
        if (!/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto;
        return `${texto.slice(8, 10)}/${texto.slice(5, 7)}/${texto.slice(0, 4)}`;
      }
    }

    // 'texto' no necesita caso propio: cae aquí, igual que cualquier tipo que
    // llegue del almacén sin estar declarado en la unión.
    return String(valor);
  }
}
