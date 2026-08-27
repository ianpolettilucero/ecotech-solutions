/**
 * Ayudantes de construcción de DOM.
 *
 * ## Por que no hay ni un `innerHTML` en todo el cliente
 *
 * Todo nodo de texto se crea con `textContent`. Es la defensa real contra XSS
 * almacenado: si alguien guarda `<img onerror=...>` en la descripción de una
 * tarea, aquí se pinta como texto literal, no como marcado. Escapar cadenas a
 * mano funciona hasta que alguien olvida un sitio; no tener el método peligroso
 * a mano hace que ese olvido sea imposible.
 */

type Hijo = Node | string | null | undefined | false;

export interface Atributos {
  clase?: string;
  texto?: string;
  tipo?: string;
  valor?: string;
  nombre?: string;
  id?: string;
  para?: string;
  marcador?: string;
  titulo?: string;
  deshabilitado?: boolean;
  requerido?: boolean;
  /** Atributos `data-*` y ARIA sueltos. */
  datos?: Record<string, string>;
  al?: Partial<Record<keyof HTMLElementEventMap, (evento: Event) => void>>;
}

export function elemento<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  atributos: Atributos = {},
  ...hijos: Hijo[]
): HTMLElementTagNameMap[K] {
  const nodo = document.createElement(etiqueta);
  if (atributos.clase) nodo.className = atributos.clase;
  if (atributos.texto !== undefined) nodo.textContent = atributos.texto;
  if (atributos.id) nodo.id = atributos.id;
  if (atributos.titulo) nodo.title = atributos.titulo;
  if (atributos.tipo && 'type' in nodo) (nodo as HTMLInputElement).type = atributos.tipo;
  if (atributos.valor !== undefined && 'value' in nodo) {
    (nodo as HTMLInputElement).value = atributos.valor;
  }
  if (atributos.nombre && 'name' in nodo) (nodo as HTMLInputElement).name = atributos.nombre;
  if (atributos.marcador && 'placeholder' in nodo) {
    (nodo as HTMLInputElement).placeholder = atributos.marcador;
  }
  if (atributos.para && nodo instanceof HTMLLabelElement) nodo.htmlFor = atributos.para;
  if (atributos.deshabilitado && 'disabled' in nodo) {
    (nodo as HTMLButtonElement).disabled = true;
  }
  if (atributos.requerido && 'required' in nodo) (nodo as HTMLInputElement).required = true;
  if (atributos.datos) {
    for (const [clave, valor] of Object.entries(atributos.datos)) nodo.setAttribute(clave, valor);
  }
  if (atributos.al) {
    for (const [evento, manejador] of Object.entries(atributos.al)) {
      if (manejador) nodo.addEventListener(evento, manejador as EventListener);
    }
  }
  agregar(nodo, ...hijos);
  return nodo;
}

export function agregar(padre: Node, ...hijos: Hijo[]): void {
  for (const hijo of hijos) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    padre.appendChild(typeof hijo === 'string' ? document.createTextNode(hijo) : hijo);
  }
}

export function vaciar(nodo: Element): void {
  while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
}

/** Atajos de uso frecuente. */
export const div = (clase: string, ...hijos: Hijo[]): HTMLDivElement =>
  elemento('div', { clase }, ...hijos);

export const texto = (
  etiqueta: keyof HTMLElementTagNameMap,
  clase: string,
  contenido: string,
): HTMLElement => elemento(etiqueta, { clase, texto: contenido });

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

export function formatearFecha(iso: string | null): string {
  if (!iso) return '-';
  const soloFecha = iso.slice(0, 10);
  const partes = soloFecha.split('-');
  if (partes.length !== 3) return iso;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export function formatearFechaHora(iso: string | null): string {
  if (!iso) return '-';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return `${formatearFecha(iso)} ${String(fecha.getHours()).padStart(2, '0')}:${String(
    fecha.getMinutes(),
  ).padStart(2, '0')}`;
}

export function formatearMoneda(valor: number | null): string {
  if (valor === null) return '-';
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 2,
    }).format(valor);
  } catch {
    return `$ ${valor.toFixed(2)}`;
  }
}

export function formatearNumero(valor: number, decimales = 2): string {
  try {
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: decimales }).format(valor);
  } catch {
    return valor.toFixed(decimales);
  }
}

/** Fecha de hoy en formato `AAAA-MM-DD`, en horario local. */
export function hoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/** Etiquetas legibles de las enumeraciones del dominio. */
export const ETIQUETAS: Readonly<Record<string, string>> = Object.freeze({
  ASALARIADO: 'Asalariado',
  POR_HORAS: 'Por horas',
  CONTRATISTA: 'Contratista',
  PLANIFICADO: 'Planificado',
  EN_CURSO: 'En curso',
  PAUSADO: 'Pausado',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
  BORRADOR: 'Borrador',
  ENVIADO: 'Enviado',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  LIDER_TECNICO: 'Líder técnico',
  DESARROLLADOR: 'Desarrollador',
  ANALISTA: 'Analista',
  DISENADOR: 'Diseñador',
  QA: 'QA',
  CONSULTOR: 'Consultor',
  ADMIN_RRHH: 'Administración de RRHH',
  GERENTE: 'Gerencia',
  EMPLEADO: 'Empleado',
  AUDITOR: 'Auditoría',
});

