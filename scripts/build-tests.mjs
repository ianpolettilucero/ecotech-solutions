/**
 * Transpila `src/` y `tests/` a `build-tests/` para poder ejecutar la suite con
 * el runner nativo: `node --test build-tests/tests/`.
 *
 * No hay empaquetado ni resolucion de modulos: esbuild solo borra los tipos
 * archivo por archivo y conserva la estructura de carpetas. Como todos los
 * imports relativos del codigo fuente ya terminan en '.js' (lo exige el
 * tsconfig con moduleResolution Bundler + verbatimModuleSyntax), la salida
 * resuelve sola bajo las reglas de ESM de Node, sin banderas ni loaders.
 */

import * as esbuild from 'esbuild';
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Nombre del directorio de salida, relativo a la raiz. */
const SALIDA = 'build-tests';
const DIR_SALIDA = path.join(RAIZ, SALIDA);

/** Raices a transpilar. `src/` entra porque `tests/` importa el codigo real. */
const DIRS_ENTRADA = ['src', 'tests'];

/**
 * Se apunta a la configuracion base, y no al `tsconfig.json` de la raiz, por
 * dos motivos: ese archivo es un proyecto de solo referencias (sin
 * `compilerOptions`) y esbuild no sigue las referencias de proyecto, con lo que
 * se perderia `useDefineForClassFields: false` y los campos de clase pasarian a
 * semantica `[[Define]]`; y ademas aqui se transpila codigo de los dos
 * proyectos a la vez (worker y cliente), asi que lo unico comun es la base.
 */
const TSCONFIG = 'tsconfig.base.json';

/**
 * Recorre `dir` en profundidad y devuelve las rutas de sus archivos `.ts`.
 *
 * El recorrido es propio y no delega en globs del shell: `npm test` debe
 * comportarse igual en cualquier shell y en CI, donde la expansion `**` no
 * esta garantizada.
 */
async function recolectarTs(dir) {
  let entradas;
  try {
    entradas = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    // Un directorio ausente no es un error: el proyecto puede no tener aun
    // tests, y el resto de la transpilacion sigue siendo util.
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const archivos = [];
  for (const entrada of entradas) {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      archivos.push(...(await recolectarTs(ruta)));
    } else if (entrada.isFile() && ruta.endsWith('.ts') && !ruta.endsWith('.d.ts')) {
      // Los .d.ts solo declaran tipos: esbuild emitiria un .js vacio inutil.
      archivos.push(ruta);
    }
  }

  return archivos;
}

async function recolectarEntradas() {
  const entradas = [];

  for (const nombre of DIRS_ENTRADA) {
    const rutas = await recolectarTs(path.join(RAIZ, nombre));
    // esbuild resuelve las rutas relativas contra `absWorkingDir`; se pasan
    // asi para que `outbase: '.'` reproduzca la jerarquia src/ y tests/.
    entradas.push(...rutas.map((ruta) => path.relative(RAIZ, ruta).split(path.sep).join('/')));
  }

  return entradas.sort();
}

async function principal() {
  await rm(DIR_SALIDA, { recursive: true, force: true });

  const entryPoints = await recolectarEntradas();
  if (entryPoints.length === 0) {
    console.log(`No se encontraron archivos .ts en ${DIRS_ENTRADA.join('/ y ')}/; nada que hacer.`);
    return;
  }

  await esbuild.build({
    absWorkingDir: RAIZ,
    entryPoints,
    tsconfig: TSCONFIG,
    outdir: SALIDA,
    outbase: '.',
    // El package.json de la raiz declara "type": "module", y build-tests/ cuelga
    // de ella: emitir .js basta para que Node los cargue como ESM.
    outExtension: { '.js': '.js' },
    bundle: false,
    format: 'esm',
    target: 'es2022',
    platform: 'neutral',
    // Inline para que los stack traces de una prueba fallida apunten al .ts.
    sourcemap: 'inline',
  });

  console.log(`Transpilados ${entryPoints.length} archivos .ts a ${SALIDA}/`);
}

try {
  await principal();
} catch (error) {
  // Que `npm test` falle en la transpilacion en vez de correr una suite vieja.
  process.exitCode = 1;
  throw error;
}
