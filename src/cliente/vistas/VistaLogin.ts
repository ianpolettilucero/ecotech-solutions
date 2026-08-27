/**
 * Pantalla de acceso.
 *
 * No gestiona la sesión ni guarda nada: pide el login y, si sale bien, avisa a
 * la aplicación para que se recargue. El token de sesión viaja en una cookie
 * `HttpOnly` que este código no puede leer, de modo que aquí no hay ningún
 * secreto que un XSS pudiera robar.
 *
 * La aplicación pinta esta vista fuera del armazón (no hay menú ni cabecera
 * mientras no haya sesión), así que se dibuja la pantalla completa.
 */

import type { Permiso, SesionDTO } from '../../compartido/tipos.js';
import { ClienteApi, ErrorApi } from '../ClienteApi.js';
import { agregar, div, elemento } from '../dom.js';
import { Vista } from '../Vista.js';
import { Formulario } from '../componentes/Formulario.js';
import type { CampoFormulario } from '../componentes/Formulario.js';

/** Cuentas sembradas por la demostración. */
const CUENTAS_DEMO = [
  'admin@ecotech.com',
  'gerente@ecotech.com',
  'empleado@ecotech.com',
  'auditor@ecotech.com',
];

const CLAVE_DEMO = 'EcoTech#2026Admin';

function comoTexto(valor: string | number | boolean | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(valor);
}

export class VistaLogin extends Vista {
  override get ruta(): string {
    return 'login';
  }

  override get titulo(): string {
    return 'Ingresar';
  }

  override get icono(): string {
    return 'L';
  }

  override get permisos(): Permiso[] {
    return [];
  }

  override async render(contenedor: HTMLElement): Promise<void> {
    // La aplicación ya monta la vista dentro de un contenedor con esta clase;
    // anadirla aquí hace que la pantalla también funcione montada suelta.
    contenedor.classList.add('pantalla-login');

    const campos: CampoFormulario[] = [
      { nombre: 'email', etiqueta: 'Email', tipo: 'email', requerido: true },
      { nombre: 'contrasena', etiqueta: 'Contraseña', tipo: 'contrasena', requerido: true },
    ];
    const formulario = new Formulario(campos);
    const nodo = formulario.render();
    nodo.classList.add('login-formulario');

    const botonIngresar = elemento('button', {
      clase: 'boton boton-primario boton-bloque',
      // `submit` y no `button`: con un botón de envío dentro del <form>, el
      // navegador dispara el mismo camino al pulsar Intro en cualquier campo.
      tipo: 'submit',
      texto: 'Ingresar',
    });
    agregar(nodo, botonIngresar);

    let enviando = false;

    const enviar = async (): Promise<void> => {
      // Dos envíos a la vez dejarian dos peticiones compitiendo por la cookie.
      if (enviando) return;
      enviando = true;
      botonIngresar.disabled = true;
      botonIngresar.textContent = 'Ingresando...';
      formulario.limpiarErrores();

      const valores = formulario.valores();
      try {
        await ClienteApi.post<SesionDTO>('/api/auth/login', {
          email: comoTexto(valores['email']),
          contrasena: comoTexto(valores['contrasena']),
        });
      } catch (error) {
        // Los errores por campo se pintan bajo su input; el motivo general
        // (credenciales incorrectas, cuenta bloqueada) va a la notificación.
        formulario.mostrarErrores(error);
        this.app.notificarError(
          error instanceof ErrorApi ? error.message : 'No se pudo iniciar sesión.',
        );
        enviando = false;
        botonIngresar.disabled = false;
        botonIngresar.textContent = 'Ingresar';
        return;
      }

      // La sesión la lee y la guarda `Aplicación` al recargar: esta vista no
      // toca el estado de sesión ni conoce el token CSRF. El botón se queda
      // deshabilitado a propósito, porque el repintado sustituye la pantalla.
      this.app.notificarExito('Sesión iniciada. Bienvenido a EcoTech Solutions.');
      await this.app.recargar();
    };

    nodo.addEventListener('submit', (evento) => {
      evento.preventDefault();
      void enviar();
    });

    const tarjeta = div(
      'tarjeta-login',
      div(
        'login-marca',
        elemento('span', { clase: 'marca-icono', texto: 'E' }),
        elemento('h1', { clase: 'login-titulo', texto: 'EcoTech Solutions' }),
      ),
      elemento('p', { clase: 'login-descripcion', texto: 'Sistema de Gestión Interna' }),
      nodo,
      this.avisoDemostracion(),
    );

    agregar(contenedor, tarjeta);
    formulario.enfocar();
  }

  /**
   * Recuadro con las credenciales sembradas.
   *
   * Es información de una demostración, no de producción: por eso se muestra
   * con el mismo estilo que el resto de avisos del sistema y se advierte que la
   * clave inicial caduca en el primer ingreso.
   *
   * Va dentro de un `<details>` plegado. Desplegado ocupa unos 250 px, que en un
   * teléfono de 568 px de alto empujaban el botón de ingresar fuera de la vista
   * y obligaban a desplazarse antes de poder hacer nada. Plegado, la pantalla
   * de acceso entra entera en cualquier teléfono y las credenciales siguen a un
   * toque de distancia. `<details>` es el elemento nativo para esto: aporta el
   * comportamiento y la semántica de accesibilidad sin una línea de JavaScript.
   */
  private avisoDemostracion(): HTMLElement {
    const contenido = div(
      'pila',
      elemento('p', { texto: `Usuarios: ${CUENTAS_DEMO.join(', ')}.` }),
      elemento('p', { clase: 'texto-mono', texto: `Contrasena: ${CLAVE_DEMO}` }),
      elemento('p', {
        texto: 'La misma clave sirve para las cuatro cuentas y el sistema obliga a cambiarla en el primer ingreso.',
      }),
    );

    const plegable = elemento('details', { clase: 'aviso-plegable' });
    const resumen = elemento(
      'summary',
      {},
      elemento('span', { clase: 'aviso-icono', texto: 'i', datos: { 'aria-hidden': 'true' } }),
      elemento('span', { texto: 'Credenciales de demostración' }),
    );
    agregar(plegable, resumen, contenido);

    return div('aviso-seguridad', plegable);
  }
}
