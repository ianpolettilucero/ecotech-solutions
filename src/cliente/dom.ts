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
