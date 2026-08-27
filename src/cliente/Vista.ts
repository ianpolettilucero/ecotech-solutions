import type { Permiso, SesionDTO } from '../compartido/tipos.js';

/**
 * Contrato que debe cumplir todo modulo de la interfaz.
 *
 * La misma idea que sostiene el dominio se aplica aqui: el armazon de la
 * aplicacion (menu lateral y enrutador) trabaja contra `Vista` y no conoce
 * ninguna pantalla concreta. Anadir un modulo es escribir una clase y sumarla a
 * la lista; ni el menu, ni el enrutador, ni el control de acceso del cliente
 * cambian una linea.
 *
 * `permisos` es lo que permite que el menu se construya solo: cada vista declara
 * que necesita para ser visible, y el armazon filtra. Es control de acceso *de
 * presentacion*, no de seguridad: el servidor vuelve a comprobarlo todo. Ocultar
 * un boton evita confundir al usuario, no detiene a un atacante.
 */
export abstract class Vista {
  /** Fragmento de ruta, sin `#`. Ej.: 'empleados'. */
  abstract get ruta(): string;

  /** Titulo que se muestra en la cabecera y en el menu. */
  abstract get titulo(): string;

  /** Glifo del menu (se pinta como texto, no como imagen). */
  abstract get icono(): string;

  /** Basta con tener UNO de estos permisos para ver la vista. */
  abstract get permisos(): Permiso[];

  /** Pinta la vista dentro del contenedor, que llega ya vacio. */
  abstract render(contenedor: HTMLElement): Promise<void>;

  constructor(protected readonly app: AplicacionBase) {}

  /** `true` si la sesion actual habilita esta vista. */
  esVisiblePara(sesion: SesionDTO | null): boolean {
    if (!sesion) return false;
    if (this.permisos.length === 0) return true;
    return this.permisos.some((p) => sesion.permisos.includes(p));
  }
}

/**
 * Lo que una vista puede pedirle al armazon.
 *
 * Se declara como interfaz y no como la clase concreta `Aplicacion` para
 * romper la dependencia circular (la aplicacion conoce sus vistas, y las vistas
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
  /** Ejecuta una accion mostrando el error como notificacion si falla. */
  intentar<T>(accion: () => Promise<T>, mensajeExito?: string): Promise<T | null>;
}
