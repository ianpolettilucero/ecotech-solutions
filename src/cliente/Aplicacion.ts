import type { Permiso, SesionDTO } from '../compartido/tipos.js';
import { ClienteApi, ErrorApi } from './ClienteApi.js';
import { Vista, type AplicacionBase } from './Vista.js';
import { Notificador } from './componentes/Notificador.js';
import { Modal } from './componentes/Modal.js';
import { agregar, div, elemento, vaciar } from './dom.js';

import { VistaLogin } from './vistas/VistaLogin.js';
import { VistaPanel } from './vistas/VistaPanel.js';
import { VistaEmpleados } from './vistas/VistaEmpleados.js';
import { VistaDepartamentos } from './vistas/VistaDepartamentos.js';
import { VistaProyectos } from './vistas/VistaProyectos.js';
import { VistaAsignaciones } from './vistas/VistaAsignaciones.js';
import { VistaHoras } from './vistas/VistaHoras.js';
import { VistaReportes } from './vistas/VistaReportes.js';
import { VistaAuditoria } from './vistas/VistaAuditoria.js';
import { VistaPerfil } from './vistas/VistaPerfil.js';

/**
 * Armazon de la aplicacion.
 *
 * Mantiene la sesion, arma el menu a partir de las vistas disponibles y despacha
 * la navegacion por fragmento (`#/empleados`). Se eligio el fragmento y no la
 * History API porque asi el enrutado no depende de que el servidor devuelva
 * `index.html` en cada ruta profunda, y funciona igual si alguien comparte un
 * enlace o recarga la pagina.
 *
 * La aplicacion NO conoce ninguna vista concreta salvo en la lista de abajo:
 * a partir de ahi trabaja contra el tipo abstracto `Vista`.
 */
export class Aplicacion implements AplicacionBase {
  private _sesion: SesionDTO | null = null;
  private readonly vistas: Vista[];
  private readonly vistaLogin: VistaLogin;
  private readonly raiz: HTMLElement;

  constructor(raiz: HTMLElement) {
    this.raiz = raiz;
    this.vistaLogin = new VistaLogin(this);
    this.vistas = [
      new VistaPanel(this),
      new VistaEmpleados(this),
      new VistaDepartamentos(this),
      new VistaProyectos(this),
      new VistaAsignaciones(this),
      new VistaHoras(this),
      new VistaReportes(this),
      new VistaAuditoria(this),
      new VistaPerfil(this),
    ];
  }

  get sesion(): SesionDTO | null {
    return this._sesion;
  }

  puede(permiso: Permiso): boolean {
    return this._sesion?.permisos.includes(permiso) ?? false;
  }

  // ---------------------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------------------

  async iniciar(): Promise<void> {
    // Si la cookie caduca a mitad de sesion, se vuelve al login sin dejar al
    // usuario ante una pantalla que ya no puede refrescar.
    ClienteApi.alExpirarSesion = () => {
      this._sesion = null;
      ClienteApi.fijarTokenCsrf(null);
      Notificador.aviso('La sesion expiro. Vuelva a ingresar.');
      void this.recargar();
    };

    window.addEventListener('hashchange', () => {
      void this.pintar();
    });

    await this.recargar();
  }

  /** Relee la sesion del servidor y repinta. */
  async recargar(): Promise<void> {
    try {
      this._sesion = await ClienteApi.get<SesionDTO>('/api/auth/sesion');
      ClienteApi.fijarTokenCsrf(this._sesion.tokenCsrf);
    } catch {
      // Un 401 aqui es lo normal cuando todavia no se inicio sesion.
      this._sesion = null;
      ClienteApi.fijarTokenCsrf(null);
    }
    await this.pintar();
  }

  navegar(ruta: string): void {
    const destino = `#/${ruta}`;
    if (window.location.hash === destino) {
      void this.pintar();
    } else {
      window.location.hash = destino;
    }
  }

  // ---------------------------------------------------------------------------
  // Pintado
  // ---------------------------------------------------------------------------

  private rutaActual(): string {
    return window.location.hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  }

  private vistasVisibles(): Vista[] {
    return this.vistas.filter((v) => v.esVisiblePara(this._sesion));
  }

  private async pintar(): Promise<void> {
    Modal.cerrar();

    if (!this._sesion) {
      vaciar(this.raiz);
      const contenedor = div('pantalla-login');
      this.raiz.appendChild(contenedor);
      await this.vistaLogin.render(contenedor);
      return;
    }

    // Obliga a rotar la contrasena sembrada antes de dejar operar. Se hace en el
    // cliente por comodidad; el servidor no depende de esto para nada critico.
    if (this._sesion.usuario.debeCambiarContrasena && this.rutaActual() !== 'perfil') {
      Notificador.aviso('Debe cambiar la contrasena inicial antes de continuar.');
      this.navegar('perfil');
      return;
    }

    const visibles = this.vistasVisibles();
    const primera = visibles[0];
    const vista = visibles.find((v) => v.ruta === this.rutaActual()) ?? primera;
    if (!vista) {
      vaciar(this.raiz);
      this.raiz.appendChild(
        div('vacio', 'Su usuario no tiene acceso a ningun modulo. Contacte con Recursos Humanos.'),
      );
      return;
    }

    this.pintarArmazon(visibles, vista);

    const contenido = this.raiz.querySelector('.contenido');
    if (!(contenido instanceof HTMLElement)) return;
    contenido.appendChild(div('cargando', elemento('span', {})));

    try {
      const area = div('vista');
      await vista.render(area);
      vaciar(contenido);
      contenido.appendChild(area);
    } catch (e) {
      vaciar(contenido);
      const mensaje = e instanceof ErrorApi ? e.message : 'No se pudo cargar el modulo.';
      contenido.appendChild(div('vacio', mensaje));
      this.notificarError(mensaje);
    }
  }

