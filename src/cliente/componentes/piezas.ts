/**
 * Piezas sueltas de interfaz.
 *
 * Son funciones puras: reciben datos y devuelven un nodo ya construido, sin
 * guardar estado ni consultar la API. Existen para que las vistas no repitan
 * la misma marca una y otra vez y, sobre todo, para que una insignia o una
 * metrica se vean igual en todas las pantallas: si hay que cambiar el aspecto
 * de algo, se cambia aqui y cambia en toda la aplicacion.
 */

import { agregar, claseInsignia, div, elemento, etiqueta } from '../dom.js';

/** Milisegundos que espera el buscador antes de avisar del texto tecleado. */
const RETARDO_BUSQUEDA = 300;

/** Contador para generar identificadores unicos de control y etiqueta. */
let contadorId = 0;

function idUnico(prefijo: string): string {
  contadorId += 1;
  return `${prefijo}-${contadorId}`;
}

// ---------------------------------------------------------------------------
// Indicadores
// ---------------------------------------------------------------------------

/** Insignia de estado: color y texto legible salen del mismo valor crudo. */
export function insignia(estado: string): HTMLElement {
  return elemento('span', { clase: claseInsignia(estado), texto: etiqueta(estado) });
}

/** Tarjeta de metrica del panel: rotulo, cifra grande y detalle opcional. */
export function tarjetaMetrica(titulo: string, valor: string, detalle?: string): HTMLElement {
  return div(
    'metrica',
    elemento('span', { clase: 'metrica-etiqueta', texto: titulo }),
    elemento('strong', { clase: 'metrica-valor', texto: valor }),
    detalle ? elemento('span', { clase: 'metrica-detalle', texto: detalle }) : null,
  );
}

/** Hueco que sustituye a una lista vacia. Nunca se deja una tabla sin filas. */
export function estadoVacio(mensaje: string): HTMLElement {
  return div(
    'vacio',
    elemento('span', { clase: 'vacio-icono', texto: '\u2205', datos: { 'aria-hidden': 'true' } }),
    elemento('p', { clase: 'vacio-texto', texto: mensaje }),
  );
}

/** Indicador de carga. `role="status"` para que el lector de pantalla lo anuncie. */
export function cargando(): HTMLElement {
  return div(
    'cargando',
    elemento('span', { clase: 'girador', datos: { 'aria-hidden': 'true' } }),
    elemento('p', { clase: 'cargando-texto', texto: 'Cargando...' }),
  );
}

/**
 * Anchuras del relleno de las barras de progreso.
 *
 * La CSP es `style-src 'self'` sin 'unsafe-inline': el atributo `style` esta
 * bloqueado, asi que la anchura no puede escribirse en linea. Se expresa como
 * una clase `relleno-N` cuya regla se registra una sola vez por porcentaje en
 * una hoja construible; una hoja del CSSOM no es estilo en linea y la politica
 * no la bloquea. Si el navegador no las admite, la barra se queda sin relleno
 * visible pero el porcentaje sigue anunciado en `aria-valuetext`.
 */
let hojaAnchuras: CSSStyleSheet | null = null;
const anchurasRegistradas = new Set<number>();

function claseAnchura(porcentaje: number): string {
  const entero = Math.round(porcentaje);
  const clase = `relleno-${entero}`;
  if (anchurasRegistradas.has(entero)) return clase;
  try {
    if (!hojaAnchuras) {
      hojaAnchuras = new CSSStyleSheet();
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, hojaAnchuras];
    }
    hojaAnchuras.insertRule(`.${clase} { inline-size: ${entero}%; }`);
    anchurasRegistradas.add(entero);
  } catch {
    // Navegador sin hojas construibles: se degrada sin romper la vista.
  }
  return clase;
}

/**
 * Barra de progreso.
 *
 * El relleno se acota al 100 % para que no se desborde del carril, pero cuando
 * el porcentaje real lo supera se anade la clase 'excedido': un proyecto que se
 * ha pasado de presupuesto se distingue de uno justo al limite de un vistazo,
 * que es justo lo que se pierde si solo se recorta el valor.
 */
export function barraProgreso(porcentaje: number): HTMLElement {
  const real = Number.isFinite(porcentaje) ? Math.max(0, porcentaje) : 0;
  const acotado = Math.min(100, real);
  const excedido = real > 100;
  const clases = ['barra-progreso'];
  if (excedido) clases.push('excedido', 'barra-progreso-peligro');

  return elemento(
    'div',
    {
      clase: clases.join(' '),
      datos: {
        role: 'progressbar',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': String(Math.round(acotado)),
        'aria-valuetext': `${Math.round(real)} %`,
      },
    },
    elemento('span', { clase: `barra-progreso-relleno ${claseAnchura(acotado)}` }),
  );
}

// ---------------------------------------------------------------------------
// Controles
// ---------------------------------------------------------------------------

/** Fila de botones de accion. */
export function botonera(...botones: HTMLElement[]): HTMLElement {
  // 'acciones' es el gancho que usan las vistas; 'grupo-botones' aporta la
  // separacion y el ajuste de linea que ya define la hoja de estilos.
  return div('acciones grupo-botones', ...botones);
}

export function boton(
  texto: string,
  alPulsar: () => void,
  variante: 'primario' | 'secundario' | 'peligro' | 'fantasma' = 'secundario',
): HTMLButtonElement {
  return elemento('button', {
    clase: `boton boton-${variante}`,
    // Sin `type="button"` un boton dentro de un <form> lo enviaria al pulsarlo.
    tipo: 'button',
    texto,
    al: { click: () => alPulsar() },
  });
}

/** Barra de filtros de un listado. */
export function filtros(...controles: HTMLElement[]): HTMLElement {
  return div('filtros', ...controles);
}

/** Envuelve un control de filtro con su etiqueta asociada. */
export function campoFiltro(etiquetaTexto: string, control: HTMLElement): HTMLElement {
  if (!control.id) control.id = idUnico('filtro');
  return div(
    'campo',
    elemento('label', { clase: 'campo-etiqueta', para: control.id, texto: etiquetaTexto }),
    control,
  );
}

export function selector(
  opciones: { valor: string; texto: string }[],
  valorActual: string,
  alCambiar: (v: string) => void,
): HTMLSelectElement {
  const control = elemento('select', {
    al: {
      change: (evento: Event) => {
        const destino = evento.currentTarget;
        if (destino instanceof HTMLSelectElement) alCambiar(destino.value);
      },
    },
  });
  for (const opcion of opciones) {
    agregar(control, elemento('option', { valor: opcion.valor, texto: opcion.texto }));
  }
  // Se asigna despues de tener las opciones: antes el navegador lo ignoraria.
  control.value = valorActual;
  return control;
}

/**
 * Campo de busqueda con retardo.
 *
 * Sin el retardo cada tecla lanzaria una peticion al servidor y las respuestas
 * podrian llegar desordenadas, dejando en pantalla el resultado de un texto que
 * el usuario ya no tiene escrito.
 */
export function buscador(marcador: string, alBuscar: (texto: string) => void): HTMLInputElement {
  let temporizador: number | undefined;
  return elemento('input', {
    tipo: 'search',
    marcador,
    al: {
      input: (evento: Event) => {
        const destino = evento.currentTarget;
        if (!(destino instanceof HTMLInputElement)) return;
        const texto = destino.value.trim();
        if (temporizador !== undefined) window.clearTimeout(temporizador);
        temporizador = window.setTimeout(() => {
          temporizador = undefined;
          alBuscar(texto);
        }, RETARDO_BUSQUEDA);
      },
    },
  });
}
