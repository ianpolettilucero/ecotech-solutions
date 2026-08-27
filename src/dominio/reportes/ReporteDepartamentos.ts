import { Reporte, type DatosReporte } from './Reporte.js';
import type { Empleado } from '../personas/Empleado.js';
import type { ColumnaReporte, TipoReporte, ValorCelda } from '../../compartido/tipos.js';

const COLUMNAS: readonly ColumnaReporte[] = [
  { clave: 'nombre', titulo: 'Departamento', tipo: 'texto' },
  { clave: 'gerente', titulo: 'Gerente', tipo: 'texto' },
  { clave: 'cantidadEmpleados', titulo: 'Empleados', tipo: 'numero' },
  { clave: 'cantidadProyectos', titulo: 'Proyectos', tipo: 'numero' },
  { clave: 'horasAprobadas', titulo: 'Horas aprobadas', tipo: 'numero' },
  { clave: 'activo', titulo: 'Activo', tipo: 'booleano' },
];

/** Un departamento sin gerente designado no es un error: es un puesto abierto. */
const VACANTE = 'Vacante';

/** Lee una celda numerica ya construida; la ausente vale cero, nunca `NaN`. */
function celdaNumerica(fila: Record<string, ValorCelda>, clave: string): number {
  const valor = fila[clave];
  return typeof valor === 'number' ? valor : 0;
}

/** Cuenta ocurrencias por clave sobre un mapa acumulador. */
function acumular(mapa: Map<string, number>, clave: string, cantidad: number): void {
  mapa.set(clave, (mapa.get(clave) ?? 0) + cantidad);
}

/** Clase concreta, resuelta en la primera llamada. Ver `Reporte.crear`. */
let Clase: (new () => Reporte) | undefined;

/**
 * Radiografia del organigrama: cuanta gente, cuantos proyectos y cuantas horas
 * mueve cada unidad organizativa.
 *
 * La gerencia se resuelve como **asociacion**, no como herencia: `gerenteId`
 * apunta a un `Empleado` corriente, y por eso aqui basta con buscar ese id en
 * la plantilla. Si "Gerente" fuese una subclase, este reporte necesitaria un
 * `instanceof` para distinguirlos.
 *
 * Las horas se cuentan **solo si estan aprobadas** y se imputan al departamento
 * *del proyecto*, no al del empleado: una hora que un empleado de I+D dedica a
 * un proyecto de Ventas es costo de Ventas.
 */
export function crearReporteDepartamentos(): Reporte {
  Clase ??= class ReporteDepartamentos extends Reporte {
    override get tipo(): TipoReporte {
      return 'departamentos';
    }

    override get titulo(): string {
      return 'Resumen por departamento';
    }

    override get descripcion(): string {
      return 'Dotacion, proyectos y horas aprobadas de cada unidad organizativa.';
    }

    override get columnas(): ColumnaReporte[] {
      return [...COLUMNAS];
    }

    protected override construirFilas(datos: DatosReporte): Record<string, ValorCelda>[] {
      const empleadosPorId = new Map(
        datos.empleados.map((empleado): [string, Empleado] => [empleado.id, empleado]),
      );

      const empleadosPorDepartamento = new Map<string, number>();
      for (const empleado of datos.empleados) {
        if (empleado.departamentoId !== null) {
          acumular(empleadosPorDepartamento, empleado.departamentoId, 1);
        }
      }

      const proyectosPorDepartamento = new Map<string, number>();
      const departamentoDeProyecto = new Map<string, string>();
      for (const proyecto of datos.proyectos) {
        if (proyecto.departamentoId !== null) {
          acumular(proyectosPorDepartamento, proyecto.departamentoId, 1);
          departamentoDeProyecto.set(proyecto.id, proyecto.departamentoId);
        }
      }

      const horasPorDepartamento = new Map<string, number>();
      for (const registro of datos.registros) {
        if (!registro.computaParaNomina()) continue;
        const departamentoId = departamentoDeProyecto.get(registro.proyectoId);
        // Un registro de un proyecto sin departamento no se pierde: simplemente
        // no puede imputarse a ninguna fila de este reporte.
        if (departamentoId === undefined) continue;
        acumular(horasPorDepartamento, departamentoId, registro.horas);
      }

      return datos.departamentos.map((departamento) => {
        const gerente: Empleado | undefined =
          departamento.gerenteId === null ? undefined : empleadosPorId.get(departamento.gerenteId);
        return {
          nombre: departamento.nombre,
          gerente: gerente?.nombreCompleto() ?? VACANTE,
          cantidadEmpleados: empleadosPorDepartamento.get(departamento.id) ?? 0,
          cantidadProyectos: proyectosPorDepartamento.get(departamento.id) ?? 0,
          horasAprobadas: this.redondear(horasPorDepartamento.get(departamento.id) ?? 0),
          activo: departamento.activo,
        };
      });
    }

    protected override calcularTotales(
      filas: Record<string, ValorCelda>[],
      _datos: DatosReporte,
    ): Record<string, ValorCelda> {
      return {
        cantidadEmpleados: this.sumar(filas.map((fila) => celdaNumerica(fila, 'cantidadEmpleados'))),
        cantidadProyectos: this.sumar(filas.map((fila) => celdaNumerica(fila, 'cantidadProyectos'))),
        horasAprobadas: this.redondear(
          this.sumar(filas.map((fila) => celdaNumerica(fila, 'horasAprobadas'))),
        ),
      };
    }
  };

  return new Clase();
}
