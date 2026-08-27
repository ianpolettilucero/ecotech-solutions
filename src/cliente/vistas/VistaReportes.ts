/**
 * Generación de informes.
 *
 * La pantalla no sabe que columnas tiene cada informe: las lee de `columnas` y
 * arma la tabla en el momento. Por eso anadir un informe nuevo al servidor no
 * obliga a tocar este archivo, y por eso el formato de cada celda se decide a
 * partir del `tipo` declarado por la columna y no de adivinar el valor.
 */

import type {
  ColumnaReporte,
  DepartamentoDTO,
  FormatoExportacion,
  Permiso,
  ProyectoDTO,
  ReporteDTO,
  TipoReporte,
  ValorCelda,
} from '../../compartido/tipos.js';
import { TIPOS_REPORTE } from '../../compartido/tipos.js';
import { ClienteApi } from '../ClienteApi.js';
import { Vista } from '../Vista.js';
import type { ColumnaTabla } from '../componentes/Tabla.js';
import { Tabla } from '../componentes/Tabla.js';
import {
  boton,
  botonera,
  campoFiltro,
  cargando,
  estadoVacio,
  filtros,
  selector,
} from '../componentes/piezas.js';
import {
  agregar,
  div,
  elemento,
  formatearFecha,
  formatearFechaHora,
  formatearMoneda,
  formatearNumero,
  vaciar,
} from '../dom.js';

/** Forma de la respuesta de `GET /api/proyectos`. */
interface RespuestaProyectos {
  proyectos: ProyectoDTO[];
  horasPorProyecto: Record<string, number>;
}

/** Forma de la respuesta de `GET /api/departamentos`. */
interface RespuestaDepartamentos {
  departamentos: DepartamentoDTO[];
  conteoEmpleados: Record<string, number>;
}

/** Fila de la previsualización: la de totales se pinta destacada. */
interface FilaReporte {
  valores: Record<string, ValorCelda>;
  totales: boolean;
}

const NOMBRES_TIPO: Readonly<Record<TipoReporte, string>> = Object.freeze({
  empleados: 'Empleados',
  departamentos: 'Departamentos',
  proyectos: 'Proyectos',
  horas: 'Horas',
  nomina: 'Nómina',
});

/**
 * Da formato a una celda según el tipo declarado por su columna.
 *
 * El valor puede faltar (la fila de totales solo trae las columnas sumables) y
 * puede llegar con un tipo que no corresponde al declarado: en ambos casos se
 * degrada a un texto legible en vez de pintar "undefined" o "[object Object]".
 */
function formatearCelda(valor: ValorCelda | undefined, tipo: ColumnaReporte['tipo']): string {
  if (valor === undefined || valor === null) return '-';
  switch (tipo) {
    case 'moneda':
      return typeof valor === 'number' ? formatearMoneda(valor) : String(valor);
    case 'fecha':
      return typeof valor === 'string' ? formatearFecha(valor) : '-';
    case 'numero':
      return typeof valor === 'number' ? formatearNumero(valor) : String(valor);
    case 'booleano':
      return valor === true ? 'Sí' : 'No';
    default:
      return String(valor);
  }
}

export class VistaReportes extends Vista {
  override get ruta(): string {
    return 'reportes';
  }

  override get titulo(): string {
    return 'Informes';
  }

  override get icono(): string {
    return 'R';
  }

  override get permisos(): Permiso[] {
    return ['reporte:generar'];
  }

  private tipo: TipoReporte = 'empleados';
  private desde = '';
  private hasta = '';
  private departamentoId = '';
  private proyectoId = '';
  private descargando = false;
  private departamentos: DepartamentoDTO[] = [];
  private proyectos: ProyectoDTO[] = [];
  private botonesDescarga: HTMLButtonElement[] = [];
  private previa: HTMLElement | null = null;

  override async render(contenedor: HTMLElement): Promise<void> {
    [this.departamentos, this.proyectos] = await Promise.all([
      this.cargarDepartamentos(),
      this.cargarProyectos(),
    ]);

    const cabecera = div(
      'pila',
      elemento('h2', { clase: 'vista-titulo', texto: 'Informes' }),
      elemento('p', {
        clase: 'texto-menor texto-tenue',
        texto:
          'Previsualice el informe en pantalla y, cuando el resultado sea el esperado, descárguelo en el formato que necesite.',
      }),
    );

    const barra = filtros(
      campoFiltro(
        'Informe',
        selector(this.opcionesTipo(), this.tipo, (valor) => {
          // `find` puede no encontrar nada: se comprueba en vez de forzar el tipo.
          const encontrado = TIPOS_REPORTE.find((candidato) => candidato === valor);
          if (encontrado) this.tipo = encontrado;
        }),
      ),
      campoFiltro(
        'Desde',
        this.controlFecha(this.desde, (valor) => {
          this.desde = valor;
        }),
      ),
      campoFiltro(
        'Hasta',
        this.controlFecha(this.hasta, (valor) => {
          this.hasta = valor;
        }),
      ),
      campoFiltro(
        'Departamento',
        selector(
          [
            { valor: '', texto: 'Todos los departamentos' },
            ...this.departamentos.map((d) => ({ valor: d.id, texto: d.nombre })),
          ],
          this.departamentoId,
          (valor) => {
            this.departamentoId = valor;
          },
        ),
      ),
      campoFiltro(
        'Proyecto',
        selector(
          [
            { valor: '', texto: 'Todos los proyectos' },
            ...this.proyectos.map((p) => ({ valor: p.id, texto: `${p.codigo} - ${p.nombre}` })),
          ],
          this.proyectoId,
          (valor) => {
            this.proyectoId = valor;
          },
        ),
      ),
    );

    const pdf = boton('Descargar PDF', () => void this.descargar('pdf'), 'secundario');
    const excel = boton('Descargar Excel', () => void this.descargar('xlsx'), 'secundario');
    const csv = boton('Descargar CSV', () => void this.descargar('csv'), 'secundario');
    this.botonesDescarga = [pdf, excel, csv];

    const acciones = botonera(
      boton('Previsualizar', () => void this.previsualizar(), 'primario'),
      pdf,
      excel,
      csv,
    );

    this.previa = div('pila');
    agregar(
      contenedor,
      cabecera,
      barra,
      acciones,
      this.previa,
    );
    agregar(
      this.previa,
      estadoVacio('Elija un informe y pulse "Previsualizar" para verlo en pantalla.'),
    );
  }

