/**
 * Auditoria de diseno adaptable con Playwright.
 *
 * Recorre la pantalla de acceso y los nueve modulos en varios tamanios reales y
 * falla si encuentra alguno de los defectos que de verdad rompen una pantalla
 * chica:
 *
 *  - la pagina se desplaza en horizontal,
 *  - un elemento sobresale de su contenedor,
 *  - la tarjeta de acceso queda cortada por arriba (el clasico de centrar con
 *    `place-items: center` un contenido mas alto que la ventana),
 *  - el boton principal cae fuera de la vista,
 *  - una tabla necesita desplazamiento lateral pese al modo de fichas.
 *
 * Se usa `playwright-core` a proposito: no descarga navegadores al instalarse,
 * de modo que ni el despliegue de Cloudflare ni una instalacion limpia pagan
 * 150 MB por una herramienta que solo se usa a mano. Hay que apuntarle a un
 * Chromium ya presente:
 *
 *   PLAYWRIGHT_CHROMIUM=/ruta/a/chrome node scripts/responsive.mjs
 *   npx wrangler dev            # en otra terminal
 *
 * Si no se indica, se prueban las rutas habituales del sistema.
 */
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? process.env.BASE_URL ?? 'http://127.0.0.1:8787';
const CAPTURAS = process.env.CAPTURAS ?? null;

/** Tamanios elegidos por lo que rompen, no por popularidad. */
const TAMANOS = [
  { nombre: 'movil-320', ancho: 320, alto: 568 },
  { nombre: 'movil-375', ancho: 375, alto: 667 },
  { nombre: 'movil-390', ancho: 390, alto: 844 },
  { nombre: 'apaisado', ancho: 844, alto: 390 },
  { nombre: 'tablet-768', ancho: 768, alto: 1024 },
  { nombre: 'escritorio', ancho: 1440, alto: 900 },
];

const MODULOS = [
  'panel', 'empleados', 'departamentos', 'proyectos',
  'asignaciones', 'horas', 'reportes', 'auditoria', 'perfil',
];

const CLAVE_SEMBRADA = 'EcoTech#2026Admin';
const CLAVE_ROTADA = 'Auditoria#Responsive26';

function rutaDelNavegador() {
  const candidatas = [
    process.env.PLAYWRIGHT_CHROMIUM,
    process.env.CHROME_PATH,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const encontrada = candidatas.find((r) => existsSync(r));
  if (!encontrada) {
    console.error(
      'No se encontro un Chromium. Indique uno con PLAYWRIGHT_CHROMIUM=/ruta/a/chrome,\n' +
        'o instale uno con `npx playwright install chromium`.',
    );
    process.exit(2);
  }
  return encontrada;
}

let correctas = 0;
const fallos = [];

function comprobar(caso, nombre, condicion, detalle = '') {
  if (condicion) {
    correctas += 1;
  } else {
    fallos.push(`${caso} :: ${nombre}${detalle ? ` (${detalle})` : ''}`);
  }
}

/** Defectos de una pantalla, medidos en el navegador. */
function medir() {
  const raiz = document.documentElement;
  const identificar = (el) =>
    `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : ''}`;

  const desbordan = [];
  for (const el of document.querySelectorAll('.contenido *, .pantalla-login *')) {
    const padre = el.parentElement;
    if (!padre) continue;
    const caja = el.getBoundingClientRect();
    const cajaPadre = padre.getBoundingClientRect();
    const estilo = getComputedStyle(padre);
    // Un padre que desplaza a proposito no cuenta como defecto.
    if (estilo.overflowX === 'auto' || estilo.overflowX === 'scroll') continue;
    if (caja.width > 0 && (caja.right > cajaPadre.right + 1 || caja.left < cajaPadre.left - 1)) {
      desbordan.push(identificar(el));
    }
  }

  const contenedor = document.querySelector('.tabla-contenedor');
  const tabla = contenedor ? contenedor.querySelector('table') : null;
  const tarjeta = document.querySelector('.tarjeta-login');
  const principal = [...document.querySelectorAll('button')].find((b) =>
    /ingresar/i.test(b.textContent || ''),
  );
  const cajaPrincipal = principal ? principal.getBoundingClientRect() : null;

  return {
    desbordeHorizontal: raiz.scrollWidth - window.innerWidth,
    desbordan: [...new Set(desbordan)].slice(0, 5),
    tablaCabe: tabla && contenedor ? tabla.scrollWidth <= contenedor.clientWidth + 1 : true,
    anchoTabla: tabla ? Math.round(tabla.scrollWidth) : 0,
    anchoContenedor: contenedor ? Math.round(contenedor.clientWidth) : 0,
    tarjetaCortadaArriba: tarjeta ? tarjeta.getBoundingClientRect().top < -1 : false,
    botonPrincipalVisible: cajaPrincipal
      ? cajaPrincipal.top >= 0 && cajaPrincipal.bottom <= window.innerHeight + 1
      : null,
  };
}

const navegador = await chromium.launch({
  executablePath: rutaDelNavegador(),
  args: ['--no-sandbox'],
  // El entorno puede tener un proxy de salida; nunca debe usarse para localhost.
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1,::1' } }
    : {}),
});

