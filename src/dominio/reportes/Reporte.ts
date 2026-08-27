import { ErrorValidacion } from '../base/errores.js';
import { crearReporteDepartamentos } from './ReporteDepartamentos.js';
import { crearReporteEmpleados } from './ReporteEmpleados.js';
import { crearReporteHoras } from './ReporteHoras.js';
import { crearReporteNomina } from './ReporteNomina.js';
import { crearReporteProyectos } from './ReporteProyectos.js';
import type { Empleado } from '../personas/Empleado.js';
import type { Departamento } from '../organizacion/Departamento.js';
import type { Proyecto } from '../organizacion/Proyecto.js';
import type { AsignacionProyecto } from '../organizacion/AsignacionProyecto.js';
import type { RegistroTiempo } from '../tiempo/RegistroTiempo.js';
import type {
  ColumnaReporte,
  DatosSensiblesDTO,
  ReporteDTO,
  TipoReporte,
  ValorCelda,
} from '../../compartido/tipos.js';

/**
 * Recorte que el solicitante pide sobre el conjunto de datos.
 *
 * Todos los campos son opcionales: un reporte sin filtros es el listado
 * completo. Las fechas llegan ya validadas por el esquema del servicio, de modo
 * que aquí se tratan como cadenas comparables (`AAAA-MM-DD` ordena
 * lexicograficamente igual que cronológicamente).
 */
export interface FiltrosReporte {
  desde?: string;
  hasta?: string;
  departamentoId?: string;
  proyectoId?: string;
  empleadoId?: string;
}

/**
 * Fotografía de todo lo que un reporte puede necesitar, ya leida del almacén.
 *
 * El servicio hace las lecturas y el descifrado; el reporte solo calcula. Esa
 * separación es lo que permite construir un reporte en una prueba unitaria con
 * cuatro objetos en memoria, sin KV, sin criptografía y sin sesión.
 */
export interface DatosReporte {
  empleados: Empleado[];
  departamentos: Departamento[];
  proyectos: Proyecto[];
  asignaciones: AsignacionProyecto[];
  registros: RegistroTiempo[];
  /** Datos personales descifrados por empleado. Vacío si no hay permiso. */
  sensibles: Map<string, DatosSensiblesDTO>;
  generadoPor: string;
  filtros: FiltrosReporte;
}

/**
 * Base abstracta del motor de reportes.
 *
 * ## Donde se ve el polimorfismo
 *
 * `generar` es un **método plantilla**: fija de una vez el algoritmo de un
 * reporte (cabecera, columnas, filas, totales) y delega en las subclases
 * unicamente los pasos que cambian. El servicio escribe
 * `Reporte.crear(tipo).generar(datos)` y **jamás menciona una clase concreta**:
 * no sabe si está generando la nómina o el listado de proyectos, y no le hace
 * falta. Agregar un reporte nuevo es escribir una subclase y sumar un caso a la
 * fabrica; ni el servicio, ni el router, ni los exportadores se enteran.
 *
 * La alternativa clásica -- un `generarReporte(tipo)` con un `switch` que arma
 * columnas y filas para cada caso -- concentra cinco reportes en una función de
 * varios cientos de líneas donde tocar uno arriesga romper los otros cuatro.
 *
 * ## Los reportes no conocen la infraestructura
 *
 * Ninguna subclase recibe el `Contexto` ni un repositorio: todo entra por
 * `DatosReporte`. Son objetos puros, sincrónicos y deterministas salvo por la
 * marca de tiempo de generación.
 */
export abstract class Reporte {
  /** Discriminante que viaja en el DTO y elige el nombre del archivo exportado. */
  abstract get tipo(): TipoReporte;

  /** Encabezado legible del documento. */
  abstract get titulo(): string;

  /** Una línea explicando que muestra el reporte y con que criterio. */
  abstract get descripcion(): string;

  /**
   * Definición de columnas. El `tipo` de cada una gobierna el formato de salida
   * en los cuatro exportadores, así que declararlo mal (un importe como
   * 'número') se nota en el CSV y en el PDF, no aquí.
   */
  abstract get columnas(): ColumnaReporte[];

