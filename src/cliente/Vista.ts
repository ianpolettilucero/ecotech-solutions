import type { NombreIcono } from './dom.js';
import type { Permiso, SesionDTO } from '../compartido/tipos.js';

/**
 * Contrato que debe cumplir todo módulo de la interfaz.
 *
 * La misma idea que sostiene el dominio se aplica aquí: el armazón de la
 * aplicación (menú lateral y enrutador) trabaja contra `Vista` y no conoce
 * ninguna pantalla concreta. Anadir un módulo es escribir una clase y sumarla a
 * la lista; ni el menú, ni el enrutador, ni el control de acceso del cliente
 * cambian una línea.
 *
 * `permisos` es lo que permite que el menú se construya solo: cada vista declara
 * que necesita para ser visible, y el armazón filtra. Es control de acceso *de
 * presentación*, no de seguridad: el servidor vuelve a comprobarlo todo. Ocultar
 * un botón evita confundir al usuario, no detiene a un atacante.
 */
export abstract class Vista {
  /** Fragmento de ruta, sin `#`. Ej.: 'empleados'. */
  abstract get ruta(): string;

  /** Titulo que se muestra en la cabecera y en el menú. */
  abstract get titulo(): string;

  /**
   * Rotulo del menú cuando la navegación es la barra inferior del teléfono.
   *
   * Allí cada acceso mide 4,5 rem: "Registro de horas" no entra, y recortarlo
   * con puntos suspensivos deja rotulos que no se distinguen entre si. Por
   * defecto es el titulo completo; solo lo redefinen las vistas cuyo nombre es
   * largo.
   */
  get tituloCorto(): string {
    return this.titulo;
  }

  /** Icono del menú, por nombre del juego que vive en `dom.ts`. */
  abstract get icono(): NombreIcono;

  /** Basta con tener UNO de estos permisos para ver la vista. */
  abstract get permisos(): Permiso[];

  /** Pinta la vista dentro del contenedor, que llega ya vacío. */
  abstract render(contenedor: HTMLElement): Promise<void>;

  constructor(protected readonly app: AplicacionBase) {}

  /** `true` si la sesión actual habilita esta vista. */
  esVisiblePara(sesion: SesionDTO | null): boolean {
    if (!sesion) return false;
    if (this.permisos.length === 0) return true;
    return this.permisos.some((p) => sesion.permisos.includes(p));
  }
}

/**
 * Lo que una vista puede pedirle al armazón.
 *
 * Se declara como interfaz y no como la clase concreta `Aplicación` para
 * romper la dependencia circular (la aplicación conoce sus vistas, y las vistas
 * necesitan hablar con ella) y para que una vista sea comprobable con un doble
 * de prueba.
 */
export interface AplicacionBase {
  readonly sesion: SesionDTO | null;
  puede(permiso: Permiso): boolean;
  navegar(ruta: string): void;
  /** Vuelve a pintar la vista activa. */
  recargar(): Promise<void>;
  notificarExito(mensaje: string): void;
  notificarError(mensaje: string): void;
  notificarAviso(mensaje: string): void;
  /** Ejecuta una acción mostrando el error como notificación si falla. */
  intentar<T>(accion: () => Promise<T>, mensajeExito?: string): Promise<T | null>;
}
