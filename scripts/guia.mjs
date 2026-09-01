/**
 * Generador del sitio estático de la Guía de Aprobación.
 *
 * La guía se escribe UNA sola vez, en Markdown, dentro de `guia-de-aprobacion/`.
 * Ese directorio es lo que se lee en GitHub; este script traduce el mismo
 * material a HTML dentro de `dist/guia/` para que se publique junto al sistema.
 * No hay dos copias del contenido: hay una fuente y dos renderizadores.
 *
 * ## Por qué un renderizador propio y no una librería
 *
 * El proyecto no tiene ni una dependencia en tiempo de ejecución, y añadir un
 * `marked` o un `markdown-it` para trece documentos rompería esa propiedad por
 * comodidad. El subconjunto de Markdown que la guía usa está cerrado y descrito
 * abajo: encabezados, párrafos, listas, tablas, citas, bloques de código,
 * reglas horizontales, avisos y diagramas. Cuatrocientas líneas cubren eso con
 * exactitud y sin sorpresas.
 *
 * ## La CSP manda en el diseño
 *
 * `_headers` aplica `style-src 'self'` y `script-src 'self'` a todo el sitio.
 * De ahí salen dos decisiones que aquí son innegociables:
 *
 *  - No se emite ni un atributo `style` ni una etiqueta `<style>`: todo el
 *    aspecto vive en `guia.css`, que se copia como archivo aparte.
 *  - Los diagramas NO se cargan con Mermaid ni con ninguna librería de cliente,
 *    porque `script-src 'self'` prohíbe el CDN. Se escriben a mano como SVG en
 *    `guia-de-aprobacion/diagramas/` y este script los INCRUSTA en el HTML. Así
 *    GitHub los muestra como imagen y la web los muestra como marcado, desde el
 *    mismo archivo y sin una petición extra.
 */

import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR_GUIA = path.join(RAIZ, 'guia-de-aprobacion');
const DIR_DIAGRAMAS = path.join(DIR_GUIA, 'diagramas');

// ---------------------------------------------------------------------------
// Utilidades de texto
// ---------------------------------------------------------------------------

/**
 * Escape de HTML.
 *
 * Se aplica al texto ANTES de sustituir el marcado en línea, de modo que un
 * `<` escrito en la guía se vea como `<` y no abra una etiqueta. Es la misma
 * regla que sigue el cliente de la aplicación: el contenido nunca se interpreta
 * como marcado salvo donde este archivo lo decide explícitamente.
 */
function escapar(texto) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Identificador de ancla a partir del texto de un encabezado.
 *
 * Se quitan las tildes para que el enlace sea legible y estable en una URL;
 * la eñe pasa a `n` por el mismo motivo. El texto visible conserva su
 * ortografía: esto solo afecta al `id`.
 */
function ancla(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * Marcado en línea: negrita, cursiva, código, enlaces.
 *
 * El código se extrae PRIMERO y se aparta detrás de un centinela, porque dentro
 * de un `código` los asteriscos y los corchetes son literales. Sin ese paso,
 * escribir `**` como ejemplo de sintaxis lo convertiría en negrita.
 */
function enLinea(texto) {
  const apartados = [];
  // El centinela es NUL, que no puede aparecer en el Markdown fuente. Con un
  // separador visible la restauracion confundiria cualquier numero suelto de la
  // prosa ("en 3 pasos") con un fragmento de codigo apartado.
  let t = texto.replace(/`([^`]+)`/g, (_todo, codigo) => {
    apartados.push(`<code>${escapar(codigo)}</code>`);
    return `\u0000${apartados.length - 1}\u0000`;
  });

  t = escapar(t);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_todo, rotulo, destino) => {
    const externo = /^https?:/.test(destino);
    const atributos = externo ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${escapar(destino)}"${atributos}>${rotulo}</a>`;
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Cursiva, con la regla de "flanqueo" de CommonMark en version reducida: el
  // asterisco de apertura puede ir tras cualquier caracter que no sea de
  // palabra -incluida una raya, que es como se citan aqui las vinietas de la
  // guia: --*"Ajusta la version final"*-- pero no puede llevar un espacio
  // detras. Esa ultima condicion es la que deja intacta la multiplicidad `0..*`
  // y la notacion `*` de UML, que no son enfasis.
  t = t.replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?=[^\w*]|$)/g, '$1<em>$2</em>');

  return t.replace(/\u0000(\d+)\u0000/g, (_todo, indice) => apartados[Number(indice)]);
}

// ---------------------------------------------------------------------------
// Bloques
// ---------------------------------------------------------------------------

