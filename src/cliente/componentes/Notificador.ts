/**
 * Avisos efimeros (toasts).
 *
 * Se monta sobre la región `#notificaciones`, que vive fuera de `#app` para que
 * volver a pintar una vista no la destruya: si el contenedor se recreara, el
 * lector de pantalla perdería la región viva y dejaría de anunciar los avisos.
 */

import { agregar, div, elemento } from '../dom.js';

type TipoAviso = 'exito' | 'error' | 'aviso' | 'info';

/** Cuantos avisos caben en pantalla antes de descartar el más antiguo. */
const MAXIMO_VISIBLES = 4;

/** Un error se lee entero, no de reojo: vive más que el resto. */
const DURACION: Readonly<Record<TipoAviso, number>> = Object.freeze({
  exito: 5000,
  error: 8000,
  aviso: 5000,
  info: 5000,
});

const TITULO: Readonly<Record<TipoAviso, string>> = Object.freeze({
  exito: 'Hecho',
  error: 'Error',
  aviso: 'Atención',
  info: 'Información',
});

const CLASE: Readonly<Record<TipoAviso, string>> = Object.freeze({
  exito: 'notificacion-exito',
  error: 'notificacion-peligro',
  aviso: 'notificacion-aviso',
  info: 'notificacion-info',
});

/** Duración de la animación de salida definida en la hoja de estilos. */
const SALIDA = 200;

interface AvisoVisible {
  nodo: HTMLElement;
  temporizador: number;
}

export class Notificador {
  private static readonly visibles: AvisoVisible[] = [];

  static exito(mensaje: string): void {
    Notificador.mostrar('exito', mensaje);
  }

  static error(mensaje: string): void {
    Notificador.mostrar('error', mensaje);
  }

  static aviso(mensaje: string): void {
    Notificador.mostrar('aviso', mensaje);
  }

  static info(mensaje: string): void {
    Notificador.mostrar('info', mensaje);
  }

  private static mostrar(tipo: TipoAviso, mensaje: string): void {
    // Una avalancha de avisos apilados tapa la interfaz y no se lee ninguno:
    // por encima del máximo se retira el más antiguo, que ya se leyo o ya no
    // interesa.
    while (Notificador.visibles.length >= MAXIMO_VISIBLES) {
      const antiguo = Notificador.visibles.shift();
      if (antiguo) Notificador.retirar(antiguo);
    }

    const nodo = div(`notificacion ${CLASE[tipo]}`);
    // Los errores interrumpen; el resto espera su turno en la cola del lector.
    nodo.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    nodo.title = 'Pulsa para cerrar';

    agregar(
      nodo,
      div(
        'notificacion-contenido',
        elemento('span', { clase: 'notificacion-titulo', texto: TITULO[tipo] }),
        elemento('span', { clase: 'notificacion-texto', texto: mensaje }),
      ),
      elemento('button', {
        clase: 'notificacion-cerrar',
        tipo: 'button',
        texto: '\u00D7',
        datos: { 'aria-label': 'Cerrar aviso' },
      }),
    );

    const aviso: AvisoVisible = {
      nodo,
      temporizador: window.setTimeout(() => Notificador.cerrar(nodo), DURACION[tipo]),
    };
    // Se cierra pulsando en cualquier punto del aviso, no solo en la cruz: el
    // botón es la pista visual, pero el área útil es la tarjeta entera.
    nodo.addEventListener('click', () => Notificador.cerrar(nodo));

    Notificador.visibles.push(aviso);
    agregar(Notificador.raiz(), nodo);
  }

  /** Cierra un aviso con la animación de salida. */
  private static cerrar(nodo: HTMLElement): void {
    const indice = Notificador.visibles.findIndex((a) => a.nodo === nodo);
    if (indice < 0) return;
    const [aviso] = Notificador.visibles.splice(indice, 1);
    if (!aviso) return;
    window.clearTimeout(aviso.temporizador);
    nodo.classList.add('notificacion-saliente');
    window.setTimeout(() => nodo.remove(), SALIDA);
  }

  /** Retirada inmediata, sin animación, al hacer sitio para uno nuevo. */
  private static retirar(aviso: AvisoVisible): void {
    window.clearTimeout(aviso.temporizador);
    aviso.nodo.remove();
  }

  /**
   * Región de avisos. Si la página no la trae (una prueba, por ejemplo) se
   * crea al vuelo: un aviso que no se puede pintar no debe tumbar la vista.
   */
  private static raiz(): HTMLElement {
    const existente = document.getElementById('notificaciones');
    if (existente) return existente;
    const creada = elemento('div', { id: 'notificaciones', datos: { 'aria-live': 'polite' } });
    document.body.appendChild(creada);
    return creada;
  }
}
