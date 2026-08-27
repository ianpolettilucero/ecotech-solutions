/**
 * Panel de inicio.
 *
 * Es la única vista sin permisos declarados: cualquiera que entre al sistema
 * aterriza aquí. Por eso no muestra ni un dato de persona, solo agregados que
 * el servidor ya cálculo (`/api/panel`); si hiciera falta filtrar por rol lo
 * haría el servicio, no esta pantalla.
 */

import type { MetricasPanelDTO, Permiso } from '../../compartido/tipos.js';
import { ClienteApi } from '../ClienteApi.js';
import { agregar, div, elemento, formatearNumero } from '../dom.js';
import { Vista } from '../Vista.js';
import { Tabla } from '../componentes/Tabla.js';
import type { ColumnaTabla } from '../componentes/Tabla.js';
import { barraProgreso, boton, botonera, tarjetaMetrica } from '../componentes/piezas.js';

/** Reparto de horas ya ordenado y con la escala de la barra resuelta. */
interface FilaHoras {
  nombre: string;
  horas: number;
  /** Porcentaje respecto del mayor valor de la lista, no del total. */
  porcentaje: number;
}

/** Entrada cruda de los dos repartos que devuelve el panel. */
interface EntradaHoras {
  nombre: string;
  horas: number;
}

/** Concordancia de número, para que los avisos no digan "1 empleados". */
function plural(cantidad: number, singular: string, varios: string): string {
  return `${formatearNumero(cantidad, 0)} ${cantidad === 1 ? singular : varios}`;
}

export class VistaPanel extends Vista {
  override get ruta(): string {
    return 'panel';
  }

  override get titulo(): string {
    return 'Panel';
  }

  override get icono(): string {
    return '#';
  }

  override get permisos(): Permiso[] {
    return [];
  }

