import { Aplicacion } from './Aplicacion.js';

/**
 * Punto de entrada del cliente.
 *
 * El bundle se carga como módulo (`type="module"`), de modo que ya se ejecuta
 * después de analizar el documento: no hace falta esperar a `DOMContentLoaded`.
 */
const raiz = document.getElementById('app');

if (!(raiz instanceof HTMLElement)) {
  // Si el contenedor no existe, el HTML no es el que espera esta aplicación.
  // Es preferible un error claro en consola que una pantalla en blanco muda.
  console.error('No se encontro el contenedor #app en el documento.');
} else {
  void new Aplicacion(raiz).iniciar();
}