export function etiqueta(clave: string): string {
  return ETIQUETAS[clave] ?? clave;
}

/** Clase de insignia según el estado, para colorear de forma coherente. */
export function claseInsignia(estado: string): string {
  switch (estado) {
    case 'APROBADO':
    case 'EN_CURSO':
      return 'insignia insignia-exito';
    case 'ENVIADO':
    case 'PAUSADO':
    case 'PLANIFICADO':
      return 'insignia insignia-aviso';
    case 'RECHAZADO':
    case 'CANCELADO':
      return 'insignia insignia-peligro';
    case 'FINALIZADO':
      return 'insignia insignia-info';
    default:
      return 'insignia insignia-neutro';
  }
}

// ---------------------------------------------------------------------------
// Iconos
// ---------------------------------------------------------------------------

/**
 * Juego de iconos, dibujados como trazo sobre una caja de 24x24.
 *
 * Van incrustados y no como fuente ni como sprite por dos motivos. El primero
 * es la CSP: `font-src` no esta abierto y un `img-src` externo tampoco, de modo
 * que cualquier icono tiene que viajar dentro del propio documento. El segundo
 * es que un trazo con `stroke: currentColor` hereda el color de quien lo
 * contiene, y asi el mismo icono sirve en el menú, en una tarjeta de métrica y
 * dentro de un boton sin una sola regla de color extra.
 *
 * El trazo es de 1.75 con extremos redondeados, que es lo que da el aire de
 * interfaz de producto en vez de el de clipart.
 */
export const TRAZOS = {
  panel: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
  personas: [
    'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1',
    'M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7',
    'M21 20v-1a4 4 0 0 0-3-3.87',
    'M16.5 4.13a4 4 0 0 1 0 7.75',
  ],
  edificio: [
    'M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16',
    'M14 9h4a2 2 0 0 1 2 2v10',
    'M8 7h2M8 11h2M8 15h2',
    'M2 21h20',
  ],
  maletin: [
    'M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    'M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8',
    'M3 13h18',
  ],
  enlace: [
    'M10.5 13.5a4.5 4.5 0 0 0 6.36 0l2.5-2.5a4.5 4.5 0 0 0-6.36-6.36l-1.3 1.3',
    'M13.5 10.5a4.5 4.5 0 0 0-6.36 0l-2.5 2.5a4.5 4.5 0 0 0 6.36 6.36l1.3-1.3',
  ],
  reloj: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7.5V12l3 2'],
  grafico: ['M3 21h18', 'M7 21v-8', 'M12 21V5', 'M17 21v-11'],
  escudo: ['M12 3l7.5 3v5.5c0 4.7-3.2 8.8-7.5 10.5-4.3-1.7-7.5-5.8-7.5-10.5V6z', 'M9 12l2 2 4.5-4.5'],
  usuario: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8'],
  bandeja: [
    'M22 12h-5.5l-1.5 3h-6l-1.5-3H2',
    'M5.6 5.2 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.6-6.8A2 2 0 0 0 16.6 4H7.4a2 2 0 0 0-1.8 1.2z',
  ],
  brujula: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M16 8l-2.2 6.2L7.6 16.4 9.8 10.2z'],
  visto: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M8.2 12.4l2.6 2.6 4.9-5.2'],
  arena: [
    'M6.5 3h11M6.5 21h11',
    'M8 3v3.4a4 4 0 0 0 4 4 4 4 0 0 0 4-4V3',
    'M8 21v-3.4a4 4 0 0 1 4-4 4 4 0 0 1 4 4V21',
  ],
  candado: ['M6 10.5h12a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8.5a1 1 0 0 1 1-1z', 'M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5'],
  hoja: ['M20 4C11 4 5 8.5 5 15c0 2.6 1.4 4.5 3.4 5.3', 'M20 4c1 9-4.5 14.5-11 14.5', 'M8.5 20.3C10 14 14 9 18.5 6.5'],
} as const;

export type NombreIcono = keyof typeof TRAZOS;

const SVG = 'http://www.w3.org/2000/svg';

/**
 * Construye un icono. Decorativo por defecto (`aria-hidden`): el rotulo que lo
 * acompana ya dice lo que es, y anunciarlo dos veces solo estorba al lector de
 * pantalla. Con `titulo` deja de ser decorativo y pasa a tener nombre
 * accesible, para los pocos casos en los que el icono va solo.
 */
export function icono(nombre: NombreIcono, titulo?: string): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'icono');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  if (titulo) {
    svg.setAttribute('role', 'img');
    const rotulo = document.createElementNS(SVG, 'title');
    rotulo.textContent = titulo;
    svg.appendChild(rotulo);
  } else {
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
  }
  for (const d of TRAZOS[nombre]) {
    const trazo = document.createElementNS(SVG, 'path');
    trazo.setAttribute('d', d);
    svg.appendChild(trazo);
  }
  return svg;
}
