/**
 * Constructor de formularios a partir de una descripcion de campos.
 *
 * La vista declara que campos quiere y este componente se encarga del resto:
 * etiquetas asociadas al control, conversion de valores y, sobre todo, pintado
 * de los errores que devuelve la API. La validacion de verdad vive en el
 * servidor -- aqui solo se muestra su respuesta, nunca se sustituye.
 */

import { ErrorApi } from '../ClienteApi.js';
import { agregar, div, elemento } from '../dom.js';

export type TipoCampo =
  | 'texto'
  | 'email'
  | 'numero'
  | 'fecha'
  | 'contrasena'
  | 'area'
  | 'seleccion'
  | 'casilla';

export interface CampoFormulario {
  nombre: string;
  etiqueta: string;
  tipo: TipoCampo;
  valor?: string | number | boolean | null;
  /** Solo para 'seleccion'. */
  opciones?: { valor: string; texto: string }[];
  requerido?: boolean;
  ayuda?: string;
  /** Si es true el campo se pinta pero no se puede editar. */
  soloLectura?: boolean;
}

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Tipo del atributo `type` del <input> para cada tipo de campo. */
const TIPO_HTML: Readonly<Record<string, string>> = Object.freeze({
  texto: 'text',
  email: 'email',
  numero: 'number',
  fecha: 'date',
  contrasena: 'password',
  casilla: 'checkbox',
});

let contadorFormularios = 0;

export class Formulario {
  private readonly campos: CampoFormulario[];
  private readonly controles = new Map<string, Control>();
  private readonly contenedores = new Map<string, HTMLElement>();
  private readonly prefijo: string;

  constructor(campos: CampoFormulario[]) {
    this.campos = campos;
    contadorFormularios += 1;
    // El prefijo evita que dos formularios abiertos a la vez compartan el `id`
    // de un control y que una etiqueta apunte al campo equivocado.
    this.prefijo = `f${contadorFormularios}`;
  }

  /** Nodo a insertar: un <form> sin boton de envio, que aporta el Modal. */
  render(): HTMLFormElement {
    this.controles.clear();
    this.contenedores.clear();

    const formulario = elemento('form', {
      clase: 'formulario',
      // El envio por Intro no dispara nada: quien decide cuando se guarda es el
      // boton del modal, y dejarlo pasar recargaria la pagina entera.
      al: { submit: (evento: Event) => evento.preventDefault() },
    });
    // Sin validacion nativa: los mensajes del navegador no se pueden traducir
    // ni llevan el estilo de la aplicacion, y ademas la comprobacion buena es
    // la del servidor. El asterisco y `required` quedan como pista visual y
    // para el lector de pantalla, pero quien manda es la respuesta de la API.
    formulario.noValidate = true;

    for (const campo of this.campos) {
      agregar(formulario, this.pintarCampo(campo));
    }
    return formulario;
  }

  /** Valores actuales, con los numeros ya convertidos a number. */
  valores(): Record<string, string | number | boolean | null> {
    const salida: Record<string, string | number | boolean | null> = {};
    for (const campo of this.campos) {
      const control = this.controles.get(campo.nombre);
      if (!control) continue;

      if (campo.tipo === 'casilla') {
        salida[campo.nombre] = control instanceof HTMLInputElement ? control.checked : false;
        continue;
      }

      if (campo.tipo === 'numero') {
        const crudo = control.value.trim();
        const numero = Number(crudo);
        // Vacio no es cero: un salario sin rellenar debe viajar como null para
        // que el servidor lo distinga de un cero escrito a proposito.
        salida[campo.nombre] = crudo === '' || Number.isNaN(numero) ? null : numero;
        continue;
      }

      // Se recorta todo menos las contrasenas y los textos largos: un espacio
      // final invisible en un email provoca un rechazo que nadie entiende, pero
      // en una contrasena forma parte del secreto.
      const recortable = campo.tipo !== 'contrasena' && campo.tipo !== 'area';
      salida[campo.nombre] = recortable ? control.value.trim() : control.value;
    }
    return salida;
  }