  private pintarArmazon(visibles: Vista[], activa: Vista): void {
    vaciar(this.raiz);
    const sesion = this._sesion;
    if (!sesion) return;

    const nav = elemento('nav', { clase: 'nav' });
    for (const vista of visibles) {
      const boton = elemento(
        'button',
        {
          clase: vista === activa ? 'nav-item activo' : 'nav-item',
          tipo: 'button',
          titulo: vista.titulo,
          al: { click: () => this.navegar(vista.ruta) },
        },
        elemento('span', { clase: 'nav-icono', texto: vista.icono }),
        // Se pintan los dos rotulos y la hoja de estilos elige cual se ve
        // segun el ancho. Alternar con JavaScript exigiria escuchar el cambio
        // de tamanio y volver a pintar el menu; asi es una regla de CSS.
        elemento('span', { clase: 'nav-texto', texto: vista.titulo }),
        elemento('span', { clase: 'nav-texto-corto', texto: vista.tituloCorto }),
      );
      nav.appendChild(boton);
    }

    const barraLateral = elemento(
      'aside',
      { clase: 'barra-lateral' },
      div(
        'barra-lateral-marca',
        elemento('span', { clase: 'marca-icono', texto: 'E' }),
        elemento('span', { clase: 'marca-texto', texto: 'EcoTech Solutions' }),
      ),
      nav,
    );

    const iniciales = sesion.empleado
      ? `${sesion.empleado.nombre.charAt(0)}${sesion.empleado.apellido.charAt(0)}`.toUpperCase()
      : sesion.usuario.email.slice(0, 2).toUpperCase();

    const cabecera = elemento(
      'header',
      { clase: 'cabecera' },
      elemento('h1', { clase: 'cabecera-titulo', texto: activa.titulo }),
      div(
        'cabecera-acciones',
        elemento(
          'button',
          {
            clase: 'usuario-chip',
            tipo: 'button',
            titulo: 'Ver mi perfil',
            al: { click: () => this.navegar('perfil') },
          },
          elemento('span', { clase: 'avatar', texto: iniciales }),
          div(
            'usuario-datos',
            elemento('span', { clase: 'usuario-email', texto: sesion.usuario.email }),
            elemento('span', { clase: 'usuario-rol', texto: sesion.usuario.rol.replace('_', ' ') }),
          ),
        ),
        elemento('button', {
          clase: 'boton boton-fantasma boton-pequeno',
          tipo: 'button',
          texto: 'Salir',
          al: { click: () => void this.cerrarSesion() },
        }),
      ),
    );

    const aplicacion = div('aplicacion');
    agregar(aplicacion, barraLateral, cabecera, elemento('main', { clase: 'contenido' }));
    this.raiz.appendChild(aplicacion);

    // En el telefono la navegacion es una barra inferior que no muestra las
    // nueve secciones a la vez, y cada vez que se pinta el armazon vuelve al
    // principio. Se centra la seccion activa para que siempre se vea donde
    // esta uno. En escritorio la barra es vertical y no desborda a lo ancho,
    // de modo que asignar `scrollLeft` no tiene ningun efecto.
    const activo = nav.querySelector<HTMLElement>('.nav-item.activo');
    if (activo) {
      nav.scrollLeft = activo.offsetLeft - (nav.clientWidth - activo.offsetWidth) / 2;
    }
  }

  private async cerrarSesion(): Promise<void> {
    try {
      await ClienteApi.post('/api/auth/logout');
    } catch {
      // Aunque el servidor falle, se limpia el estado local: el usuario pidio salir.
    }
    this._sesion = null;
    ClienteApi.fijarTokenCsrf(null);
    window.location.hash = '';
    Notificador.info('Sesion cerrada.');
    await this.pintar();
  }

  // ---------------------------------------------------------------------------
  // Notificaciones y manejo uniforme de errores
  // ---------------------------------------------------------------------------

  notificarExito(mensaje: string): void {
    Notificador.exito(mensaje);
  }

  notificarError(mensaje: string): void {
    Notificador.error(mensaje);
  }

  notificarAviso(mensaje: string): void {
    Notificador.aviso(mensaje);
  }

  /**
   * Ejecuta una accion contra la API y traduce cualquier fallo a una
   * notificacion. Centralizarlo evita que cada vista repita el mismo try/catch
   * y, sobre todo, que alguna se lo olvide y el error muera en la consola.
   */
  async intentar<T>(accion: () => Promise<T>, mensajeExito?: string): Promise<T | null> {
    try {
      const resultado = await accion();
      if (mensajeExito) this.notificarExito(mensajeExito);
      return resultado;
    } catch (e) {
      this.notificarError(
        e instanceof ErrorApi ? e.message : 'Ocurrio un error inesperado. Intente de nuevo.',
      );
      return null;
    }
  }
}
