/**
 * Construcción del frontend estático que `wrangler deploy` pública.
 *
 * La salida vive en `dist/`, que es el directorio declarado en `wrangler.jsonc`
 * como almacén de assets: el Worker solo atiende `/api/*` y todo lo demás se
 * sirve desde aquí, con fallback de SPA a `index.html`. Este script es, por
 * tanto, el único responsable de que `index.html`, `app.js` y `estilos.css`
 * existan y sean coherentes entre si en el momento del despliegue.
 */

import * as esbuild from 'esbuild';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR_CLIENTE = path.join(RAIZ, 'src', 'cliente');

/** Nombre del directorio de assets, tal y como lo declara wrangler.jsonc. */
const SALIDA = 'dist';
const DIR_SALIDA = path.join(RAIZ, SALIDA);

/** Punto de entrada de la SPA; todo lo demás del cliente entra por sus imports. */
const ENTRADA = path.join(DIR_CLIENTE, 'main.ts');

/**
 * Configuración de TypeScript que se le pasa a esbuild, de forma explicita.
 *
 * El `tsconfig.json` de la raiz es un proyecto de solo referencias (`files: []`
 * + `references`) y esbuild no sigue las referencias de proyecto: si se dejara
 * autodescubrir la configuración, encontraria ese archivo sin `compilerOptions`
 * y perdería `useDefineForClassFields: false`. Los campos de clase pasarian
 * entonces a semántica `[[Define]]`, que pisa con `undefined` lo que la clase
 * base ya había asignado; con la jerarquía de entidades del dominio eso son
 * fallos en tiempo de ejecución que `tsc --noEmit` no puede ver.
 */
const TSCONFIG = path.join(RAIZ, 'tsconfig.cliente.json');

/** Archivos que se copian tal cual, sin pasar por el empaquetador. */
// `_headers` aplica las cabeceras de seguridad a los archivos estáticos. Es
// imprescindible: el Worker solo se invoca para /api/* (ver `run_worker_first`
// en wrangler.jsonc), así que las cabeceras de src/worker/http.ts NO llegan al
// HTML ni al bundle. Sin este archivo, la única página que ejecuta JavaScript
// se serviría sin Content-Security-Policy.
const ESTATICOS = ['index.html', 'estilos.css', '_headers'];

/**
 * Assets versionados y el nombre con el que el HTML los referencia.
 *
 * `app.js` no se copia: lo produce esbuild dentro de `dist/`.
 */
const VERSIONABLES = ['app.js', 'estilos.css'];

/**
 * Longitud del hash de cache-busting. 10 hex (40 bits) distinguen despliegues
 * sin colisiones realistas y mantienen la URL corta y legible en el inspector.
 */
const LONGITUD_HASH = 10;

/**
 * Deja `dist/` vacío antes de cada build.
 *
 * Reutilizar el directorio conservaria archivos de builds anteriores que ya
 * nadie referencia; wrangler los subiria igualmente y quedarían servidos
 * indefinidamente en el borde.
 */
async function prepararSalida() {
  await rm(DIR_SALIDA, { recursive: true, force: true });
  await mkdir(DIR_SALIDA, { recursive: true });
}

async function empaquetarCliente() {
  try {
    await esbuild.build({
      absWorkingDir: RAIZ,
      entryPoints: [ENTRADA],
      tsconfig: TSCONFIG,
      outfile: path.join(DIR_SALIDA, 'app.js'),
      bundle: true,
      format: 'esm',
      target: 'es2022',
      platform: 'browser',
      minify: true,
      sourcemap: true,
      legalComments: 'none',
    });
  } catch (error) {
    // Sin bundle no hay aplicación. Marcar el fallo y volver a lanzar corta la
    // cadena `npm run build && wrangler deploy`: es preferible no desplegar a
    // publicar un index.html cuyo <script> apunta a un app.js inexistente.
    process.exitCode = 1;
    throw error;
  }
}

async function copiarEstaticos() {
  for (const nombre of ESTATICOS) {
    await copyFile(path.join(DIR_CLIENTE, nombre), path.join(DIR_SALIDA, nombre));
  }
}

function hashCorto(contenido) {
  return createHash('sha256').update(contenido).digest('hex').slice(0, LONGITUD_HASH);
}

function escaparRegExp(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Anade `?v=<hash>` a los atributos `src`/`href` que apuntan a `archivo`.
 *
 * El patron exige que el valor del atributo sea *exactamente* el archivo
 * (admitiendo el prefijo `./`) y termine en la misma comilla con la que abrió.
 * Un `replace` global sobre el nombre suelto tocaría también el texto visible,
 * los comentarios HTML o cualquier cadena de un script en línea que mencione
 * "app.js", corrompiendo el documento de formas difíciles de detectar.
 */
function versionarReferencia(html, archivo, hash) {
  const patron = new RegExp(
    `((?:src|href)\\s*=\\s*(["']))(\\.?/?${escaparRegExp(archivo)})\\2`,
    'g',
  );

  let reemplazos = 0;
  const resultado = html.replace(patron, (_todo, prefijo, comilla, ruta) => {
    reemplazos += 1;
    return `${prefijo}${ruta}?v=${hash}${comilla}`;
  });

  return { html: resultado, reemplazos };
}

/**
 * Calcula el hash de cada asset y reescribe el HTML ya copiado en `dist/`.
 *
 * Se usa un hash por archivo en lugar de uno combinado para que un retoque de
 * estilos no invalide la cache del bundle, ni al reves.
 */
async function versionarHtml() {
  const rutaHtml = path.join(DIR_SALIDA, 'index.html');
  let html = await readFile(rutaHtml, 'utf8');
  const hashes = new Map();

  for (const nombre of VERSIONABLES) {
    // Se hashea el contenido final (ya minificado) tal cual llega al navegador.
    const hash = hashCorto(await readFile(path.join(DIR_SALIDA, nombre)));
    const { html: actualizado, reemplazos } = versionarReferencia(html, nombre, hash);

    if (reemplazos === 0) {
      // No es fatal, pero deja el asset sin invalidación de cache: avisar es
      // mejor que un despliegue silenciosamente servido desde la cache vieja.
      console.warn(`  aviso: index.html no referencia "${nombre}"; queda sin cache-busting`);
    }

    html = actualizado;
    hashes.set(nombre, hash);
  }

  await writeFile(rutaHtml, html, 'utf8');
  return hashes;
}

async function listarSalida() {
  const relativas = await readdir(DIR_SALIDA, { recursive: true });
  const archivos = [];

  for (const relativa of relativas.sort()) {
    const info = await stat(path.join(DIR_SALIDA, relativa));
    if (info.isFile()) {
      archivos.push({ nombre: relativa, bytes: info.size });
    }
  }

  return archivos;
}

async function imprimirResumen(hashes) {
  const archivos = await listarSalida();
  const ancho = archivos.reduce((maximo, archivo) => Math.max(maximo, archivo.nombre.length), 0);

  console.log(`Frontend construido en ${SALIDA}/`);
  for (const archivo of archivos) {
    const kib = (archivo.bytes / 1024).toFixed(2);
    console.log(`  ${archivo.nombre.padEnd(ancho)}  ${kib.padStart(9)} KiB`);
  }

  for (const [nombre, hash] of hashes) {
    console.log(`  cache-busting: ${nombre}?v=${hash}`);
  }
}

await prepararSalida();
await empaquetarCliente();
await copiarEstaticos();
const hashes = await versionarHtml();
await imprimirResumen(hashes);