  /** Pinta los mensajes de error de un ErrorApi bajo cada campo. */
  mostrarErrores(error: unknown): void {
    this.limpiarErrores();
    if (!(error instanceof ErrorApi)) return;

    let primero: Control | null = null;
    for (const campo of this.campos) {
      const mensaje = error.mensajeDe(campo.nombre);
      if (!mensaje) continue;
      const contenedor = this.contenedores.get(campo.nombre);
      const control = this.controles.get(campo.nombre);
      if (!contenedor || !control) continue;

      contenedor.classList.add('con-error');
      control.setAttribute('aria-invalid', 'true');
      agregar(
        contenedor,
        elemento('p', { clase: 'campo-error', texto: mensaje, datos: { role: 'alert' } }),
      );
      if (!primero) primero = control;
    }
    // El foco va al primer campo con problema: en un formulario largo el error
    // puede haber quedado fuera de la parte visible.
    primero?.focus();
  }

  /** Limpia los errores pintados. */
  limpiarErrores(): void {
    for (const contenedor of this.contenedores.values()) {
      contenedor.classList.remove('con-error');
      for (const marca of Array.from(contenedor.querySelectorAll('.campo-error'))) {
        marca.remove();
      }
    }
    for (const control of this.controles.values()) {
      control.removeAttribute('aria-invalid');
    }
  }

  /** Da el foco al primer campo editable. */
  enfocar(): void {
    for (const campo of this.campos) {
      const control = this.controles.get(campo.nombre);
      if (!control || control.disabled) continue;
      if ('readOnly' in control && control.readOnly) continue;
      control.focus();
      return;
    }
  }

  // -------------------------------------------------------------------------
  // Construccion
  // -------------------------------------------------------------------------

  private pintarCampo(campo: CampoFormulario): HTMLElement {
    const id = `${this.prefijo}-${campo.nombre}`;
    const control = this.crearControl(campo, id);
    this.controles.set(campo.nombre, control);

    const etiquetaTexto = elemento('label', {
      clase: 'campo-etiqueta',
      para: id,
      texto: campo.etiqueta,
    });
    if (campo.requerido) {
      agregar(
        etiquetaTexto,
        elemento('span', {
          clase: 'campo-obligatorio',
          texto: '*',
          datos: { 'aria-hidden': 'true' },
        }),
      );
    }

    const clases = ['campo'];
    // La casilla lleva el control a la izquierda del texto; el area de texto
    // ocupa la fila entera de la rejilla porque necesita ancho para leerse.
    if (campo.tipo === 'casilla') clases.push('campo-casilla');
    if (campo.tipo === 'area') clases.push('campo-ancho-total');

    const contenedor =
      campo.tipo === 'casilla'
        ? div(clases.join(' '), control, etiquetaTexto)
        : div(clases.join(' '), etiquetaTexto, control);

    if (campo.ayuda) {
      const idAyuda = `${id}-ayuda`;
      agregar(contenedor, elemento('p', { clase: 'campo-ayuda', id: idAyuda, texto: campo.ayuda }));
      control.setAttribute('aria-describedby', idAyuda);
    }

    this.contenedores.set(campo.nombre, contenedor);
    return contenedor;
  }

  private crearControl(campo: CampoFormulario, id: string): Control {
    const comunes = {
      id,
      nombre: campo.nombre,
      requerido: campo.requerido === true,
    };

    if (campo.tipo === 'area') {
      const area = elemento('textarea', comunes);
      area.value = Formulario.comoTexto(campo.valor);
      if (campo.soloLectura) area.readOnly = true;
      return area;
    }

    if (campo.tipo === 'seleccion') {
      const seleccion = elemento('select', comunes);
      for (const opcion of campo.opciones ?? []) {
        agregar(seleccion, elemento('option', { valor: opcion.valor, texto: opcion.texto }));
      }
      seleccion.value = Formulario.comoTexto(campo.valor);
      // Un <select> no admite `readonly`; se deshabilita, y `valores()` lo
      // sigue leyendo porque no depende del envio nativo del formulario.
      if (campo.soloLectura) seleccion.disabled = true;
      return seleccion;
    }

    const entrada = elemento('input', {
      ...comunes,
      tipo: TIPO_HTML[campo.tipo] ?? 'text',
    });
    if (campo.tipo === 'casilla') {
      entrada.checked = campo.valor === true;
      if (campo.soloLectura) entrada.disabled = true;
    } else {
      entrada.value = Formulario.comoTexto(campo.valor);
      if (campo.soloLectura) entrada.readOnly = true;
    }
    return entrada;
  }

  private static comoTexto(valor: string | number | boolean | null | undefined): string {
    if (valor === null || valor === undefined) return '';
    return String(valor);
  }
}

