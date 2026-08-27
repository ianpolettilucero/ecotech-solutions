import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { FabricaExportadores } from '../src/dominio/reportes/exportadores/FabricaExportadores.js';
import { ExportadorCSV } from '../src/dominio/reportes/exportadores/ExportadorCSV.js';
import { ExportadorJSON } from '../src/dominio/reportes/exportadores/ExportadorJSON.js';
import { ExportadorPDF } from '../src/dominio/reportes/exportadores/ExportadorPDF.js';
import { ExportadorXLSX } from '../src/dominio/reportes/exportadores/ExportadorXLSX.js';
import { ErrorValidacion } from '../src/dominio/base/errores.js';
import type { FormatoExportacion, ReporteDTO } from '../src/compartido/tipos.js';

function reporteDePrueba(filas = 3): ReporteDTO {
  return {
    tipo: 'empleados',
    titulo: 'Reporte de Empleados',
    descripcion: 'Prueba automatizada',
    generadoEn: '2026-08-27T01:00:00.000Z',
    generadoPor: 'admin@ecotech.com',
    columnas: [
      { clave: 'legajo', titulo: 'Legajo', tipo: 'texto' },
      { clave: 'nombre', titulo: 'Nombre', tipo: 'texto' },
      { clave: 'ingreso', titulo: 'Ingreso', tipo: 'fecha' },
      { clave: 'activo', titulo: 'Activo', tipo: 'booleano' },
      { clave: 'horas', titulo: 'Horas', tipo: 'numero' },
      { clave: 'sueldo', titulo: 'Sueldo', tipo: 'moneda' },
    ],
    filas: Array.from({ length: filas }, (_, i) => ({
      legajo: `ECO-${String(i + 1).padStart(6, '0')}`,
      nombre: `Empleado "comillas"; punto y coma ${i + 1}`,
      ingreso: '2026-03-15',
      activo: i % 2 === 0,
      horas: 160.25,
      sueldo: 1_234_567.89,
    })),
    totales: { legajo: 'TOTALES', horas: 480.75, sueldo: 3_703_703.67 },
  };
}

const texto = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

describe('FabricaExportadores', () => {
  it('devuelve la clase concreta de cada formato', () => {
    assert.ok(FabricaExportadores.crear('json') instanceof ExportadorJSON);
    assert.ok(FabricaExportadores.crear('csv') instanceof ExportadorCSV);
    assert.ok(FabricaExportadores.crear('xlsx') instanceof ExportadorXLSX);
    assert.ok(FabricaExportadores.crear('pdf') instanceof ExportadorPDF);
  });

  it('rechaza un formato desconocido en vez de devolver algo por defecto', () => {
    assert.throws(
      () => FabricaExportadores.crear('docx' as FormatoExportacion),
      ErrorValidacion,
    );
  });

  it('el nombre de archivo es seguro para una cabecera HTTP', () => {
    for (const formato of ['json', 'csv', 'xlsx', 'pdf'] as const) {
      const nombre = FabricaExportadores.crear(formato).nombreArchivo(reporteDePrueba());
      assert.match(nombre, /^[A-Za-z0-9._-]+$/);
      assert.ok(nombre.endsWith(`.${formato}`));
    }
  });

  it('todos los formatos producen bytes no vacios sobre el mismo reporte', async () => {
    // El servicio de informes trabaja asi: elige el exportador y le manda el
    // mismo objeto. Ninguno conoce al resto.
    const reporte = reporteDePrueba(50);
    for (const formato of ['json', 'csv', 'xlsx', 'pdf'] as const) {
      const bytes = await FabricaExportadores.crear(formato).exportar(reporte);
      assert.ok(bytes.length > 100, `${formato} produjo ${bytes.length} bytes`);
    }
  });
});

describe('ExportadorJSON', () => {
  it('conserva filas, columnas y totales', async () => {
    const bytes = await new ExportadorJSON().exportar(reporteDePrueba(4));
    const salida = JSON.parse(texto(bytes)) as ReporteDTO;
    assert.equal(salida.filas.length, 4);
    assert.equal(salida.columnas.length, 6);
    assert.equal(salida.totales['horas'], 480.75);
  });
});