  override async render(contenedor: HTMLElement): Promise<void> {
    contenedor.classList.add('pila');
    const metricas = await ClienteApi.get<MetricasPanelDTO>('/api/panel');

    agregar(contenedor, this.cabecera(), this.rejillaMetricas(metricas));

    const aviso = this.avisoRevision(metricas);
    if (aviso) agregar(contenedor, aviso);

    agregar(
      contenedor,
      div(
        'rejilla',
        this.tarjetaHoras(
          'Horas por proyecto',
          'Proyecto',
          metricas.horasPorProyecto.map((h) => ({ nombre: h.proyecto, horas: h.horas })),
        ),
        this.tarjetaHoras(
          'Horas por departamento',
          'Departamento',
          metricas.horasPorDepartamento.map((h) => ({ nombre: h.departamento, horas: h.horas })),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Bloques
  // ---------------------------------------------------------------------------

  private cabecera(): HTMLElement {
    const cabecera = div(
      'seccion-titulo',
      div(
        'pila',
        elemento('h2', { clase: 'titulo-pagina', texto: 'Resumen general' }),
        elemento('p', {
          clase: 'subtitulo',
          texto: 'Situación de la plantilla, los proyectos y las horas registradas.',
        }),
      ),
    );

    // Acceso rápido al módulo de horas: es la tarea diaria de casi todo el
    // mundo y no tiene sentido obligar a buscarla en el menú lateral.
    if (this.app.puede('tiempo:registrar')) {
      agregar(
        cabecera,
        botonera(boton('Registrar horas', () => this.app.navegar('horas'), 'primario')),
      );
    }
    return cabecera;
  }

  private rejillaMetricas(metricas: MetricasPanelDTO): HTMLElement {
    const entero = (valor: number): string => formatearNumero(valor, 0);
    const horas = (valor: number): string => `${formatearNumero(valor, 2)} h`;

    return div(
      'rejilla-metricas',
      tarjetaMetrica(
        'Empleados activos',
        entero(metricas.empleadosActivos),
        `de ${entero(metricas.totalEmpleados)} totales`,
      ),
      tarjetaMetrica(
        'Departamentos',
        entero(metricas.totalDepartamentos),
        'Unidades del organigrama',
      ),
      tarjetaMetrica('Proyectos en curso', entero(metricas.proyectosEnCurso), 'Trabajo abierto'),
      tarjetaMetrica('Horas del mes en curso', horas(metricas.horasMesActual), 'Desde el día 1'),
      tarjetaMetrica(
        'Horas pendientes de aprobación',
        horas(metricas.horasPendientesAprobacion),
        'Enviadas y sin revisar',
      ),
      tarjetaMetrica(
        'Empleados sin departamento',
        entero(metricas.empleadosSinDepartamento),
        'Fuera del organigrama',
      ),
    );
  }

  /**
   * Aviso de datos que hay que revisar.
   *
   * Se pinta solo cuando hay algo concreto que corregir. Un cartel permanente
   * se deja de leer a la semana; uno que aparece de vez en cuando se atiende.
   */
  private avisoRevision(metricas: MetricasPanelDTO): HTMLElement | null {
    const puntos: string[] = [];

    if (metricas.empleadosSinDepartamento > 0) {
      puntos.push(
        `Hay ${plural(metricas.empleadosSinDepartamento, 'empleado', 'empleados')} sin ` +
          'departamento asignado: no cuentan en el reparto por unidad ni en los informes ' +
          'por departamento. Conviene asignarlos desde el módulo de empleados.',
      );
    }
    if (metricas.proyectosSobrePresupuesto > 0) {
      puntos.push(
        `Hay ${plural(metricas.proyectosSobrePresupuesto, 'proyecto', 'proyectos')} con más ` +
          'horas registradas que las presupuestadas. Revise el alcance o amplíe el ' +
          'presupuesto antes de seguir imputando.',
      );
    }
    if (puntos.length === 0) return null;

    const cuerpo = div('pila', elemento('strong', { texto: 'Hay datos que revisar' }));
    for (const punto of puntos) agregar(cuerpo, elemento('p', { texto: punto }));

    return div(
      'aviso-seguridad',
      elemento('span', { texto: '!', datos: { 'aria-hidden': 'true' } }),
      cuerpo,
    );
  }

  /**
   * Tarjeta con un reparto de horas.
   *
   * La barra se mide contra el mayor valor de la lista y no contra el total:
   * con veinte proyectos, medir contra el total deja veinte barras
   * indistinguibles pegadas a la izquierda.
   */
  private tarjetaHoras(
    titulo: string,
    rotuloColumna: string,
    entradas: EntradaHoras[],
  ): HTMLElement {
    const ordenadas = [...entradas].sort((a, b) => b.horas - a.horas);
    // Indexar un array devuelve `T | undefined`: con la lista vacía el máximo
    // es cero y ninguna barra llega a dividirse por el.
    const maximo = ordenadas[0]?.horas ?? 0;
    const total = ordenadas.reduce((suma, entrada) => suma + entrada.horas, 0);

    const filas: FilaHoras[] = ordenadas.map((entrada) => ({
      nombre: entrada.nombre,
      horas: entrada.horas,
      porcentaje: maximo > 0 ? (entrada.horas / maximo) * 100 : 0,
    }));

    const columnas: ColumnaTabla<FilaHoras>[] = [
      { titulo: rotuloColumna, celda: (fila) => fila.nombre },
      { titulo: 'Horas', clase: 'celda-numero', celda: (fila) => formatearNumero(fila.horas, 2) },
      { titulo: 'Reparto', celda: (fila) => barraProgreso(fila.porcentaje) },
    ];

    const tabla = new Tabla<FilaHoras>(columnas, {
      vacio: 'Todavía no hay horas aprobadas que repartir.',
      compacta: true,
    });

    return div(
      'tarjeta',
      div(
        'tarjeta-cabecera',
        elemento('h3', { clase: 'tarjeta-titulo', texto: titulo }),
        elemento('span', { clase: 'subtitulo', texto: `${formatearNumero(total, 2)} h en total` }),
      ),
      div('tarjeta-cuerpo', tabla.render(filas)),
    );
  }
}