if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

for (const tamano of TAMANOS) {
  const contexto = await navegador.newContext({
    viewport: { width: tamano.ancho, height: tamano.alto },
    isMobile: tamano.ancho < 500,
    hasTouch: tamano.ancho < 500,
  });
  const pagina = await contexto.newPage();

  // --- Pantalla de acceso ---------------------------------------------------
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  const hayLogin = await pagina
    .waitForSelector('.pantalla-login, .tarjeta-login', { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  comprobar(tamano.nombre, 'se pinta la pantalla de acceso', hayLogin);

  if (hayLogin) {
    const d = await pagina.evaluate(medir);
    comprobar(tamano.nombre, 'acceso sin desbordamiento horizontal', d.desbordeHorizontal <= 1, `${d.desbordeHorizontal}px`);
    comprobar(tamano.nombre, 'acceso sin elementos fuera de su contenedor', d.desbordan.length === 0, d.desbordan.join(', '));
    comprobar(tamano.nombre, 'la tarjeta no queda cortada por arriba', !d.tarjetaCortadaArriba);
    comprobar(tamano.nombre, 'el boton de ingresar esta a la vista', d.botonPrincipalVisible !== false);
    if (CAPTURAS) await pagina.screenshot({ path: `${CAPTURAS}/${tamano.nombre}-acceso.png` });
  }

  // --- Sesion ---------------------------------------------------------------
  let dentro = false;
  for (const clave of [CLAVE_SEMBRADA, CLAVE_ROTADA]) {
    await pagina.fill('input[type="email"]', 'admin@ecotech.com').catch(() => {});
    await pagina.fill('input[type="password"]', clave).catch(() => {});
    await pagina.locator('.boton-primario').first().click().catch(() => {});
    await pagina.waitForTimeout(1800);
    if ((await pagina.locator('.barra-lateral').count()) > 0) {
      dentro = true;
      break;
    }
  }
  comprobar(tamano.nombre, 'inicia sesion', dentro);

  if (dentro) {
    // El sistema exige rotar la clave sembrada antes de dejar navegar.
    if ((await pagina.locator('[name="contrasenaActual"]').count()) > 0) {
      await pagina.fill('[name="contrasenaActual"]', CLAVE_SEMBRADA);
      await pagina.fill('[name="contrasenaNueva"]', CLAVE_ROTADA);
      await pagina.fill('[name="contrasenaRepetida"]', CLAVE_ROTADA);
      await pagina.locator('button', { hasText: /^Cambiar contrasena$/ }).first().click();
      await pagina.waitForTimeout(2200);
    }

    for (const modulo of MODULOS) {
      await pagina.goto(`${BASE}/#/${modulo}`, { waitUntil: 'domcontentloaded' });
      await pagina.waitForTimeout(1300);
      const d = await pagina.evaluate(medir);
      comprobar(tamano.nombre, `${modulo}: sin desbordamiento horizontal`, d.desbordeHorizontal <= 1, `${d.desbordeHorizontal}px`);
      comprobar(tamano.nombre, `${modulo}: nada fuera de su contenedor`, d.desbordan.length === 0, d.desbordan.join(', '));
      // Solo por debajo del corte de fichas (900 px). Por encima, una tabla mas
      // ancha que su contenedor es el comportamiento buscado: se desplaza dentro
      // de `.tabla-contenedor` y nunca arrastra a la pagina.
      if (tamano.ancho < 900) {
        comprobar(tamano.nombre, `${modulo}: la tabla cabe`, d.tablaCabe, `${d.anchoTabla} > ${d.anchoContenedor}`);
      }
      if (CAPTURAS) {
        await pagina.screenshot({ path: `${CAPTURAS}/${tamano.nombre}-${modulo}.png`, fullPage: true });
      }
    }
  }

  console.log(`  ${tamano.nombre.padEnd(12)} ${tamano.ancho}x${tamano.alto} revisado`);
  await contexto.close();
}

await navegador.close();

console.log(`\n${correctas} comprobaciones correctas, ${fallos.length} fallos`);
for (const f of fallos) console.log(`  FALLA ${f}`);
process.exit(fallos.length === 0 ? 0 : 1);