describe('ExportadorCSV', () => {
  it('emite BOM y saltos CRLF para que Excel lo abra bien', async () => {
    const bytes = await new ExportadorCSV().exportar(reporteDePrueba(2));
    assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);
    assert.ok(texto(bytes).includes('\r\n'));
  });

  it('escapa comillas y separadores segun RFC 4180', async () => {
    const bytes = await new ExportadorCSV().exportar(reporteDePrueba(1));
    const contenido = texto(bytes);
    // Las comillas internas se duplican y el valor va entrecomillado.
    assert.ok(contenido.includes('""comillas""'));
  });

  it('neutraliza las formulas: el CSV no debe ejecutar nada al abrirse', async () => {
    const reporte = reporteDePrueba(1);
    const fila = reporte.filas[0];
    assert.ok(fila);
    fila['nombre'] = '=HYPERLINK("http://malicioso","pulse")';
    const contenido = texto(await new ExportadorCSV().exportar(reporte));
    // El apostrofo delante impide que Excel lo interprete como formula.
    assert.ok(contenido.includes("'=HYPERLINK"));
    assert.equal(/[;"]=HYPERLINK/.test(contenido), false);
  });

  it('incluye la fila de totales al final', async () => {
    const contenido = texto(await new ExportadorCSV().exportar(reporteDePrueba(2)));
    const lineas = contenido.trim().split('\r\n');
    assert.ok((lineas[lineas.length - 1] ?? '').startsWith('TOTALES'));
  });
});

describe('ExportadorXLSX', () => {
  it('produce un ZIP con la firma correcta', async () => {
    const bytes = await new ExportadorXLSX().exportar(reporteDePrueba(5));
    // 'PK\x03\x04': cabecera local de la primera entrada.
    assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
    // El fin del directorio central debe aparecer al final.
    const cola = bytes.slice(-22);
    assert.deepEqual([...cola.slice(0, 4)], [0x50, 0x4b, 0x05, 0x06]);
  });

  it('declara las seis partes obligatorias de un libro OOXML', async () => {
    const bytes = await new ExportadorXLSX().exportar(reporteDePrueba(5));
    const crudo = new TextDecoder('latin1').decode(bytes);
    for (const parte of [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
    ]) {
      assert.ok(crudo.includes(parte), `falta la parte ${parte}`);
    }
  });

  it('el numero de entradas del EOCD coincide con las partes escritas', async () => {
    const bytes = await new ExportadorXLSX().exportar(reporteDePrueba(3));
    const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const inicioEocd = bytes.length - 22;
    assert.equal(vista.getUint32(inicioEocd, true), 0x06054b50);
    assert.equal(vista.getUint16(inicioEocd + 10, true), 6);
  });
});

describe('ExportadorPDF', () => {
  it('empieza con la cabecera de version y termina en %%EOF', async () => {
    const bytes = await new ExportadorPDF().exportar(reporteDePrueba(10));
    const crudo = new TextDecoder('latin1').decode(bytes);
    assert.ok(crudo.startsWith('%PDF-1.'));
    assert.ok(crudo.trimEnd().endsWith('%%EOF'));
  });

  it('el desplazamiento de startxref apunta al byte exacto de la tabla', async () => {
    // Es el fallo mas facil de cometer escribiendo un PDF a mano: si algun
    // tramo se codifica en UTF-8, los desplazamientos se corren y ningun lector
    // abre el documento.
    const bytes = await new ExportadorPDF().exportar(reporteDePrueba(40));
    const crudo = new TextDecoder('latin1').decode(bytes);
    const posicion = crudo.lastIndexOf('startxref');
    assert.ok(posicion > 0);
    const desplazamiento = Number.parseInt(crudo.slice(posicion + 9).trim(), 10);
    assert.equal(crudo.slice(desplazamiento, desplazamiento + 4), 'xref');
  });

  it('pagina el contenido sin perder ninguna fila', async () => {
    const reporte = reporteDePrueba(120);
    const crudo = new TextDecoder('latin1').decode(await new ExportadorPDF().exportar(reporte));
    for (let i = 1; i <= 120; i++) {
      const legajo = `ECO-${String(i).padStart(6, '0')}`;
      assert.ok(crudo.includes(legajo), `falta la fila ${legajo}`);
    }
    assert.ok(crudo.includes('TOTALES'));
  });

  it('repite la cabecera de la tabla en cada pagina', async () => {
    const crudo = new TextDecoder('latin1').decode(
      await new ExportadorPDF().exportar(reporteDePrueba(120)),
    );
    const paginas = (crudo.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    const cabeceras = (crudo.match(/\(Legajo\)/g) ?? []).length;
    assert.ok(paginas > 1, 'el reporte deberia ocupar varias paginas');
    assert.equal(cabeceras, paginas);
  });

  it('un reporte de una sola fila cabe en una pagina', async () => {
    const crudo = new TextDecoder('latin1').decode(
      await new ExportadorPDF().exportar(reporteDePrueba(1)),
    );
    assert.ok(crudo.includes('Pagina 1 de 1'));
  });
});