  private controlFecha(valor: string, alCambiar: (valor: string) => void): HTMLInputElement {
    return elemento('input', {
      tipo: 'date',
      valor,
      al: {
        change: (evento: Event) => {
          const destino = evento.currentTarget;
          if (destino instanceof HTMLInputElement) alCambiar(destino.value);
        },
      },
    });
  }

  /** La nómina solo se ofrece a quien puede verla: no basta con esconder el resultado. */
  private opcionesTipo(): { valor: string; texto: string }[] {
    return TIPOS_REPORTE.filter(
      (tipo) => tipo !== 'nomina' || this.app.puede('reporte:nomina'),
    ).map((tipo) => ({ valor: tipo, texto: NOMBRES_TIPO[tipo] }));
  }

  private consulta(formato: FormatoExportacion): string {
    return ClienteApi.consulta({
      formato,
      desde: this.desde,
      hasta: this.hasta,
      departamentoId: this.departamentoId,
      proyectoId: this.proyectoId,
    });
  }

  // ---------------------------------------------------------------------------
  // Previsualización
  // ---------------------------------------------------------------------------

  private async previsualizar(): Promise<void> {
    const destino = this.previa;
    if (!destino) return;

    vaciar(destino);
    agregar(destino, cargando());

    const reporte = await this.app.intentar(() =>
      ClienteApi.get<ReporteDTO>(`/api/reportes/${this.tipo}${this.consulta('json')}`),
    );

    vaciar(destino);
    if (!reporte) {
      agregar(destino, estadoVacio('No se pudo generar la previsualización del informe.'));
      return;
    }
    agregar(destino, this.pintarReporte(reporte));
  }

  private pintarReporte(reporte: ReporteDTO): HTMLElement {
    const columnas: ColumnaTabla<FilaReporte>[] = reporte.columnas.map((columna, indice) => ({
      titulo: columna.titulo,
      clase: columna.tipo === 'numero' || columna.tipo === 'moneda' ? 'celda-numero' : undefined,
      celda: (fila) => {
        const bruto = fila.valores[columna.clave];
        // La fila de totales solo trae las columnas que se pueden sumar; en la
        // primera se pone el rotulo para que no quede una fila que empieza en blanco.
        if (fila.totales && indice === 0 && (bruto === undefined || bruto === null)) {
          return elemento('strong', { texto: 'Totales' });
        }
        const texto = formatearCelda(bruto, columna.tipo);
        return fila.totales ? elemento('strong', { texto }) : texto;
      },
    }));

    const filas: FilaReporte[] = reporte.filas.map((valores) => ({ valores, totales: false }));
    if (Object.keys(reporte.totales).length > 0) {
      filas.push({ valores: reporte.totales, totales: true });
    }

    const tabla = new Tabla(columnas, {
      vacio: 'El informe no devolvio ninguna fila con los filtros indicados.',
    });

    return div(
      'tarjeta',
      div(
        'tarjeta-titulo',
        elemento('span', { texto: reporte.titulo }),
        elemento('small', {
          texto: `Generado el ${formatearFechaHora(reporte.generadoEn)} por ${reporte.generadoPor}`,
        }),
      ),
      elemento('p', { clase: 'texto-menor texto-tenue', texto: reporte.descripcion }),
      tabla.render(filas),
    );
  }

  // ---------------------------------------------------------------------------
  // Descargas
  // ---------------------------------------------------------------------------

  private async descargar(formato: FormatoExportacion): Promise<void> {
    // Generar un informe grande tarda: sin bloquear los botones, tres clics
    // seguidos lanzarian tres exportaciones y bajarian tres veces el archivo.
    if (this.descargando) return;
    this.descargando = true;
    this.fijarBotonesDescarga(true);
    try {
      await this.app.intentar(
        () => ClienteApi.descargar(`/api/reportes/${this.tipo}${this.consulta(formato)}`),
        'Informe descargado.',
      );
    } finally {
      this.descargando = false;
      this.fijarBotonesDescarga(false);
    }
  }

  private fijarBotonesDescarga(deshabilitados: boolean): void {
    for (const control of this.botonesDescarga) {
      control.disabled = deshabilitados;
    }
  }

  // ---------------------------------------------------------------------------
  // Catálogos
  // ---------------------------------------------------------------------------

  private async cargarDepartamentos(): Promise<DepartamentoDTO[]> {
    try {
      const datos = await ClienteApi.get<RespuestaDepartamentos>('/api/departamentos');
      return datos.departamentos;
    } catch {
      return [];
    }
  }

  private async cargarProyectos(): Promise<ProyectoDTO[]> {
    try {
      const datos = await ClienteApi.get<RespuestaProyectos>('/api/proyectos');
      return datos.proyectos;
    } catch {
      return [];
    }
  }
}
