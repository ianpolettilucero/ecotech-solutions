import { Reporte, type DatosReporte } from './Reporte.js';
import { FabricaEmpleados } from '../fabricas/FabricaEmpleados.js';
import type { ColumnaReporte, TipoReporte, ValorCelda } from '../../compartido/tipos.js';

const COLUMNAS: readonly ColumnaReporte[] = [
  { clave: 'legajo', titulo: 'Legajo', tipo: 'texto' },
  { clave: 'nombreCompleto', titulo: 'Empleado', tipo: 'texto' },
  { clave: 'tipoContrato', titulo: 'Contrato', tipo: 'texto' },
  { clave: 'departamento', titulo: 'Departamento', tipo: 'texto' },
  { clave: 'horasAprobadas', titulo: 'Horas aprobadas', tipo: 'numero' },
  { clave: 'modalidad', titulo: 'Modalidad de cálculo', tipo: 'texto' },
  { clave: 'remuneracion', titulo: 'Remuneración', tipo: 'moneda' },
];

const SIN_DEPARTAMENTO = 'Sin asignar';

/** Lee una celda numérica ya construida; la ausente vale cero, nunca `NaN`. */
function celdaNumerica(fila: Record<string, ValorCelda>, clave: string): number {
  const valor = fila[clave];
  return typeof valor === 'number' ? valor : 0;
}

/** Clase concreta, resuelta en la primera llamada. Ver `Reporte.crear`. */
let Clase: (new () => Reporte) | undefined;

/**
 * Liquidación del periodo.
 *
 * ## Este es el reporte que demuestra el polimorfismo
 *
 * En el bucle que arma las filas **no hay un solo `if` ni `switch` sobre
 * `tipoContrato`**, y tampoco un `instanceof`. Se recorre una lista de
 * `Empleado` y a cada uno se le pide su remuneración:
 *
 * - el asalariado devuelve su sueldo fijo e ignora las horas,
 * - el jornalizado multiplica por su tarifa y recarga las extra al 1,5x,
 * - el contratista factura por hora pero corta en su tope mensual.
 *
 * Cada objeto aplica su propia fórmula porque cada clase la encierra. La
 * versión con un campo `tipo` y un `switch` aquí obligaría a modificar este
 * archivo -- el que mueve dinero -- cada vez que la empresa incorpora una
 * modalidad de contratación; con esta, incorporarla es escribir una clase que
 * nadie más tiene que conocer.
 *
 * La única traducción por tipo que queda es la **etiqueta legible** de la
 * columna "Contrato", y la resuelve la fabrica, que es el lugar donde el
 * proyecto centraliza a propósito el catálogo de modalidades.
 *
 * Solo entran empleados activos y **solo cuentan las horas aprobadas**: pagar
 * sobre horas en borrador sería liquidar trabajo que nadie valido.
 */
export function crearReporteNomina(): Reporte {
  Clase ??= class ReporteNomina extends Reporte {
    override get tipo(): TipoReporte {
      return 'nomina';
    }

    override get titulo(): string {
      return 'Nómina del periodo';
    }

    override get descripcion(): string {
      return 'Remuneración bruta de cada empleado activo según su modalidad de contrato.';
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

      const horasPorEmpleado = new Map<string, number>();
      for (const registro of datos.registros) {
        if (!registro.computaParaNomina()) continue;
        horasPorEmpleado.set(
          registro.empleadoId,
          (horasPorEmpleado.get(registro.empleadoId) ?? 0) + registro.horas,
        );
      }

      return datos.empleados
        .filter((empleado) => empleado.activo)
        .map((empleado) => {
          const horas = this.redondear(horasPorEmpleado.get(empleado.id) ?? 0);
          return {
            legajo: empleado.legajo,
            nombreCompleto: empleado.nombreCompleto(),
            tipoContrato: FabricaEmpleados.etiqueta(empleado.tipoContrato),
            departamento:
              empleado.departamentoId === null
                ? SIN_DEPARTAMENTO
                : (nombresDepartamento.get(empleado.departamentoId) ?? SIN_DEPARTAMENTO),
            horasAprobadas: horas,
            // Las dos llamadas polimórficas: cada subclase se describe y se
            // liquida a si misma. Este archivo no sabe cual está respondiendo.
            modalidad: empleado.descripcionRemuneracion(),
            remuneracion: empleado.calcularRemuneracionMensual(horas),
          };
        });
    }

    protected override calcularTotales(
      filas: Record<string, ValorCelda>[],
      _datos: DatosReporte,
    ): Record<string, ValorCelda> {
      return {
        horasAprobadas: this.redondear(
          this.sumar(filas.map((fila) => celdaNumerica(fila, 'horasAprobadas'))),
        ),
        // Masa salarial del periodo: el número por el que se abre este reporte.
        remuneracion: this.redondear(
          this.sumar(filas.map((fila) => celdaNumerica(fila, 'remuneracion'))),
        ),
      };
    }
  };

  return new Clase();
}