/** Tipos de aviso admitidos y el rótulo que se pinta en su cabecera. */
const AVISOS = {
  nota: 'Nota',
  clave: 'Lo que se evalúa',
  aviso: 'Cuidado',
  ambiguedad: 'Ambigüedad',
  avanzado: 'Nivel avanzado',
  trampa: 'Trampa frecuente',
  ejemplo: 'Ejemplo',
};

/**
 * Traduce un documento Markdown completo a HTML.
 *
 * Devuelve también el índice de encabezados de nivel 2 y 3, que la plantilla
 * usa para pintar el sumario lateral de la página.
 */
function renderizar(md, diagramas) {
  const lineas = md.split('\n');
  const salida = [];
  const indice = [];
  let i = 0;

  /** Cierra las listas abiertas hasta la profundidad indicada. */
  const pila = [];
  function cerrarListas(hasta = 0) {
    while (pila.length > hasta) salida.push(pila.pop() === 'ul' ? '</ul>' : '</ol>');
  }

  while (i < lineas.length) {
    const linea = lineas[i];

    // --- Bloque de código ---------------------------------------------------
    if (/^```/.test(linea)) {
      cerrarListas();
      const lenguaje = linea.slice(3).trim();
      const cuerpo = [];
      i += 1;
      while (i < lineas.length && !/^```/.test(lineas[i])) {
        cuerpo.push(lineas[i]);
        i += 1;
      }
      i += 1;
      const rotulo = lenguaje ? `<span class="codigo-lenguaje">${escapar(lenguaje)}</span>` : '';
      salida.push(`<div class="bloque-codigo">${rotulo}<pre><code>${escapar(cuerpo.join('\n'))}</code></pre></div>`);
      continue;
    }

    // --- Aviso --------------------------------------------------------------
    const aviso = /^:::(\w+)(?:\s+(.*))?$/.exec(linea);
    if (aviso) {
      cerrarListas();
      const tipo = AVISOS[aviso[1]] ? aviso[1] : 'nota';
      const titulo = aviso[2] ? aviso[2].trim() : AVISOS[tipo];
      const cuerpo = [];
      i += 1;
      while (i < lineas.length && !/^:::\s*$/.test(lineas[i])) {
        cuerpo.push(lineas[i]);
        i += 1;
      }
      i += 1;
      salida.push(
        `<aside class="aviso aviso-${tipo}">` +
          `<p class="aviso-titulo">${enLinea(titulo)}</p>` +
          renderizar(cuerpo.join('\n'), diagramas).html +
          `</aside>`,
      );
      continue;
    }

    // --- Diagrama incrustado ------------------------------------------------
    const imagen = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(linea);
    if (imagen) {
      cerrarListas();
      const nombre = path.basename(imagen[2]);
      const svg = diagramas.get(nombre);
      if (svg) {
        const pie = imagen[1] ? `<figcaption>${enLinea(imagen[1])}</figcaption>` : '';
        salida.push(`<figure class="diagrama">${svg}${pie}</figure>`);
      } else {
        salida.push(`<figure class="diagrama"><p class="diagrama-ausente">Falta el diagrama <code>${escapar(nombre)}</code></p></figure>`);
      }
      i += 1;
      continue;
    }

    // --- Tabla --------------------------------------------------------------
    if (/^\|/.test(linea) && /^\|[\s:|-]+\|\s*$/.test(lineas[i + 1] ?? '')) {
      cerrarListas();
      const celdas = (fila) =>
        fila
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim());
      const encabezados = celdas(linea);
      // La fila separadora define la alineación de cada columna con `:`.
      const alineaciones = celdas(lineas[i + 1]).map((sep) => {
        if (/^:-+:$/.test(sep)) return ' class="centro"';
        if (/-+:$/.test(sep)) return ' class="derecha"';
        return '';
      });
      i += 2;
      const filas = [];
      while (i < lineas.length && /^\|/.test(lineas[i])) {
        filas.push(celdas(lineas[i]));
        i += 1;
      }
      const th = encabezados
        .map((c, n) => `<th${alineaciones[n] ?? ''}>${enLinea(c)}</th>`)
        .join('');
      const tbody = filas
        .map(
          (fila) =>
            `<tr>${fila.map((c, n) => `<td${alineaciones[n] ?? ''}>${enLinea(c)}</td>`).join('')}</tr>`,
        )
        .join('');
      salida.push(
        `<div class="tabla-envoltorio"><table><thead><tr>${th}</tr></thead><tbody>${tbody}</tbody></table></div>`,
      );
      continue;
    }

    // --- Encabezado ---------------------------------------------------------
    const encabezado = /^(#{1,5})\s+(.*)$/.exec(linea);
    if (encabezado) {
      cerrarListas();
      const nivel = encabezado[1].length;
      const texto = encabezado[2].trim();
      const id = ancla(texto);
      if (nivel === 2 || nivel === 3) indice.push({ nivel, texto, id });
      salida.push(`<h${nivel} id="${id}">${enLinea(texto)}</h${nivel}>`);
      i += 1;
      continue;
    }

    // --- Regla horizontal ---------------------------------------------------
    if (/^---+\s*$/.test(linea)) {
      cerrarListas();
      salida.push('<hr>');
      i += 1;
      continue;
    }

    // --- Cita ---------------------------------------------------------------
    if (/^>\s?/.test(linea)) {
      cerrarListas();
      const cuerpo = [];
      while (i < lineas.length && /^>\s?/.test(lineas[i])) {
        cuerpo.push(lineas[i].replace(/^>\s?/, ''));
        i += 1;
      }
      salida.push(`<blockquote>${renderizar(cuerpo.join('\n'), diagramas).html}</blockquote>`);
      continue;
    }

    // --- Lista --------------------------------------------------------------
    const elemento = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(linea);
    if (elemento) {
      const profundidad = Math.floor(elemento[1].length / 2) + 1;
      const ordenada = /\d/.test(elemento[2]);
      const etiqueta = ordenada ? 'ol' : 'ul';
      if (profundidad > pila.length) {
        salida.push(`<${etiqueta}>`);
        pila.push(etiqueta);
      } else {
        cerrarListas(profundidad);
        if (pila.length === 0) {
          salida.push(`<${etiqueta}>`);
          pila.push(etiqueta);
        }
      }

      // Continuacion perezosa: un elemento de lista que ocupa varias lineas.
      // Sin esto, la segunda linea se convertia en un parrafo suelto fuera de
      // la lista, y cualquier marcado que cruzara el salto -una cursiva que
      // abre en una linea y cierra en la siguiente- se quedaba sin cerrar y se
      // veia con los asteriscos crudos.
      const partes = [elemento[3]];
      let j = i + 1;
      while (
        j < lineas.length &&
        lineas[j].trim() !== '' &&
        !/^(#{1,5}\s|>|```|:::|\||!\[|---+\s*$|\s*([-*]|\d+\.)\s)/.test(lineas[j])
      ) {
        partes.push(lineas[j].trim());
        j += 1;
      }
      salida.push(`<li>${enLinea(partes.join(' '))}</li>`);
      i = j;
      continue;
    }

    // --- Párrafo ------------------------------------------------------------
    if (linea.trim() === '') {
      cerrarListas();
      i += 1;
      continue;
    }
    const parrafo = [];
    while (
      i < lineas.length &&
      lineas[i].trim() !== '' &&
      !/^(#{1,5}\s|>|```|:::|\||---+\s*$|\s*([-*]|\d+\.)\s)/.test(lineas[i])
    ) {
      parrafo.push(lineas[i]);
      i += 1;
    }
    if (parrafo.length) salida.push(`<p>${enLinea(parrafo.join(' '))}</p>`);
    else i += 1;
  }

  cerrarListas();
  return { html: salida.join('\n'), indice };
}

// ---------------------------------------------------------------------------
// Plantilla de página
// ---------------------------------------------------------------------------

/**
 * Envuelve el cuerpo renderizado en el armazón de la página.
 *
 * El armazón lo escribe este script y no un archivo aparte porque tiene que
 * conocer el índice de documentos para pintar la navegación lateral y los
 * enlaces de anterior/siguiente.
 */
function pagina({ titulo, descripcion, cuerpo, indice, documentos, actual }) {
  const posicion = documentos.findIndex((d) => d.destino === actual);
  const anterior = documentos[posicion - 1];
  const siguiente = documentos[posicion + 1];

  const navegacion = documentos
    .map((d) => {
      const clase = d.destino === actual ? ' class="activo"' : '';
      return `<li${clase}><a href="${d.destino}"><span class="nav-numero">${escapar(d.numero)}</span><span>${escapar(d.titulo)}</span></a></li>`;
    })
    .join('');

  const sumario = indice.length
    ? `<nav class="sumario" aria-label="Contenido de esta página"><p class="sumario-titulo">En esta página</p><ul>${indice
        .map((h) => `<li class="nivel-${h.nivel}"><a href="#${h.id}">${escapar(sinMarcado(h.texto))}</a></li>`)
        .join('')}</ul></nav>`
    : '';

  const pies = [];
  if (anterior) pies.push(`<a class="salto salto-anterior" href="${anterior.destino}"><span>Anterior</span><strong>${escapar(anterior.titulo)}</strong></a>`);
  if (siguiente) pies.push(`<a class="salto salto-siguiente" href="${siguiente.destino}"><span>Siguiente</span><strong>${escapar(siguiente.titulo)}</strong></a>`);

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${escapar(/Gu[íi]a de Aprobaci[óo]n/i.test(titulo) ? titulo : `${titulo} · Guía de Aprobación TI3021`)}</title>
    <meta name="description" content="${escapar(descripcion)}">
    <meta name="robots" content="noindex, nofollow">
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath fill='%230d7d5a' d='M28 4C14 4 5 12 5 21c0 4 2 7 5 8 9 3 19-7 18-25Z'/%3E%3Cpath fill='none' stroke='%23eef6f0' stroke-width='1.8' stroke-linecap='round' d='M25 7C18 11 13 18 10 28'/%3E%3C/svg%3E">
    <link rel="stylesheet" href="guia.css">
  </head>
  <body>
    <a class="saltar-al-contenido" href="#contenido">Saltar al contenido</a>
    <header class="cabecera-guia">
      <a class="marca-guia" href="index.html">
        <span class="marca-guia-icono" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 4C11 4 5 8.5 5 15c0 2.6 1.4 4.5 3.4 5.3"/>
            <path d="M20 4c1 9-4.5 14.5-11 14.5"/>
            <path d="M8.5 20.3C10 14 14 9 18.5 6.5"/>
          </svg>
        </span>
        <span class="marca-guia-texto">
          <strong>Guía de Aprobación</strong>
          <span>TI3021 · Unidad 1 · Modelado Orientado a Objetos</span>
        </span>
      </a>
      <a class="enlace-sistema" href="/">Ir al sistema</a>
    </header>
    <div class="armazon-guia">
      <nav class="indice-guia" aria-label="Documentos de la guía">
        <p class="indice-titulo">Documentos</p>
        <ul>${navegacion}</ul>
      </nav>
      <main class="contenido-guia" id="contenido">
        ${sumario}
        <article class="prosa">
${cuerpo}
        </article>
        ${pies.length ? `<nav class="saltos" aria-label="Navegación entre documentos">${pies.join('')}</nav>` : ''}
      </main>
    </div>
  </body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Construcción
// ---------------------------------------------------------------------------

/**
 * Quita el marcado en linea de un texto.
 *
 * El sumario lateral y los rotulos de navegacion son texto plano: pintar ahi
 * un `<strong>` desalinearia la lista, y escapar el texto crudo dejaba los
 * asteriscos a la vista. Se quitan los marcadores y se conserva el contenido.
 */
function sinMarcado(texto) {
  return texto
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}

/** Lee el primer `# Título` del documento; es el rótulo de la navegación. */
function tituloDe(md, respaldo) {
  const m = /^#\s+(.*)$/m.exec(md);
  return m ? m[1].trim() : respaldo;
}

/** Lee el primer párrafo como descripción para el `<meta>` y para el índice. */
function descripcionDe(md) {
  const cuerpo = md.replace(/^#.*$/m, '');
  const m = /^(?!\s*[#>|:`-])(.+)$/m.exec(cuerpo);
  return m ? m[1].trim().replace(/[*`\[\]]/g, '').slice(0, 180) : '';
}

/**
 * Comprueba que un documento use solo el subconjunto que el renderizador
 * entiende, y falla el build si no.
 *
 * Un renderizador propio tiene una desventaja frente a una libreria: no avisa.
 * Un aviso sin cerrar no da error, simplemente se come el resto del documento;
 * un enlace a `.md` no da error, simplemente lleva a un 404. Es justo la clase
 * de fallo que nadie ve hasta que ya esta publicado, asi que se comprueba aqui.
 */
function validar(nombre, md, diagramas, destinos) {
  const fallos = [];
  const lineas = md.split('\n');
  let dentroDeCodigo = false;
  let avisosAbiertos = 0;
  let titulosDeNivel1 = 0;

  lineas.forEach((linea, indice) => {
    const n = indice + 1;
    if (/^```/.test(linea)) {
      dentroDeCodigo = !dentroDeCodigo;
      return;
    }
    if (dentroDeCodigo) return;

    if (/^#\s+/.test(linea)) titulosDeNivel1 += 1;

    const aviso = /^:::(\w*)/.exec(linea);
    if (aviso) {
      if (aviso[1] === '') {
        avisosAbiertos -= 1;
      } else {
        avisosAbiertos += 1;
        if (!AVISOS[aviso[1]]) {
          fallos.push(`${nombre}:${n} aviso de tipo desconocido ":::${aviso[1]}"`);
        }
      }
    }

    for (const cita of linea.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const archivo = path.basename(cita[1]);
      if (!diagramas.has(archivo)) fallos.push(`${nombre}:${n} diagrama inexistente "${archivo}"`);
    }

    for (const enlace of linea.matchAll(/(?<!!)\[[^\]]+\]\(([^)\s]+)\)/g)) {
      const destino = enlace[1].split('#')[0];
      if (destino === '') continue;
      if (/^(https?:|mailto:)/.test(destino)) continue;
      if (destino.endsWith('.md') && !destino.startsWith('python/')) {
        fallos.push(`${nombre}:${n} enlace interno a "${destino}"; en la web es .html`);
      }
      if (destino.endsWith('.html') && !destinos.has(destino)) {
        fallos.push(`${nombre}:${n} enlace a un documento que no existe: "${destino}"`);
      }
    }
  });

  if (titulosDeNivel1 !== 1) {
    fallos.push(`${nombre}: tiene ${titulosDeNivel1} titulos de nivel 1; debe haber exactamente uno`);
  }
  if (avisosAbiertos !== 0) {
    fallos.push(`${nombre}: hay ${avisosAbiertos} aviso(s) ":::" sin cerrar`);
  }
  if (dentroDeCodigo) {
    fallos.push(`${nombre}: hay un bloque de codigo sin cerrar`);
  }
  return fallos;
}

export async function construirGuia(dirSalida) {
  let nombres;
  try {
    nombres = (await readdir(DIR_GUIA)).filter((n) => n.endsWith('.md')).sort();
  } catch {
    console.log('  guia-de-aprobacion/ no existe todavía; se omite');
    return 0;
  }
  if (nombres.length === 0) return 0;

  // Los diagramas se leen una vez y se incrustan donde el Markdown los cite.
  const diagramas = new Map();
  try {
    for (const nombre of await readdir(DIR_DIAGRAMAS)) {
      if (!nombre.endsWith('.svg')) continue;
      const svg = await readFile(path.join(DIR_DIAGRAMAS, nombre), 'utf8');
      // Se quita la declaración XML: dentro de un HTML sobra y algunos
      // navegadores la tratan como texto suelto antes del elemento.
      diagramas.set(nombre, svg.replace(/^<\?xml[^>]*\?>\s*/, '').trim());
    }
  } catch {
    /* sin diagramas todavía */
  }

  const fuentes = [];
  for (const nombre of nombres) {
    const md = await readFile(path.join(DIR_GUIA, nombre), 'utf8');
    const numero = /^(\d+)/.exec(nombre)?.[1] ?? '';
    fuentes.push({
      nombre,
      md,
      numero,
      titulo: sinMarcado(tituloDe(md, nombre)).replace(/^\d+\.\s*/, ''),
      descripcion: descripcionDe(md),
      destino: nombre === 'README.md' ? 'index.html' : nombre.replace(/\.md$/, '.html'),
    });
  }

  // El README encabeza siempre el índice; el resto va por número de archivo.
  fuentes.sort((a, b) => (a.destino === 'index.html' ? -1 : b.destino === 'index.html' ? 1 : 0));

  // Validacion antes de escribir nada: es preferible fallar el build a publicar
  // un documento con un aviso sin cerrar que se traga la mitad del texto.
  const destinos = new Set(fuentes.map((f) => f.destino));
  const fallos = fuentes.flatMap((f) => validar(f.nombre, f.md, diagramas, destinos));
  if (fallos.length) {
    console.error('\nLa guia de aprobacion tiene errores de formato:');
    for (const fallo of fallos) console.error(`  ${fallo}`);
    throw new Error(`${fallos.length} error(es) de formato en guia-de-aprobacion/`);
  }

  const destino = path.join(dirSalida, 'guia');
  await mkdir(destino, { recursive: true });

  for (const fuente of fuentes) {
    const { html, indice } = renderizar(fuente.md, diagramas);
    await writeFile(
      path.join(destino, fuente.destino),
      pagina({
        titulo: fuente.titulo,
        descripcion: fuente.descripcion,
        cuerpo: html,
        indice,
        documentos: fuentes,
        actual: fuente.destino,
      }),
      'utf8',
    );
  }

  await copyFile(path.join(RAIZ, 'src', 'cliente', 'guia.css'), path.join(destino, 'guia.css'));
  return fuentes.length;
}
