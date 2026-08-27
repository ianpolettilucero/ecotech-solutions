/**
 * Tipos compartidos entre el Worker (servidor) y el cliente (SPA).
 *
 * Solo contiene *contratos de transporte* (DTOs). La logica de negocio vive en
 * `src/dominio`. Mantener este archivo libre de dependencias permite que tanto
 * el bundle del Worker como el del navegador lo importen sin arrastrar codigo.
 */

// ---------------------------------------------------------------------------
// Roles y permisos
// ---------------------------------------------------------------------------

/** Roles del sistema. Se modelan como union de literales (no `enum`) para que
 *  el tipo sobreviva al borrado de tipos de esbuild y sea serializable. */
export const ROLES = ['ADMIN_RRHH', 'GERENTE', 'EMPLEADO', 'AUDITOR'] as const;
export type Rol = (typeof ROLES)[number];

export const PERMISOS = [
  'empleado:leer',
  'empleado:leer_sensible',
  'empleado:crear',
  'empleado:editar',
  'empleado:eliminar',
  'departamento:leer',
  'departamento:crear',
  'departamento:editar',
  'departamento:eliminar',
  'proyecto:leer',
  'proyecto:crear',
  'proyecto:editar',
  'proyecto:eliminar',
  'asignacion:leer',
  'asignacion:gestionar',
  'tiempo:leer_propio',
  'tiempo:leer_todos',
  'tiempo:registrar',
  'tiempo:aprobar',
  'reporte:generar',
  'reporte:nomina',
  'auditoria:leer',
  'usuario:gestionar',
] as const;
export type Permiso = (typeof PERMISOS)[number];

// ---------------------------------------------------------------------------
// Enumeraciones de dominio
// ---------------------------------------------------------------------------

export const TIPOS_CONTRATO = ['ASALARIADO', 'POR_HORAS', 'CONTRATISTA'] as const;
export type TipoContrato = (typeof TIPOS_CONTRATO)[number];

export const ESTADOS_PROYECTO = [
  'PLANIFICADO',
  'EN_CURSO',
  'PAUSADO',
  'FINALIZADO',
  'CANCELADO',
] as const;
export type EstadoProyecto = (typeof ESTADOS_PROYECTO)[number];

export const ESTADOS_REGISTRO = ['BORRADOR', 'ENVIADO', 'APROBADO', 'RECHAZADO'] as const;
export type EstadoRegistro = (typeof ESTADOS_REGISTRO)[number];

export const ROLES_PROYECTO = [
  'LIDER_TECNICO',
  'DESARROLLADOR',
  'ANALISTA',
  'DISENADOR',
  'QA',
  'CONSULTOR',
] as const;
export type RolProyecto = (typeof ROLES_PROYECTO)[number];

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

/** Datos personales protegidos. Se cifran en reposo (AES-GCM) y solo se
 *  devuelven en claro a quien posee `empleado:leer_sensible`. */
export interface DatosSensiblesDTO {
  documento: string;
  telefono: string;
  direccion: string;
  emailPersonal: string;
}

export interface EmpleadoDTO {
  id: string;
  legajo: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  emailCorporativo: string;
  tipoContrato: TipoContrato;
  fechaInicioContrato: string;
  departamentoId: string | null;
  activo: boolean;
  /** Presente solo si el solicitante tiene permiso; si no, viene enmascarado. */
  datosSensibles: DatosSensiblesDTO;
  /** `true` cuando `datosSensibles` viene enmascarado por falta de permisos. */
  sensiblesEnmascarados: boolean;
  /** Parametros de remuneracion; enmascarados igual que los datos sensibles. */
  salarioMensual: number | null;
  tarifaHora: number | null;
  topeMensual: number | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface DepartamentoDTO {
  id: string;
  nombre: string;
  descripcion: string;
  gerenteId: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ProyectoDTO {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFinEstimada: string | null;
  estado: EstadoProyecto;
  departamentoId: string | null;
  presupuestoHoras: number;
  creadoEn: string;
  actualizadoEn: string;
}

export interface AsignacionDTO {
  id: string;
  empleadoId: string;
  proyectoId: string;
  rolProyecto: RolProyecto;
  porcentajeDedicacion: number;
  fechaAsignacion: string;
  fechaDesasignacion: string | null;
  activa: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface RegistroTiempoDTO {
  id: string;
  empleadoId: string;
  proyectoId: string;
  fecha: string;
  horas: number;
  descripcion: string;
  estado: EstadoRegistro;
  aprobadoPor: string | null;
  motivoRechazo: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface UsuarioDTO {
  id: string;
  email: string;
  rol: Rol;
  empleadoId: string | null;
  activo: boolean;
  debeCambiarContrasena: boolean;
  ultimoAcceso: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface RegistroAuditoriaDTO {
  id: string;
  usuarioId: string | null;
  emailUsuario: string | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: string;
  exito: boolean;
  ip: string | null;
  creadoEn: string;
}

export interface SesionDTO {
  usuario: UsuarioDTO;
  permisos: Permiso[];
  empleado: EmpleadoDTO | null;
  tokenCsrf: string;
  expiraEn: string;
}

// ---------------------------------------------------------------------------
// Envolturas de respuesta
// ---------------------------------------------------------------------------

export interface RespuestaOk<T> {
  ok: true;
  datos: T;
}

export interface DetalleErrorCampo {
  campo: string;
  mensaje: string;
}

export interface RespuestaError {
  ok: false;
  error: {
    codigo: string;
    mensaje: string;
    campos?: DetalleErrorCampo[];
  };
}

export type Respuesta<T> = RespuestaOk<T> | RespuestaError;

// ---------------------------------------------------------------------------
// Reportes
// ---------------------------------------------------------------------------

export const TIPOS_REPORTE = [
  'empleados',
  'departamentos',
  'proyectos',
  'horas',
  'nomina',
] as const;
export type TipoReporte = (typeof TIPOS_REPORTE)[number];

export const FORMATOS_EXPORTACION = ['json', 'csv', 'xlsx', 'pdf'] as const;
export type FormatoExportacion = (typeof FORMATOS_EXPORTACION)[number];

export type ValorCelda = string | number | boolean | null;

export interface ColumnaReporte {
  clave: string;
  titulo: string;
  tipo: 'texto' | 'numero' | 'fecha' | 'booleano' | 'moneda';
}

export interface ReporteDTO {
  tipo: TipoReporte;
  titulo: string;
  descripcion: string;
  generadoEn: string;
  generadoPor: string;
  columnas: ColumnaReporte[];
  filas: Record<string, ValorCelda>[];
  totales: Record<string, ValorCelda>;
}

// ---------------------------------------------------------------------------
// Panel / metricas
// ---------------------------------------------------------------------------

export interface MetricasPanelDTO {
  totalEmpleados: number;
  empleadosActivos: number;
  totalDepartamentos: number;
  proyectosEnCurso: number;
  horasMesActual: number;
  horasPendientesAprobacion: number;
  empleadosSinDepartamento: number;
  proyectosSobrePresupuesto: number;
  horasPorProyecto: { proyecto: string; horas: number }[];
  horasPorDepartamento: { departamento: string; horas: number }[];
}
