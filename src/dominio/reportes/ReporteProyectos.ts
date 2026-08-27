import { Reporte, type DatosReporte } from './Reporte.js';
import type { ColumnaReporte, TipoReporte, ValorCelda } from '../../compartido/tipos.js';

const COLUMNAS: readonly ColumnaReporte[] = [
  { clave: 'codigo', titulo: 'Codigo', tipo: 'texto' },
  { clave: 'nombre', titulo: 'Proyecto', tipo: 'texto' },
  { clave: 'estado', titulo: 'Estado', tipo: 'texto' },
  { clave: 'departamento', titulo: 'Departamento', tipo: 'texto' },
  { clave: 'fechaInicio', titulo: 'Inicio', tipo: 'fecha' },
  { clave: 'fechaFinEstimada', titulo: 'Fin estimado', tipo: 'fecha' },
  { clave: 'presupuestoHoras', titulo: 'Presupuesto (h)', tipo: 'numero' },
  { clave: 'horasImputadas', titulo: 'Horas imputadas', tipo: 'numero' },
  { clave: 'porcentajeConsumido', titulo: 'Consumido (%)', tipo: 'numero' },
  { clave: 'personasAsignadas', titulo: 'Personas', tipo: 'numero' },
];

const SIN_DEPARTAMENTO = 'Sin asignar';

/** Lee una celda numerica ya construida; la ausente vale cero, nunca `NaN`. */
function celdaNumerica(fila: Record<string, ValorCelda>, clave: string): number {
  const valor = fila[clave];
  return typeof valor === 'number' ? valor : 0;
}

/** Clase concreta, resuelta en la primera llamada. Ver `Reporte.crear`. */
let Clase: (new () => Reporte) | undefined;

/**
 * Estado de la cartera de proyectos y consumo de su presupuesto de horas.
 *
 * El porcentaje consumido no se calcula aqui: se le pide al propio `Proyecto`,
 * que es quien conoce su presupuesto y como se acota el resultado. Si manana la
 * empresa decide medir el avance de otra forma, se toca la entidad y este
 * reporte no cambia.
 *
 * Solo se imputan **horas aprobadas**: contar borradores o rechazos daria por
 * consumido un presupuesto que nadie ha validado.
 */
export function crearReporteProyectos(): Reporte {
  Clase ??= class ReporteProyectos extends Reporte {
    override get tipo(): TipoReporte {
      return 'proyectos';
    }

    override get titulo(): string {
      return 'Estado de proyectos';
    }

    override get descripcion(): string {
      return 'Cartera de proyectos con su consumo de presupuesto y equipo asignado.';
    }

    override get columnas(): ColumnaReporte[] {
      return [...COLUMNAS];
    }

    protected override construirFilas(datos: DatosReporte): Record<string, ValorCelda>[] {
      const nombresDepartamento = new Map(
        datos.departamentos.map((departamento): [string, string] => [
          departamento.id,
          departamento.nombre,
        ]),
      );

      const horasPorProyecto = new Map<string, number>();
      for (const registro of datos.registros) {
        if (!registro.computaParaNomina()) continue;
        horasPorProyecto.set(
          registro.proyectoId,
          (horasPorProyecto.get(registro.proyectoId) ?? 0) + registro.horas,
        );
      }

      const personasPorProyecto = new Map<string, number>();
      for (const asignacion of datos.asignaciones) {
        // Las asignaciones cerradas se conservan por trazabilidad, pero el
        // equipo actual del proyecto solo lo forman las vigentes.
        if (!asignacion.activa) continue;
        personasPorProyecto.set(
          asignacion.proyectoId,
          (personasPorProyecto.get(asignacion.proyectoId) ?? 0) + 1,
        );
      }

      const { departamentoId, proyectoId } = datos.filtros;

      return datos.proyectos
        .filter((proyecto) => departamentoId === undefined || proyecto.departamentoId === departamentoId)
        .filter((proyecto) => proyectoId === undefined || proyecto.id === proyectoId)
        .map((proyecto) => {
          const horas = this.redondear(horasPorProyecto.get(proyecto.id) ?? 0);
          return {
            codigo: proyecto.codigo,
            nombre: proyecto.nombre,
            estado: proyecto.estado,
            departamento:
              proyecto.departamentoId === null
                ? SIN_DEPARTAMENTO
                : (nombresDepartamento.get(proyecto.departamentoId) ?? SIN_DEPARTAMENTO),
            fechaInicio: proyecto.fechaInicio,
            fechaFinEstimada: proyecto.fechaFinEstimada,
            presupuestoHoras: proyecto.presupuestoHoras,
            horasImputadas: horas,
            porcentajeConsumido: proyecto.porcentajeConsumido(horas),
            personasAsignadas: personasPorProyecto.get(proyecto.id) ?? 0,
          };
        });
    }

    protected override calcularTotales(
      filas: Record<string, ValorCelda>[],
      _datos: DatosReporte,
    ): Record<string, ValorCelda> {
      // No se totaliza el porcentaje: la suma de porcentajes de proyectos con
      // presupuestos distintos no significa nada.
      return {
        presupuestoHoras: this.redondear(
          this.sumar(filas.map((fila) => celdaNumerica(fila, 'presupuestoHoras'))),
        ),
        horasImputadas: this.redondear(
          this.sumar(filas.map((fila) => celdaNumerica(fila, 'horasImputadas'))),
        ),
      };
    }
  };

  return new Clase();
}
