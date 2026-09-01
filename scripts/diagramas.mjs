/**
 * Generador de los diagramas SVG de la Guía de Aprobación.
 *
 * Los diagramas se escriben como datos (cajas, clases, flechas) y este script
 * los dibuja. La alternativa -escribir el SVG a mano, uno por uno- produce
 * catorce diagramas con catorce estilos distintos y con la notación UML
 * ligeramente mal en alguno; aquí la punta de flecha de una herencia se define
 * una sola vez y sale igual en todos.
 *
 * ## Por qué no Mermaid
 *
 * `docs/` sí usa Mermaid, y está bien: GitHub lo renderiza solo. Pero la guía
 * también se publica en el sitio, cuya CSP es `script-src 'self'`: no hay forma
 * de cargar el renderizador de Mermaid desde un CDN, y empaquetar sus ~900 KiB
 * para dibujar catorce diagramas no se sostiene. Un SVG generado no necesita
 * JavaScript en el navegador, ni en GitHub ni en el sitio.
 *
 * ## Paleta fija
 *
 * Los colores son literales y claros, no variables de tema. El diagrama se
 * pinta siempre sobre el panel blanco que le da `guia.css`, en modo claro y en
 * oscuro, porque teñir un diagrama con filtros para el modo oscuro destruye
 * justo lo que distingue una caja de otra.
 *
 * Uso: node scripts/diagramas.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'guia-de-aprobacion', 'diagramas');

// ---------------------------------------------------------------------------
// Paleta y métrica
// ---------------------------------------------------------------------------

const TONOS = {
  neutro: { borde: '#cbd5e1', fondo: '#f8fafc', texto: '#0f172a' },
  verde: { borde: '#0d7d5a', fondo: '#ddf6ec', texto: '#065f46' },
  cian: { borde: '#0a7f8e', fondo: '#ddf4f7', texto: '#0a6472' },
  violeta: { borde: '#6740e0', fondo: '#ece7fd', texto: '#4c1d95' },
  azul: { borde: '#1f6fd0', fondo: '#e3eefc', texto: '#1e40af' },
  ambar: { borde: '#a85b06', fondo: '#fdefda', texto: '#92400e' },
  rosa: { borde: '#be3455', fondo: '#fce7ec', texto: '#9f1239' },
  gris: { borde: '#94a3b8', fondo: '#f1f5f9', texto: '#334155' },
};

const TENUE = '#475569';
const LINEA = '#64748b';
const FUENTE = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/**
 * Ancho aproximado de un texto.
 *
 * Sin motor de fuentes no hay medida exacta; 0,55 em por carácter es el
 * promedio de una tipografía de sistema en minúsculas y sobreestima un poco,
 * que es el error que conviene: una caja de más deja aire, una de menos corta
 * el texto.
 */
function ancho(texto, tamano = 13, mono = false) {
  return texto.length * tamano * (mono ? 0.6 : 0.55);
}

