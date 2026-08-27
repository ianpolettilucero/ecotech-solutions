/**
 * Dialogo modal.
 *
 * Solo puede haber uno abierto a la vez. No es una limitacion tecnica sino una
 * decision: dos capas apiladas dejan al usuario sin saber que cancela el
 * Escape, y el foco acaba en un sitio imposible de adivinar. Abrir un modal
 * cierra el anterior, y el que se cierra devuelve el foco a donde estaba.
 */

import { agregar, div, elemento } from '../dom.js';
import { Notificador } from './Notificador.js';

export interface OpcionesModal {
  titulo: string;
  contenido: Node;
  /** Texto del boton principal. Por defecto 'Guardar'. */
  textoAceptar?: string;
  /** Texto del boton de descarte. Por defecto 'Cancelar'. */
  textoCancelar?: string;
  /** Pinta el boton principal como destructivo. */
  peligro?: boolean;
  /** Si devuelve true (o una promesa que resuelve true), el modal se cierra. */
  alAceptar: () => boolean | Promise<boolean>;
}

const SELECTOR_ENFOCABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface ModalAbierto {
  fondo: HTMLElement;
  /** Quien tenia el foco antes de abrir, para devolverselo al cerrar. */
  enfocadoAntes: HTMLElement | null;
  alTeclear: (evento: KeyboardEvent) => void;
}

export class Modal {
  private static actual: ModalAbierto | null = null;
  /** Enganche interno de `confirmar` para resolver su promesa al cerrar. */
  private static alCerrarInterno: (() => void) | null = null;
  private static contador = 0;

  static abrir(opciones: OpcionesModal): void {
    Modal.cerrar();

    Modal.contador += 1;
    const idTitulo = `modal-titulo-${Modal.contador}`;
    const enfocadoAntes =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    let ocupado = false;

    /**
     * Ejecuta la accion principal. Mientras esta en curso el boton queda
     * deshabilitado: sin esto, dos clics seguidos crean dos empleados o
     * aprueban dos veces el mismo parte de horas.
     */
    async function aceptar(): Promise<void> {
      if (ocupado) return;
      ocupado = true;
      botonAceptar.disabled = true;
      try {
        if (await opciones.alAceptar()) {
          Modal.cerrar();
          return;
        }
      } catch (error) {
        // Un fallo aqui no puede quedar en silencio ni tumbar el dialogo: se
        // avisa y el modal sigue abierto con los datos que el usuario escribio.
        Notificador.error(
          error instanceof Error ? error.message : 'No se pudo completar la accion.',
        );
      } finally {
        ocupado = false;
        botonAceptar.disabled = false;
      }
    }

    const botonAceptar = elemento('button', {
      clase: `boton ${opciones.peligro ? 'boton-peligro' : 'boton-primario'}`,
      tipo: 'button',
      texto: opciones.textoAceptar ?? 'Guardar',
      al: { click: () => void aceptar() },
    });

    const botonCancelar = elemento('button', {
      clase: 'boton boton-secundario',
      tipo: 'button',
      texto: opciones.textoCancelar ?? 'Cancelar',
      al: { click: () => Modal.cerrar() },
    });

    const botonCerrar = elemento('button', {
      clase: 'boton boton-fantasma boton-compacto',
      tipo: 'button',
      texto: '\u00D7',
      titulo: 'Cerrar',
      datos: { 'aria-label': 'Cerrar' },
      al: { click: () => Modal.cerrar() },
    });

    const cuerpo = div('modal-cuerpo');
    agregar(cuerpo, opciones.contenido);

    const cuadro = elemento(
      'div',
      {
        clase: 'modal',
        datos: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': idTitulo },
      },
      div(
        'modal-cabecera',
        elemento('h2', { clase: 'modal-titulo', id: idTitulo, texto: opciones.titulo }),
        botonCerrar,
      ),
      cuerpo,
      div('modal-pie', botonCancelar, botonAceptar),
    );

    const fondo = div('modal-fondo');
    // Solo el fondo cierra: si se comparara con `contains`, un arrastre que
    // empieza dentro del cuadro y suelta fuera cerraria el dialogo por error.
    fondo.addEventListener('click', (evento) => {
      if (evento.target === fondo) Modal.cerrar();
    });
    agregar(fondo, cuadro);

    const alTeclear = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        Modal.cerrar();
        return;
      }
      if (evento.key !== 'Tab') return;

      // Atrapado basico del foco: el tabulador da la vuelta dentro del cuadro
      // en lugar de irse a la pagina de detras, que esta inerte.
      const enfocables = Array.from(cuadro.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLE));
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (!primero || !ultimo) return;

      const activo = document.activeElement;
      if (evento.shiftKey && (activo === primero || !cuadro.contains(activo))) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && activo === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', alTeclear, true);

    Modal.actual = { fondo, enfocadoAntes, alTeclear };
    agregar(Modal.raiz(), fondo);

    // El foco entra en el dialogo al abrirlo. En un modal destructivo se posa
    // en Cancelar: pulsar Intro sin leer no debe borrar nada.
    const preferido =
      cuerpo.querySelector<HTMLElement>(SELECTOR_ENFOCABLE) ??
      (opciones.peligro ? botonCancelar : botonAceptar);
    preferido.focus();
  }

  static cerrar(): void {
    const actual = Modal.actual;
    const alCerrar = Modal.alCerrarInterno;
    Modal.actual = null;
    Modal.alCerrarInterno = null;

    if (actual) {
      document.removeEventListener('keydown', actual.alTeclear, true);
      actual.fondo.remove();
      // Devolver el foco es lo que permite seguir con el teclado donde se
      // estaba; sin esto vuelve al principio del documento.
      if (actual.enfocadoAntes?.isConnected) actual.enfocadoAntes.focus();
    }
    alCerrar?.();
  }

  /**
   * Confirmacion de si/no montada sobre `abrir`. Resuelve a true solo si el
   * usuario acepta; cancelar, pulsar Escape, el fondo o abrir otro modal
   * resuelven a false, de modo que la promesa nunca queda colgada.
   */
  static confirmar(titulo: string, mensaje: string, peligro = false): Promise<boolean> {
    return new Promise<boolean>((resolver) => {
      let aceptado = false;
      Modal.abrir({
        titulo,
        contenido: elemento('p', { texto: mensaje }),
        textoAceptar: peligro ? 'Eliminar' : 'Confirmar',
        peligro,
        alAceptar: () => {
          aceptado = true;
          return true;
        },
      });
      Modal.alCerrarInterno = () => resolver(aceptado);
    });
  }

  /**
   * Capa de dialogos. Si la pagina no la trae se crea al vuelo, para que el
   * componente funcione tambien fuera del armazon (por ejemplo en pruebas).
   */
  private static raiz(): HTMLElement {
    const existente = document.getElementById('modales');
    if (existente) return existente;
    const creada = elemento('div', { id: 'modales' });
    document.body.appendChild(creada);
    return creada;
  }
}
