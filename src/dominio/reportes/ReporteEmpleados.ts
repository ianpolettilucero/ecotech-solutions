import { Reporte, type DatosReporte } from './Reporte.js';
import { FabricaEmpleados } from '../fabricas/FabricaEmpleados.js';
import type { ColumnaReporte, TipoReporte, ValorCelda } from '../../compartido/tipos.js';

/**
 * Definición de columnas, declarada una vez a nivel de módulo.
 *
 * Es la misma lista para RRHH y para un gerente: la diferencia está en el
 * contenido de las dos últimas celdas, no en la forma del reporte.
 */
const COLUMNAS: readonly ColumnaReporte[] = [
  { clave: 'legajo', titulo: 'Legajo', tipo: 'texto' },
  { clave: 'nombreCompleto', titulo: 'Empleado', tipo: 'texto' },
  { clave: 'emailCorporativo', titulo: 'Email corporativo', tipo: 'texto' },
  { clave: 'tipoContrato', titulo: 'Contrato', tipo: 'texto' },
  { clave: 'departamento', titulo: 'Departamento', tipo: 'texto' },
  { clave: 'fechaInicioContrato', titulo: 'Inicio de contrato', tipo: 'fecha' },
  { clave: 'antiguedadAnios', titulo: 'Antigüedad (años)', tipo: 'numero' },
  { clave: 'activo', titulo: 'Activo', tipo: 'booleano' },
  { clave: 'documento', titulo: 'Documento', tipo: 'texto' },
  { clave: 'telefono', titulo: 'Teléfono', tipo: 'texto' },
];

/** Texto de la celda cuando el empleado no pertenece a ningún departamento. */
const SIN_DEPARTAMENTO = 'Sin asignar';

/**
 * Relleno de las celdas sensibles cuando el solicitante no tiene permiso.
 *
 * Se enmascara en lugar de omitir la columna, igual que hace `Empleado.aDTO`:
 * quien lee el reporte debe ver que el dato existe y está protegido, no creer
 * que el legajo esta incompleto.
 */
const ENMASCARADO = '********';

/** Clase concreta, resuelta en la primera llamada. Ver `Reporte.crear`. */
let Clase: (new () => Reporte) | undefined;

/**
 * Listado de plantilla.
 *
 * ## Un solo reporte para dos audiencias
 *
 * RRHH ve documento y teléfono; un gerente ve asteriscos en esas dos celdas.
 * No hay dos clases ni un `if` sobre el rol: el servicio decide si descifra o
 * no los datos personales y entrega `datos.sensibles` lleno o vacío. El reporte
 * solo mira si hay entrada para cada empleado. Duplicar la clase para "la
 * versión sin datos sensibles" obligaría a mantener dos veces las columnas y
 * los totales, y garantizaría que tarde o temprano divergieran.
 *
 * La clase se declara dentro de la función y no en el cuerpo del módulo para
 * no leer `Reporte` durante la carga: el porque está documentado en
 * `Reporte.crear`.
 */
export function crearReporteEmpleados(): Reporte {
  Clase ??= class ReporteEmpleados extends Reporte {
    override get tipo(): TipoReporte {
      return 'empleados';
    }

    override get titulo(): string {
      return 'Listado de empleados';
    }

    override get descripcion(): string {
      return 'Plantilla de la empresa con su contrato, departamento y antigüedad.';
    }

    override get columnas(): ColumnaReporte[] {
      // Copia: la definición es compartida por todas las instancias y quien
      // recibe el DTO no debe poder alterarla para los siguientes reportes.
      return [...COLUMNAS];
    }

    protected override construirFilas(datos: DatosReporte): Record<string, ValorCelda>[] {
      const nombresDepartamento = new Map(
        datos.departamentos.map((departamento): [string, string] => [
          departamento.id,
          departamento.nombre,
        ]),
      );
      const { departamentoId } = datos.filtros;

      return datos.empleados
        .filter((empleado) => departamentoId === undefined || empleado.departamentoId === departamentoId)
        .map((empleado) => {
          const sensibles = datos.sensibles.get(empleado.id);
          return {
            legajo: empleado.legajo,
            nombreCompleto: empleado.nombreCompleto(),
            emailCorporativo: empleado.emailCorporativo,
            // La etiqueta legible la resuelve la fabrica, que es el único lugar
            // del sistema que conoce el catálogo de modalidades de contrato.
            tipoContrato: FabricaEmpleados.etiqueta(empleado.tipoContrato),
            departamento:
              empleado.departamentoId === null
                ? SIN_DEPARTAMENTO
                : // Un departamento que ya no existe se muestra como no asignado
                  // antes que dejar la celda con un identificador crudo.
                  (nombresDepartamento.get(empleado.departamentoId) ?? SIN_DEPARTAMENTO),
            fechaInicioContrato: empleado.fechaInicioContrato,
            antiguedadAnios: empleado.antiguedadEnAnios(),
            activo: empleado.activo,
            documento: sensibles?.documento ?? ENMASCARADO,
            telefono: sensibles?.telefono ?? ENMASCARADO,
          };
        });
    }

    protected override calcularTotales(
      filas: Record<string, ValorCelda>[],
      _datos: DatosReporte,
    ): Record<string, ValorCelda> {
      const activos = filas.filter((fila) => fila['activo'] === true).length;
      // Los recuentos van como texto y bajo columnas de texto: un "12" suelto
      // en la columna "Activo" se leería como un valor booleano mal formateado.
      return {
        nombreCompleto: `${filas.length} empleados`,
        activo: `${activos} activos`,
      };
    }
  };

  return new Clase();
}