function esc(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Primitivas
// ---------------------------------------------------------------------------

function texto(x, y, contenido, opciones = {}) {
  const {
    tamano = 13,
    peso = 400,
    color = '#0f172a',
    anclaje = 'start',
    mono = false,
    cursiva = false,
  } = opciones;
  const atributos = [
    `x="${x}"`,
    `y="${y}"`,
    `font-family="${mono ? MONO : FUENTE}"`,
    `font-size="${tamano}"`,
    peso !== 400 ? `font-weight="${peso}"` : '',
    cursiva ? 'font-style="italic"' : '',
    `fill="${color}"`,
    anclaje !== 'start' ? `text-anchor="${anclaje}"` : '',
  ].filter(Boolean);
  return `<text ${atributos.join(' ')}>${esc(contenido)}</text>`;
}

/** Caja redondeada con título y, opcionalmente, líneas de cuerpo. */
function caja({ x, y, w, h, titulo, lineas = [], tono = 'neutro', numero, tamanoTitulo = 13.5 }) {
  const t = TONOS[tono] ?? TONOS.neutro;
  const partes = [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="${t.fondo}" stroke="${t.borde}" stroke-width="1.5"/>`,
  ];
  let cursor = y + 21;
  if (numero !== undefined) {
    partes.push(`<circle cx="${x + 17}" cy="${y + 17}" r="10.5" fill="${t.borde}"/>`);
    partes.push(texto(x + 17, y + 21.5, numero, { tamano: 11.5, peso: 700, color: '#ffffff', anclaje: 'middle' }));
    partes.push(texto(x + 34, y + 21.5, titulo, { tamano: tamanoTitulo, peso: 650, color: t.texto }));
    cursor = y + 41;
  } else {
    partes.push(texto(x + 13, cursor, titulo, { tamano: tamanoTitulo, peso: 650, color: t.texto }));
    cursor += 19;
  }
  for (const linea of lineas) {
    partes.push(texto(x + 13, cursor, linea, { tamano: 11.5, color: TENUE }));
    cursor += 16;
  }
  return partes.join('\n  ');
}

/**
 * Clase UML con sus tres compartimentos.
 *
 * El nombre de una clase abstracta va en cursiva: es la notación estándar, y es
 * justo el detalle que se pierde cuando el diagrama lo dibuja una IA.
 */
function claseUML({ x, y, nombre, estereotipo, atributos = [], metodos = [], tono = 'neutro', abstracta = false, w }) {
  const t = TONOS[tono] ?? TONOS.neutro;
  const todas = [...atributos, ...metodos, nombre, estereotipo ?? ''];
  const anchoCalculado = Math.max(...todas.map((s) => ancho(s, 11.5, true) + 26), 150);
  const W = w ?? Math.ceil(anchoCalculado);

  const altoCabecera = estereotipo ? 42 : 28;
  const altoAtributos = atributos.length ? atributos.length * 16 + 10 : 0;
  const altoMetodos = metodos.length ? metodos.length * 16 + 10 : 0;
  const H = altoCabecera + altoAtributos + altoMetodos;

  const partes = [
    `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="4" fill="#ffffff" stroke="${t.borde}" stroke-width="1.5"/>`,
    `<rect x="${x}" y="${y}" width="${W}" height="${altoCabecera}" rx="4" fill="${t.fondo}" stroke="none"/>`,
    `<rect x="${x}" y="${y + altoCabecera - 6}" width="${W}" height="6" fill="${t.fondo}" stroke="none"/>`,
  ];
  let cursor = y;
  if (estereotipo) {
    partes.push(texto(x + W / 2, y + 15, `«${estereotipo}»`, { tamano: 10.5, color: t.texto, anclaje: 'middle' }));
    partes.push(texto(x + W / 2, y + 32, nombre, { tamano: 13, peso: 700, color: t.texto, anclaje: 'middle', cursiva: abstracta }));
  } else {
    partes.push(texto(x + W / 2, y + 19, nombre, { tamano: 13, peso: 700, color: t.texto, anclaje: 'middle', cursiva: abstracta }));
  }
  cursor = y + altoCabecera;
  partes.push(`<line x1="${x}" y1="${cursor}" x2="${x + W}" y2="${cursor}" stroke="${t.borde}" stroke-width="1.5"/>`);

  if (atributos.length) {
    let cy = cursor + 16;
    for (const a of atributos) {
      partes.push(texto(x + 10, cy, a, { tamano: 11, color: '#334155', mono: true }));
      cy += 16;
    }
    cursor += altoAtributos;
    if (metodos.length) {
      partes.push(`<line x1="${x}" y1="${cursor}" x2="${x + W}" y2="${cursor}" stroke="${t.borde}" stroke-width="1.5"/>`);
    }
  }
  if (metodos.length) {
    let cy = cursor + 16;
    for (const m of metodos) {
      partes.push(texto(x + 10, cy, m, { tamano: 11, color: '#334155', mono: true }));
      cy += 16;
    }
  }
  return { svg: partes.join('\n  '), x, y, w: W, h: H };
}

/**
 * Puntas de flecha de UML, dibujadas en el extremo de la línea.
 *
 * Cada relación tiene la suya y no son intercambiables: el rombo relleno de la
 * composición y el hueco de la agregación significan cosas distintas sobre el
 * ciclo de vida del objeto contenido.
 */
function punta(tipo, x, y, angulo, color) {
  const r = (g) => (g * Math.PI) / 180;
  const p = (d, a) => `${(x + d * Math.cos(r(angulo + a))).toFixed(1)},${(y + d * Math.sin(r(angulo + a))).toFixed(1)}`;
  switch (tipo) {
    case 'herencia':
    case 'realizacion':
      return `<polygon points="${x},${y} ${p(14, 152)} ${p(14, -152)}" fill="#ffffff" stroke="${color}" stroke-width="1.5"/>`;
    case 'composicion':
      return `<polygon points="${x},${y} ${p(9, 148)} ${p(17, 180)} ${p(9, -148)}" fill="${color}" stroke="${color}" stroke-width="1.5"/>`;
    case 'agregacion':
      return `<polygon points="${x},${y} ${p(9, 148)} ${p(17, 180)} ${p(9, -148)}" fill="#ffffff" stroke="${color}" stroke-width="1.5"/>`;
    case 'flecha':
    case 'dependencia':
    case 'dirigida':
      return `<path d="M ${p(11, 158)} L ${x},${y} L ${p(11, -158)}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    default:
      return '';
  }
}

/**
 * Relación entre dos puntos.
 *
 * `puntos` es la polilínea completa; el primer punto es el origen y el último
 * el destino, donde se dibuja la punta. Las multiplicidades se colocan junto a
 * sus extremos, que es donde UML las pide, no en el medio.
 */
function relacion({ puntos, tipo = 'asociacion', etiqueta, multOrigen, multDestino, color = LINEA, desplazarEtiqueta = 0 }) {
  const d = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const discontinua = tipo === 'dependencia' || tipo === 'realizacion';
  const partes = [
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.5"${discontinua ? ' stroke-dasharray="6 4"' : ''}/>`,
  ];

  const ultimo = puntos[puntos.length - 1];
  const penultimo = puntos[puntos.length - 2];
  const angulo = (Math.atan2(ultimo[1] - penultimo[1], ultimo[0] - penultimo[0]) * 180) / Math.PI;
  const cabeza = { asociacion: '', dirigida: 'flecha', dependencia: 'dependencia', herencia: 'herencia', realizacion: 'realizacion' }[tipo] ?? tipo;
  if (cabeza) partes.push(punta(cabeza, ultimo[0], ultimo[1], angulo, color));

  if (etiqueta) {
    const medio = puntos[Math.floor((puntos.length - 1) / 2)];
    const siguiente = puntos[Math.floor((puntos.length - 1) / 2) + 1] ?? ultimo;
    const mx = (medio[0] + siguiente[0]) / 2;
    const my = (medio[1] + siguiente[1]) / 2;
    const w = ancho(etiqueta, 11) + 12;
    partes.push(`<rect x="${mx - w / 2}" y="${my - 9 + desplazarEtiqueta}" width="${w}" height="17" rx="4" fill="#ffffff" stroke="none"/>`);
    partes.push(texto(mx, my + 4 + desplazarEtiqueta, etiqueta, { tamano: 11, color: TENUE, anclaje: 'middle' }));
  }
  // Las multiplicidades se separan a lo largo de la propia linea, no con un
  // desplazamiento fijo: con un offset constante se montan sobre la caja en
  // cuanto la relacion cambia de direccion.
  const colocar = (extremo, vecino, mult) => {
    const dx = vecino[0] - extremo[0];
    const dy = vecino[1] - extremo[1];
    const largo = Math.hypot(dx, dy) || 1;
    const sep = mult.sep ?? 16;
    const x = extremo[0] + (dx / largo) * sep;
    const y = extremo[1] + (dy / largo) * sep;
    // Horizontal: encima de la linea. Vertical: a un lado.
    const horizontal = Math.abs(dx) > Math.abs(dy);
    return texto(
      x + (horizontal ? 0 : 9),
      y + (horizontal ? -7 : 4),
      mult.texto,
      { tamano: 11, peso: 600, color: '#334155', anclaje: horizontal ? 'middle' : 'start' },
    );
  };
  if (multOrigen) partes.push(colocar(puntos[0], puntos[1], multOrigen));
  if (multDestino) partes.push(colocar(ultimo, penultimo, multDestino));
  return partes.join('\n  ');
}

/** Nota adhesiva de UML: rectángulo con la esquina superior derecha doblada. */
function nota({ x, y, w, lineas, tono = 'ambar' }) {
  const t = TONOS[tono];
  const h = lineas.length * 15 + 18;
  const c = 12;
  const partes = [
    `<path d="M ${x} ${y} L ${x + w - c} ${y} L ${x + w} ${y + c} L ${x + w} ${y + h} L ${x} ${y + h} Z" fill="${t.fondo}" stroke="${t.borde}" stroke-width="1.2"/>`,
    `<path d="M ${x + w - c} ${y} L ${x + w - c} ${y + c} L ${x + w} ${y + c}" fill="none" stroke="${t.borde}" stroke-width="1.2"/>`,
  ];
  let cy = y + 17;
  for (const l of lineas) {
    partes.push(texto(x + 10, cy, l, { tamano: 11, color: t.texto }));
    cy += 15;
  }
  return partes.join('\n  ');
}

/** Envoltorio del documento SVG. */
function svg(w, h, cuerpo, titulo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(titulo)}">
  <title>${esc(titulo)}</title>
  ${cuerpo}
</svg>
`;
}

export { caja, claseUML, relacion, nota, texto, svg, ancho, TONOS, TENUE, LINEA };

// ---------------------------------------------------------------------------
// Los diagramas
// ---------------------------------------------------------------------------

const diagramas = {};

// --- 1. Mapa de la evaluación ---------------------------------------------
{
  const partes = [];
  const pasos = [
    { n: '1', t: 'Análisis POO', c: '1.1.1', tono: 'verde', d: ['4 entidades', '4 elementos', '3 conceptos POO'] },
    { n: '2', t: 'Modelo UML', c: '1.1.2', tono: 'cian', d: ['3 clases', '3 relaciones', 'diagrama'] },
    { n: '3', t: 'Crítica con IA', c: '1.1.3', tono: 'violeta', d: ['2 iteraciones', '2 prompts', '4 hallazgos'] },
    { n: '4', t: 'Validación final', c: '1.1.4', tono: 'ambar', d: ['3 principios', 'trazabilidad', 'diagrama final'] },
  ];
  pasos.forEach((p, i) => {
    const x = 24 + i * 228;
    partes.push(caja({ x, y: 58, w: 200, h: 128, titulo: p.t, lineas: p.d, tono: p.tono, numero: p.n }));
    partes.push(texto(x + 200 - 13, 176, p.c, { tamano: 10.5, peso: 700, color: TONOS[p.tono].borde, anclaje: 'end', mono: true }));
    if (i < pasos.length - 1) {
      partes.push(relacion({ puntos: [[x + 202, 122], [x + 222, 122]], tipo: 'dirigida' }));
    }
  });
  partes.push(texto(480, 30, 'Los cuatro pasos alimentan un único entregable', { tamano: 13.5, peso: 650, color: '#0f172a', anclaje: 'middle' }));
  partes.push(caja({ x: 176, y: 232, w: 290, h: 74, titulo: 'Informe técnico', lineas: ['Escrito. Pesa la estructura', 'y la evidencia de cada paso.'], tono: 'azul' }));
  partes.push(caja({ x: 494, y: 232, w: 290, h: 74, titulo: 'Defensa oral', lineas: ['Se evalúa en los CUATRO pasos.', 'No es un extra: está en la guía.'], tono: 'rosa' }));
  for (let i = 0; i < 4; i += 1) {
    partes.push(relacion({ puntos: [[124 + i * 228, 188], [124 + i * 228, 210], [i < 2 ? 321 : 639, 210], [i < 2 ? 321 : 639, 230]], tipo: 'dirigida' }));
  }
  diagramas['mapa-evaluacion.svg'] = svg(960, 330, partes.join('\n  '), 'Mapa de la evaluación: cuatro pasos que alimentan el informe y la defensa oral');
}

// --- 2. Anatomía de una clase UML -----------------------------------------
{
  const partes = [];
  const c = claseUML({
    x: 300, y: 60, w: 300,
    nombre: 'Empleado',
    atributos: ['- id: str', '- nombre: str', '# salarioBase: float', '+ activo: bool'],
    metodos: ['+ calcularSueldo(): float', '+ asignarA(d: Departamento)', '- validar(): None'],
    tono: 'verde',
  });
  partes.push(c.svg);
  partes.push(texto(450, 30, 'Los tres compartimentos de una clase', { tamano: 14, peso: 700, anclaje: 'middle' }));

  const notas = [
    { y: 74, t: 'Nombre. En cursiva si es abstracta.', lado: 'izq' },
    { y: 108, t: 'Atributos: visibilidad, nombre y tipo.', lado: 'izq' },
    { y: 196, t: 'Métodos: firma y tipo de retorno.', lado: 'izq' },
  ];
  notas.forEach((n) => {
    partes.push(relacion({ puntos: [[290, n.y], [270, n.y]], tipo: 'dependencia', color: '#94a3b8' }));
    partes.push(texto(262, n.y + 4, n.t, { tamano: 11.5, color: TENUE, anclaje: 'end' }));
  });

  partes.push(nota({
    x: 620, y: 62, w: 300, tono: 'gris',
    lineas: [
      'Visibilidad, la notación exacta:',
      '   -  privado      # protegido',
      '   +  público      ~ de paquete',
      '',
      'El error más común es omitirla del todo,',
      'o poner "private" en vez del signo.',
    ],
  }));
  partes.push(nota({
    x: 620, y: 200, w: 300, tono: 'ambar',
    lineas: [
      'Un atributo o método estático se',
      'subraya. Uno abstracto va en cursiva.',
      'Son los dos detalles que casi ninguna',
      'IA dibuja bien.',
    ],
  }));
  diagramas['anatomia-clase.svg'] = svg(960, 300, partes.join('\n  '), 'Anatomía de una clase UML: nombre, atributos y métodos con su visibilidad');
}

// --- 3. Las seis relaciones ------------------------------------------------
{
  const partes = [];
  partes.push(texto(480, 28, 'Las relaciones de UML y cuándo se usa cada una', { tamano: 14, peso: 700, anclaje: 'middle' }));
  const filas = [
    { tipo: 'asociacion', nombre: 'Asociación', desc: 'Se conocen. La más común.', ejemplo: 'Empleado — Proyecto' },
    { tipo: 'dirigida', nombre: 'Asociación dirigida', desc: 'A conoce a B, pero B no a A.', ejemplo: 'Pedido → Cliente' },
    { tipo: 'agregacion', nombre: 'Agregación', desc: 'La parte sobrevive al todo.', ejemplo: 'Departamento ◇— Empleado' },
    { tipo: 'composicion', nombre: 'Composición', desc: 'La parte muere con el todo.', ejemplo: 'Proyecto ◆— Tarea' },
    { tipo: 'herencia', nombre: 'Generalización', desc: '"Es un". Herencia.', ejemplo: 'Contratista → Empleado' },
    { tipo: 'dependencia', nombre: 'Dependencia', desc: 'La usa de paso, sin guardarla.', ejemplo: 'Informe ⇢ Exportador' },
  ];
  filas.forEach((f, i) => {
    const y = 68 + i * 52;
    partes.push(`<rect x="24" y="${y - 22}" width="912" height="44" rx="7" fill="${i % 2 ? '#f8fafc' : '#ffffff'}" stroke="#e2e8f0" stroke-width="1"/>`);
    // El trazo se dibuja de derecha a izquierda para que la punta quede a la
    // izquierda, que es donde UML pone el "todo" o la superclase.
    partes.push(relacion({ puntos: [[210, y], [60, y]], tipo: f.tipo }));
    partes.push(texto(240, y - 3, f.nombre, { tamano: 12.5, peso: 650 }));
    partes.push(texto(240, y + 13, f.desc, { tamano: 11, color: TENUE }));
    partes.push(texto(920, y + 4, f.ejemplo, { tamano: 11.5, color: '#334155', anclaje: 'end', mono: true }));
  });
  diagramas['relaciones-uml.svg'] = svg(960, 400, partes.join('\n  '), 'Las seis relaciones de UML con su notación y un ejemplo de cada una');
}

// --- 4. Agregación contra composición --------------------------------------
{
  const partes = [];
  partes.push(texto(470, 28, 'La pregunta que decide: ¿la parte sobrevive al todo?', { tamano: 14, peso: 700, anclaje: 'middle' }));

  partes.push(`<rect x="20" y="50" width="440" height="290" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>`);
  partes.push(texto(240, 76, 'AGREGACIÓN  ◇', { tamano: 13, peso: 700, color: TONOS.cian.borde, anclaje: 'middle' }));
  partes.push(texto(240, 96, 'Rombo hueco. Vidas independientes.', { tamano: 11.5, color: TENUE, anclaje: 'middle' }));
  const dep = claseUML({ x: 40, y: 122, w: 150, nombre: 'Departamento', atributos: ['- nombre: str'], tono: 'cian' });
  const emp = claseUML({ x: 290, y: 122, w: 130, nombre: 'Empleado', atributos: ['- legajo: str'], tono: 'verde' });
  partes.push(dep.svg, emp.svg);
  partes.push(relacion({ puntos: [[290, 145], [190, 145]], tipo: 'agregacion', color: TONOS.cian.borde, multOrigen: { texto: '0..*' }, multDestino: { texto: '1' } }));
  partes.push(nota({ x: 56, y: 216, w: 358, tono: 'cian', lineas: [
    'Si se elimina el departamento, los empleados',
    'siguen existiendo: se reasignan a otro. El',
    'empleado NO es una pieza del departamento,',
    'es alguien que pertenece a él por ahora.',
  ] }));

  partes.push(`<rect x="480" y="50" width="440" height="290" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>`);
  partes.push(texto(700, 76, 'COMPOSICIÓN  ◆', { tamano: 13, peso: 700, color: TONOS.violeta.borde, anclaje: 'middle' }));
  partes.push(texto(700, 96, 'Rombo relleno. La parte muere con el todo.', { tamano: 11.5, color: TENUE, anclaje: 'middle' }));
  const pro = claseUML({ x: 500, y: 122, w: 130, nombre: 'Proyecto', atributos: ['- codigo: str'], tono: 'violeta' });
  const reg = claseUML({ x: 730, y: 122, w: 155, nombre: 'RegistroTiempo', atributos: ['- horas: float'], tono: 'ambar' });
  partes.push(pro.svg, reg.svg);
  partes.push(relacion({ puntos: [[730, 145], [630, 145]], tipo: 'composicion', color: TONOS.violeta.borde, multOrigen: { texto: '0..*' }, multDestino: { texto: '1' } }));
  partes.push(nota({ x: 516, y: 216, w: 363, tono: 'violeta', lineas: [
    'Un registro de horas no significa nada sin su',
    'proyecto. Si el proyecto desaparece, sus',
    'registros desaparecen con él: no hay a dónde',
    'reasignarlos.',
  ] }));
  diagramas['agregacion-vs-composicion.svg'] = svg(940, 360, partes.join('\n  '), 'Agregación contra composición: la parte sobrevive al todo o no');
}

// --- 5. Multiplicidades -----------------------------------------------------
{
  const partes = [];
  partes.push(texto(430, 28, 'Multiplicidades: dónde se escriben y qué significan', { tamano: 14, peso: 700, anclaje: 'middle' }));
  const a = claseUML({ x: 130, y: 62, w: 170, nombre: 'Departamento', tono: 'cian' });
  const b = claseUML({ x: 560, y: 62, w: 170, nombre: 'Empleado', tono: 'verde' });
  partes.push(a.svg, b.svg);
  partes.push(relacion({ puntos: [[300, 76], [560, 76]], tipo: 'asociacion', multOrigen: { texto: '1', sep: 22 }, multDestino: { texto: '0..*', sep: 26 } }));
  partes.push(texto(430, 100, 'agrupa a', { tamano: 11.5, color: TENUE, anclaje: 'middle' }));
  partes.push(nota({ x: 262, y: 116, w: 336, tono: 'ambar', lineas: [
    'La multiplicidad de un extremo describe',
    'CUÁNTOS objetos de ESE lado ve un objeto',
    'del otro. Se lee: "un departamento agrupa',
    'a cero o más empleados".',
  ] }));

  const tabla = [
    ['1', 'exactamente uno', 'un empleado tiene un contrato'],
    ['0..1', 'ninguno o uno', 'un empleado puede no tener jefe'],
    ['1..*', 'uno o más', 'un proyecto tiene al menos una persona'],
    ['*  ó  0..*', 'cero o más', 'un departamento puede estar vacío'],
    ['2..5', 'un rango cerrado', 'un comité de dos a cinco miembros'],
  ];
  tabla.forEach((fila, i) => {
    const y = 232 + i * 34;
    partes.push(`<rect x="60" y="${y - 20}" width="770" height="30" rx="6" fill="${i % 2 ? '#f8fafc' : '#ffffff'}" stroke="#e2e8f0"/>`);
    partes.push(texto(78, y, fila[0], { tamano: 12, peso: 700, color: TONOS.violeta.borde, mono: true }));
    partes.push(texto(230, y, fila[1], { tamano: 12 }));
    partes.push(texto(410, y, fila[2], { tamano: 11.5, color: TENUE }));
  });
  diagramas['multiplicidades.svg'] = svg(860, 412, partes.join('\n  '), 'Multiplicidades de UML: notación, significado y ejemplo');
}

// --- 6. El ciclo del uso crítico de IA -------------------------------------
{
  const partes = [];
  partes.push(texto(470, 28, 'El ciclo que la guía evalúa en el Paso 3', { tamano: 14, peso: 700, anclaje: 'middle' }));
  const etapas = [
    { t: 'Tu análisis', d: ['Primero el tuyo.', 'Es el patrón de', 'comparación.'], tono: 'verde', n: '1' },
    { t: 'Prompt a la IA', d: ['Documentado', 'literalmente:', 'contexto + formato.'], tono: 'violeta', n: '2' },
    { t: 'Modelo generado', d: ['Se guarda tal cual', 'salió, con errores', 'y todo.'], tono: 'gris', n: '3' },
    { t: 'Crítica técnica', d: ['4+ hallazgos', 'clasificados por', 'aspecto.'], tono: 'rosa', n: '4' },
    { t: 'Modelo refinado', d: ['Tu decisión, no', 'la de la IA.'], tono: 'cian', n: '5' },
  ];
  etapas.forEach((e, i) => {
    const x = 24 + i * 186;
    partes.push(caja({ x, y: 56, w: 162, h: 122, titulo: e.t, lineas: e.d, tono: e.tono, numero: e.n, tamanoTitulo: 12.5 }));
    if (i < etapas.length - 1) partes.push(relacion({ puntos: [[x + 164, 117], [x + 182, 117]], tipo: 'dirigida' }));
  });
  partes.push(relacion({ puntos: [[105, 180], [105, 212], [850, 212], [850, 180]], tipo: 'dirigida', color: TONOS.violeta.borde }));
  partes.push(texto(478, 230, 'Segunda iteración: el prompt mejora porque ya sabes qué falló. La guía pide DOS.', { tamano: 11.5, peso: 600, color: TONOS.violeta.borde, anclaje: 'middle' }));
  partes.push(nota({ x: 24, y: 252, w: 908, tono: 'rosa', lineas: [
    'Lo que hunde esta parte: entregar el diagrama de la IA sin tocarlo. La guía lo dice sin rodeos: "La entrega de resultados generados',
    'exclusivamente por IA, sin análisis ni ajustes, será considerada insuficiente". El valor evaluable NO es el diagrama: es la distancia',
    'entre lo que la IA propuso y lo que tú entregaste, y tu capacidad de explicar por qué.',
  ] }));
  diagramas['ciclo-ia.svg'] = svg(956, 340, partes.join('\n  '), 'Ciclo de uso crítico de IA: análisis propio, prompt, generación, crítica y refinamiento');
}

// --- 7. Estructura del informe: plantilla contra guía ----------------------
{
  const partes = [];
  partes.push(texto(470, 28, 'Cómo encajan la plantilla y la guía', { tamano: 14, peso: 700, anclaje: 'middle' }));
  partes.push(texto(200, 58, 'PLANTILLA (formato)', { tamano: 11.5, peso: 700, color: TONOS.azul.borde, anclaje: 'middle' }));
  partes.push(texto(740, 58, 'GUÍA (contenido)', { tamano: 11.5, peso: 700, color: TONOS.verde.borde, anclaje: 'middle' }));

  const plantilla = ['Portada', 'Índice', 'I. Introducción', 'II. Objetivo', 'III. Desarrollo', 'IV. Conclusiones', 'V. Referencias'];
  plantilla.forEach((s, i) => {
    const y = 78 + i * 42;
    const destacado = s === 'III. Desarrollo';
    partes.push(caja({ x: 60, y, w: 280, h: 32, titulo: s, tono: destacado ? 'azul' : 'gris', tamanoTitulo: 12 }));
  });

  const guia = [
    { t: 'Análisis del problema', p: 'Paso 1' },
    { t: 'Diseño del sistema (UML)', p: 'Paso 2' },
    { t: 'Uso de herramientas de IA', p: 'Paso 3' },
    { t: 'Mejoras aplicadas', p: 'Paso 4' },
  ];
  guia.forEach((s, i) => {
    const y = 128 + i * 48;
    partes.push(caja({ x: 600, y, w: 300, h: 38, titulo: s.t, tono: 'verde', tamanoTitulo: 12 }));
    partes.push(texto(890, y + 33, s.p, { tamano: 10, peso: 700, color: TONOS.verde.borde, anclaje: 'end' }));
    partes.push(relacion({ puntos: [[344, 258], [470, 258], [470, y + 19], [596, y + 19]], tipo: 'dirigida', color: TONOS.azul.borde }));
  });

  partes.push(nota({ x: 60, y: 388, w: 840, tono: 'ambar', lineas: [
    'La plantilla no tiene apartados para el análisis de IA ni para el diagrama. No es un descuido: es una plantilla genérica de la',
    'institución, y ella misma avisa de que "cada docente DEBE modificar, ajustar o completar los apartados". Las cuatro secciones que',
    'pide la guía se convierten en subtítulos DENTRO de "III. Desarrollo". Así se respetan las dos y no hay que elegir.',
  ] }));
  diagramas['estructura-informe.svg'] = svg(960, 470, partes.join('\n  '), 'Las secciones de la guía encajan como subtítulos dentro del Desarrollo de la plantilla');
}

// ---------------------------------------------------------------------------

await mkdir(SALIDA, { recursive: true });
for (const [nombre, contenido] of Object.entries(diagramas)) {
  await writeFile(path.join(SALIDA, nombre), contenido, 'utf8');
}
console.log(`${Object.keys(diagramas).length} diagramas escritos en guia-de-aprobacion/diagramas/`);
for (const nombre of Object.keys(diagramas)) console.log(`  ${nombre}`);
