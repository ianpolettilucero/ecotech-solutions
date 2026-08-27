/**
 * Tabla de datos genérica.
 *
 * La tabla no sabe nada de empleados ni de proyectos: recibe la descripción de
 * las columnas y una lista de filas del tipo que sea. Lo que cada celda
 * contiene lo decide la vista, que es quien conoce el dominio; así una columna
 * puede devolver texto plano o un nodo ya construido (una insignia, una
 * botonera) sin que este archivo tenga que enterarse.
 */

import { agregar, div, elemento } from '../dom.js';
import { estadoVacio } from './piezas.js';

export interface ColumnaTabla<T> {
  titulo: string;
  /** Devuelve el contenido de la celda: texto o un nodo ya construido. */
  celda: (fila: T) => string | Node;
  /** Clase CSS opcional para la celda (p.ej. 'celda-numero'). */
  clase?: string;
}

export class Tabla<T> {
  constructor(
    private readonly columnas: ColumnaTabla<T>[],
    private readonly opciones: { vacio?: string; compacta?: boolean } = {},
  ) {}

  /**
   * Pinta las filas. Con la lista vacía devuelve el estado vacío en lugar de
   * una tabla con cabecera y nada debajo: una rejilla huerfana parece un fallo
   * de carga, mientras que un mensaje explica que no hay nada que mostrar.
   */
  render(filas: T[]): HTMLElement {
    if (filas.length === 0) {
      return estadoVacio(this.opciones.vacio ?? 'No hay datos que mostrar.');
    }

    const cabecera = elemento('tr');
    for (const columna of this.columnas) {
      agregar(
        cabecera,
        elemento('th', {
          clase: columna.clase,
          texto: columna.titulo,
          datos: { scope: 'col' },
        }),
      );
    }

    const cuerpo = elemento('tbody');
    for (const fila of filas) {
      const tr = elemento('tr');
      for (const columna of this.columnas) {
        const celda = elemento('td', {
          clase: columna.clase,
          // En pantallas estrechas la tabla se reordena como una pila de fichas
          // y cada celda tiene que decir de que columna viene, porque la
          // cabecera deja de estar a la vista. El CSS lo pinta con `::before`
          // desde este atributo. Es la única forma de conservar el par
          // etiqueta-valor sin duplicar el texto en el DOM ni obligar a cada
          // vista a construir dos árboles distintos.
          datos: { 'data-etiqueta': columna.titulo },
        });
        // `agregar` resuelve los dos casos del contrato: una cadena se inserta
        // como nodo de texto (nunca como marcado) y un nodo se cuelga tal cual.
        agregar(celda, columna.celda(fila));
        agregar(tr, celda);
      }
      agregar(cuerpo, tr);
    }

    // El contenedor es el que desplaza: sin el, una tabla ancha arrastraría el
    // scroll horizontal a toda la página.
    // `compacta` quita el ancho mínimo pensado para tablas de muchas columnas.
    // Sin ella, un desglose de tres columnas dentro de una tarjeta estrecha del
    // panel se desplazaría en horizontal y escondería justo las cifras.
    const tabla = elemento(
      'table',
      { clase: this.opciones.compacta === true ? 'tabla tabla-compacta' : 'tabla' },
      elemento('thead', {}, cabecera),
      cuerpo,
    );
    return div('tabla-contenedor', tabla);
  }
}
