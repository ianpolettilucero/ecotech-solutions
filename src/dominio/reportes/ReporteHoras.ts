import { Reporte, type DatosReporte } from './Reporte.js';
import type { AsignacionProyecto } from '../organizacion/AsignacionProyecto.js';
import type { Empleado } from '../personas/Empleado.js';
import type { ColumnaReporte, TipoReporte, ValorCelda } from '../../compartido/tipos.js';

const COLUMNAS: readonly ColumnaReporte[] = [
  { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
  { clave: 'empleado', titulo: 'Empleado', tipo: 'texto' },
  { clave: 'legajo', titulo: 'Legajo', tipo: 'texto' },
  { clave: 'proyecto', titulo: 'Proyecto', tipo: 'texto' },
  { clave: 'rolEnProyecto', titulo: 'Rol', tipo: 'texto' },
  { clave: 'horas', titulo: 'Horas', tipo: 'numero' },
  { clave: 'estado', titulo: 'Estado', tipo: 'texto' },
  { clave: 'descripcion', titulo: 'Tarea', tipo: 'texto' },
];

/** Celda sin dato conocido. Un guion se lee mejor que una celda vacía. */
const SIN_DATO = '-';

/** Lee una celda numérica ya construida; la ausente vale cero, nunca `NaN`. */
function celdaNumerica(fila: Record<string, ValorCelda>, clave: string): number {
  const valor = fila[clave];
  return typeof valor === 'number' ? valor : 0;
}

/** Clave del índice de asignaciones. Los ids son UUID, así que no colisiona. */
function claveVinculo(empleadoId: string, proyectoId: string): string {
  return `${empleadoId}|${proyectoId}`;
}

/** Clase concreta, resuelta en la primera llamada. Ver `Reporte.crear`. */
let Clase: (new () => Reporte) | undefined;

/**
 * Detalle de partes de horas: una fila por registro.
 *
 * Es el reporte que ataca de frente el problema original, la falta de
 * trazabilidad: cada hora cargada aparece con su fecha, su autor, su proyecto,
 * el rol con el que participaba ese día y el estado de aprobación. Nada se
 * agrega ni se promedia, porque el valor esta justamente en poder auditar la
 * línea individual.
 *
 * Los registros llegan **ya filtrados por fecha** desde el servicio; el reporte
 * no vuelve a filtrarlos para no aplicar dos criterios distintos sobre lo mismo.
 *
 * El rol se resuelve contra la asignación **vigente en la fecha del registro**,
 * no contra la actual: si alguien paso de DESARROLLADOR a LIDER_TECNICO en
 * marzo, las horas de febrero deben seguir apareciendo como desarrollador.
 */
export function crearReporteHoras(): Reporte {
  Clase ??= class ReporteHoras extends Reporte {
    override get tipo(): TipoReporte {
      return 'horas';
    }

    override get titulo(): string {
      return 'Detalle de horas registradas';
    }

    override get descripcion(): string {
      return 'Partes de horas del periodo, con su proyecto, rol y estado de aprobación.';
    }

    override get columnas(): ColumnaReporte[] {
      return [...COLUMNAS];
    }

    protected override construirFilas(datos: DatosReporte): Record<string, ValorCelda>[] {
      const empleadosPorId = new Map(
        datos.empleados.map((empleado): [string, Empleado] => [empleado.id, empleado]),
      );
      const nombresProyecto = new Map(
        datos.proyectos.map((proyecto): [string, string] => [proyecto.id, proyecto.nombre]),
      );

      // Índice empleado+proyecto -> asignaciones. Sin el, cada registro haría un
      // recorrido completo de las asignaciones y el reporte de un año entero
      // pasaría a ser cuadrático.
      const asignacionesPorVinculo = new Map<string, AsignacionProyecto[]>();
      for (const asignacion of datos.asignaciones) {
        const clave = claveVinculo(asignacion.empleadoId, asignacion.proyectoId);
        const existentes = asignacionesPorVinculo.get(clave);
        if (existentes === undefined) asignacionesPorVinculo.set(clave, [asignacion]);
        else existentes.push(asignacion);
      }

      const filas = datos.registros.map((registro) => {
        const empleado = empleadosPorId.get(registro.empleadoId);
        const vinculos =
          asignacionesPorVinculo.get(claveVinculo(registro.empleadoId, registro.proyectoId)) ?? [];
        const asignacion = vinculos.find((candidata) => candidata.estabaVigenteEn(registro.fecha));

        return {
          fecha: registro.fecha,
          empleado: empleado?.nombreCompleto() ?? SIN_DATO,
          legajo: empleado?.legajo ?? SIN_DATO,
          proyecto: nombresProyecto.get(registro.proyectoId) ?? SIN_DATO,
          rolEnProyecto: asignacion?.rolProyecto ?? SIN_DATO,
          horas: registro.horas,
          estado: registro.estado,
          // Texto escrito por el empleado. Se entrega tal cual: neutralizar la
          // inyección de fórmulas es responsabilidad del exportador, que es
          // quien sabe si el destino es un CSV, un PDF o un JSON.
          descripcion: registro.descripcion,
        };
      });

      // `AAAA-MM-DD` ordena igual como texto que como fecha, así que no hace
      // falta construir un `Date` por comparación. Más reciente primero, y a
      // igualdad de fecha por empleado, que es como se revisan los partes.
      filas.sort((primera, segunda) => {
        if (primera.fecha !== segunda.fecha) return primera.fecha < segunda.fecha ? 1 : -1;
        return primera.empleado.localeCompare(segunda.empleado);
      });

      return filas;
    }

    protected override calcularTotales(
      filas: Record<string, ValorCelda>[],
      _datos: DatosReporte,
    ): Record<string, ValorCelda> {
      const aprobadas = filas
        .filter((fila) => fila['estado'] === 'APROBADO')
        .map((fila) => celdaNumerica(fila, 'horas'));

      return {
        horas: this.redondear(this.sumar(filas.map((fila) => celdaNumerica(fila, 'horas')))),
        // Las aprobadas son las únicas que se pagan y se imputan a costo: el
        // contraste con el total es lo primero que mira quien aprueba.
        estado: `${this.redondear(this.sumar(aprobadas))} h aprobadas`,
      };
    }
  };

  return new Clase();
}