  /** Paso variable 1: una fila por cada elemento que el reporte enumera. */
  protected abstract construirFilas(datos: DatosReporte): Record<string, ValorCelda>[];

  /**
   * Paso variable 2: la fila de cierre.
   *
   * Recibe las filas ya construidas para no recorrer los datos dos veces con
   * criterios que podrían discrepar. Las claves deben coincidir con las de las
   * columnas: los exportadores alinean cada total bajo su columna leyendo
   * `totales[columna.clave]`, y una clave inventada no se imprime en ningún
   * formato tabular.
   */
  protected abstract calcularTotales(
    filas: Record<string, ValorCelda>[],
    datos: DatosReporte,
  ): Record<string, ValorCelda>;

  /**
   * Método plantilla: fija el algoritmo, las subclases rellenan los pasos.
   *
   * Es concreto y deliberadamente corto. Que ninguna subclase pueda redefinirlo
   * garantiza que los cinco reportes salgan con la misma estructura de DTO, que
   * es justo lo que los exportadores dan por supuesto.
   */
  generar(datos: DatosReporte): ReporteDTO {
    // Las filas se calculan una sola vez y se pasan a los totales: recalcularlas
    // permitiría que el pie de página no cuadrase con el cuerpo del reporte.
    const filas = this.construirFilas(datos);
    return {
      tipo: this.tipo,
      titulo: this.titulo,
      descripcion: this.descripcion,
      generadoEn: new Date().toISOString(),
      generadoPor: datos.generadoPor,
      columnas: this.columnas,
      filas,
      totales: this.calcularTotales(filas, datos),
    };
  }

  /**
   * Fabrica: único punto del sistema que traduce un `TipoReporte` en una
   * implementación concreta.
   *
   * ## Por que las subclases se piden con una función y no con `new`
   *
   * Base y subclases forman un ciclo de imports inevitable: la fabrica necesita
   * conocerlas y ellas necesitan heredar de la base. En módulos ES ese ciclo
   * **no es inocuo**: la clausula `extends` se evalua al ejecutar el cuerpo del
   * módulo, y el orden de evaluación es en profundidad, así que las subclases
   * corren *antes* que este archivo. Si declarasen su clase en el cuerpo del
   * módulo, leerian `Reporte` mientras todavía está en su zona muerta temporal
   * y el programa reventaría al cargar con "Cannot access 'Reporte' before
   * initialization" -- en el arranque del Worker, no en una petición.
   *
   * Por eso cada subclase exporta una función constructora que declara su clase
   * en la primera llamada: al cargarse no toca la base, y cuando la fabrica la
   * invoca -- ya en tiempo de ejecución -- la jerarquía esta completa. El ciclo
   * queda, pero deja de importar.
   */
  static crear(tipo: TipoReporte): Reporte {
    switch (tipo) {
      case 'empleados':
        return crearReporteEmpleados();
      case 'departamentos':
        return crearReporteDepartamentos();
      case 'proyectos':
        return crearReporteProyectos();
      case 'horas':
        return crearReporteHoras();
      case 'nomina':
        return crearReporteNomina();
      default:
        // El tipo no protege en tiempo de ejecución: `tipo` llega de la cadena
        // de consulta, así que el caso "imposible" se valida igual.
        throw new ErrorValidacion(`Tipo de reporte no soportado: "${String(tipo)}".`, [
          {
            campo: 'tipo',
            mensaje: 'Debe ser uno de: empleados, departamentos, proyectos, horas, nómina.',
          },
        ]);
    }
  }

  /** Suma una serie de valores. Una lista vacía suma cero, no `NaN`. */
  protected sumar(valores: number[]): number {
    return valores.reduce((acumulado, valor) => acumulado + valor, 0);
  }

  /**
   * Redondeo a decimales fijos.
   *
   * Acumular horas o importes en coma flotante produce colas como
   * `160.00000000000003`, que en un reporte impreso parecen un error de
   * cálculo. Se redondea al final de cada agregación, nunca en cada suma.
   */
  protected redondear(valor: number, decimales = 2): number {
    const factor = 10 ** decimales;
    return Math.round(valor * factor) / factor;
  }
}
