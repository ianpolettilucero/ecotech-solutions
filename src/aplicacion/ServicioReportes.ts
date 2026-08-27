import type { Contexto } from './Contexto.js';
import { Reporte, type DatosReporte, type FiltrosReporte } from '../dominio/reportes/Reporte.js';
import { FabricaExportadores } from '../dominio/reportes/exportadores/FabricaExportadores.js';
import { ServicioAuditoria } from './ServicioAuditoria.js';
import { ErrorAutorizacion } from '../dominio/base/errores.js';
import type {
  DatosSensiblesDTO,
  FormatoExportacion,
  MetricasPanelDTO,
  ReporteDTO,
  TipoReporte,
} from '../compartido/tipos.js';

/** Limite de informes por usuario y ventana: generar un PDF cuesta CPU. */
const MAX_INFORMES = 20;
const VENTANA_INFORMES_SEGUNDOS = 60;

export interface ArchivoExportado {
  bytes: Uint8Array;
  tipoMime: string;
  nombreArchivo: string;
}

/**
 * Genera los informes del sistema.
 *
 * ## Donde esta el polimorfismo
 *
 * Este servicio no sabe que informes existen. Reune los datos una sola vez, pide
 * a `Reporte.crear(tipo)` la instancia adecuada y le manda `generar(datos)`; el
 * resultado se lo pasa al exportador que devuelva `FabricaExportadores.crear`.
 * Ni un `if` sobre el tipo de informe ni sobre el formato de salida. Anadir un
 * informe nuevo (por ejemplo, rotacion de personal) o un formato nuevo (ODS) no
 * toca este archivo.
 */
export class ServicioReportes {
  constructor(private readonly ctx: Contexto) {}

  // ---------------------------------------------------------------------------
  // Recoleccion de datos
  // ---------------------------------------------------------------------------

  /**
   * Carga todo lo que cualquier informe pueda necesitar, en paralelo.
   *
   * Se leen las cinco colecciones enteras a proposito: en un almacen clave-valor
   * no hay `JOIN` ni indices secundarios, y filtrar en KV no es mas barato que
   * filtrar en memoria una vez que el documento ya viajo. Son cinco lecturas
   * fijas, independientes del informe, en lugar de una cascada de consultas.
   */
  private async reunirDatos(filtros: FiltrosReporte): Promise<DatosReporte> {
    const solicitante = this.ctx.exigirPermiso('reporte:generar');

    const [empleados, departamentos, proyectos, asignaciones, registrosTodos] = await Promise.all([
      this.ctx.empleados.listar(),
      this.ctx.departamentos.listar(),
      this.ctx.proyectos.listar(),
      this.ctx.asignaciones.listar(),
      this.ctx.registrosTiempo.listar(),
    ]);

    const registros = registrosTodos.filter((registro) => {
      if (filtros.desde && registro.fecha < filtros.desde) return false;
      if (filtros.hasta && registro.fecha > filtros.hasta) return false;
      if (filtros.proyectoId && registro.proyectoId !== filtros.proyectoId) return false;
      if (filtros.empleadoId && registro.empleadoId !== filtros.empleadoId) return false;
      return true;
    });

    // Los datos personales solo se descifran si el rol lo habilita. Sin permiso,
    // el mapa va vacio y los informes imprimen la version enmascarada: el mismo
    // informe sirve para RRHH y para gerencia sin duplicar clases.
    const sensibles = new Map<string, DatosSensiblesDTO>();
    if (this.ctx.puede('empleado:leer_sensible')) {
      await Promise.all(
        empleados.map(async (empleado) => {
          try {
            sensibles.set(
              empleado.id,
              await this.ctx.cripto.descifrarObjeto<DatosSensiblesDTO>(empleado.datosSensibles),
            );
          } catch {
            // Un sobre que no abre (clave rotada, dato corrupto) no debe tumbar
            // el informe entero: ese empleado sale enmascarado y se sigue.
          }
        }),
      );
    }

    return {
      empleados,
      departamentos,
      proyectos,
      asignaciones,
      registros,
      sensibles,
      generadoPor: solicitante.email,
      filtros,
    };
  }

  // ---------------------------------------------------------------------------
  // Generacion
  // ---------------------------------------------------------------------------

  /** Comprueba el permiso adicional que exige la nomina. */
  private exigirPermisoDeTipo(tipo: TipoReporte): void {
    if (tipo === 'nomina' && !this.ctx.puede('reporte:nomina')) {
      throw new ErrorAutorizacion(
        'El informe de nomina expone remuneraciones y requiere el permiso reporte:nomina.',
      );
    }
  }

  async generar(tipo: TipoReporte, filtros: FiltrosReporte): Promise<ReporteDTO> {
    this.exigirPermisoDeTipo(tipo);
    const datos = await this.reunirDatos(filtros);
    const reporte = Reporte.crear(tipo).generar(datos);
    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'REPORTE_GENERADO',
      entidad: 'Reporte',
      entidadId: null,
      detalle: `tipo=${tipo} formato=json filas=${reporte.filas.length}`,
      exito: true,
    });
    return reporte;
  }

  async exportar(
    tipo: TipoReporte,
    formato: FormatoExportacion,
    filtros: FiltrosReporte,
  ): Promise<ArchivoExportado> {
    this.exigirPermisoDeTipo(tipo);
    const solicitante = this.ctx.exigirSolicitante();

    // Un PDF de miles de filas es la operacion mas cara del sistema; sin este
    // limite bastaria un bucle en la consola del navegador para agotar la cuota
    // de CPU del Worker.
    const limite = await this.ctx.limitador.consumir(
      `informes:${solicitante.usuarioId}`,
      MAX_INFORMES,
      VENTANA_INFORMES_SEGUNDOS,
    );
    if (!limite.permitido) {
      const { ErrorLimiteExcedido } = await import('../dominio/base/errores.js');
      throw new ErrorLimiteExcedido(
        'Demasiados informes seguidos. Espere unos segundos.',
        limite.reintentarEnSegundos,
      );
    }

    const datos = await this.reunirDatos(filtros);
    const reporte = Reporte.crear(tipo).generar(datos);
    const exportador = FabricaExportadores.crear(formato);
    const bytes = await exportador.exportar(reporte);

    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'REPORTE_EXPORTADO',
      entidad: 'Reporte',
      entidadId: null,
      detalle: `tipo=${tipo} formato=${formato} filas=${reporte.filas.length}`,
      exito: true,
    });

    return {
      bytes,
      tipoMime: exportador.tipoMime,
      nombreArchivo: exportador.nombreArchivo(reporte),
    };
  }

  // ---------------------------------------------------------------------------
  // Panel
  // ---------------------------------------------------------------------------

  /**
   * Metricas del panel de inicio.
   *
   * No exige `reporte:generar`: son agregados sin datos personales, y todo rol
   * autenticado necesita ver el estado general al entrar.
   */
  async metricasPanel(): Promise<MetricasPanelDTO> {
    this.ctx.exigirSolicitante();

    const [empleados, departamentos, proyectos, registros] = await Promise.all([
      this.ctx.empleados.listar(),
      this.ctx.departamentos.listar(),
      this.ctx.proyectos.listar(),
      this.ctx.registrosTiempo.listar(),
    ]);

    const mesActual = new Date().toISOString().slice(0, 7);
    const activos = empleados.filter((e) => e.activo);

    let horasMesActual = 0;
    let horasPendientes = 0;
    const horasPorProyectoId = new Map<string, number>();

    for (const registro of registros) {
      if (registro.estado === 'ENVIADO') horasPendientes += registro.horas;
      if (registro.estado !== 'APROBADO') continue;
      if (registro.fecha.startsWith(mesActual)) horasMesActual += registro.horas;
      horasPorProyectoId.set(
        registro.proyectoId,
        (horasPorProyectoId.get(registro.proyectoId) ?? 0) + registro.horas,
      );
    }

    // Horas por departamento: se imputan a traves del proyecto, no del empleado.
    // Un empleado de Operaciones que trabaja en un proyecto de I+D suma horas a
    // I+D, que es donde se consume el presupuesto.
    const horasPorDepartamentoId = new Map<string, number>();
    for (const proyecto of proyectos) {
      const horas = horasPorProyectoId.get(proyecto.id) ?? 0;
      if (horas === 0 || !proyecto.departamentoId) continue;
      horasPorDepartamentoId.set(
        proyecto.departamentoId,
        (horasPorDepartamentoId.get(proyecto.departamentoId) ?? 0) + horas,
      );
    }

    // El tipo tupla se anota de forma explicita: `new Map()` exige elementos
    // `readonly [K, V]` y un literal sin anotar puede inferirse como `string[]`,
    // que no cumple ese contrato. Es el mismo criterio que usan los reportes.
    const nombreDepartamento = new Map(
      departamentos.map((departamento): [string, string] => [departamento.id, departamento.nombre]),
    );

    const horasPorProyecto = proyectos
      .map((p) => ({ proyecto: p.nombre, horas: Math.round((horasPorProyectoId.get(p.id) ?? 0) * 100) / 100 }))
      .filter((f) => f.horas > 0)
      .sort((a, b) => b.horas - a.horas);

    const horasPorDepartamento = [...horasPorDepartamentoId.entries()]
      .map(([id, horas]) => ({
        departamento: nombreDepartamento.get(id) ?? 'Sin departamento',
        horas: Math.round(horas * 100) / 100,
      }))
      .sort((a, b) => b.horas - a.horas);

    return {
      totalEmpleados: empleados.length,
      empleadosActivos: activos.length,
      totalDepartamentos: departamentos.filter((d) => d.activo).length,
      proyectosEnCurso: proyectos.filter((p) => p.estado === 'EN_CURSO').length,
      horasMesActual: Math.round(horasMesActual * 100) / 100,
      horasPendientesAprobacion: Math.round(horasPendientes * 100) / 100,
      empleadosSinDepartamento: activos.filter((e) => e.departamentoId === null).length,
      proyectosSobrePresupuesto: proyectos.filter((p) =>
        p.excedePresupuesto(horasPorProyectoId.get(p.id) ?? 0),
      ).length,
      horasPorProyecto,
      horasPorDepartamento,
    };
  }
}
