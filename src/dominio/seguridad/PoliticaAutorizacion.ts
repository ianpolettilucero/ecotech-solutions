import type { Permiso, Rol } from '../../compartido/tipos.js';
import { ErrorAutorizacion } from '../base/errores.js';

/**
 * Control de acceso basado en roles (RBAC).
 *
 * Requisito: "asegure que los usuarios solo tengan acceso a los modulos del
 * sistema para las que estan autorizados".
 *
 * La matriz es *deny-by-default*: un rol solo puede lo que figura aqui. Las
 * comprobaciones adicionales de propiedad del recurso (por ejemplo, que un
 * EMPLEADO solo vea sus propias horas) viven en los servicios, porque dependen
 * de datos y no solo del rol.
 */
const MATRIZ: Readonly<Record<Rol, readonly Permiso[]>> = Object.freeze({
  // Recursos Humanos: administra personas y estructura, pero no aprueba horas
  // de proyectos ajenos ni audita el sistema.
  ADMIN_RRHH: [
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
    'tiempo:leer_todos',
    'tiempo:leer_propio',
    'reporte:generar',
    'reporte:nomina',
    'auditoria:leer',
    'usuario:gestionar',
  ],

  // Gerencia: opera sobre proyectos y valida las horas de su gente, pero no
  // accede a datos personales sensibles ni a la nomina.
  GERENTE: [
    'empleado:leer',
    'departamento:leer',
    'proyecto:leer',
    'proyecto:crear',
    'proyecto:editar',
    'asignacion:leer',
    'asignacion:gestionar',
    'tiempo:leer_todos',
    'tiempo:leer_propio',
    'tiempo:registrar',
    'tiempo:aprobar',
    'reporte:generar',
  ],

  // Empleado: carga sus horas y consulta el organigrama. Nada mas.
  EMPLEADO: [
    'empleado:leer',
    'departamento:leer',
    'proyecto:leer',
    'asignacion:leer',
    'tiempo:leer_propio',
    'tiempo:registrar',
  ],

  // Auditor: solo lectura, incluida la traza de auditoria. Sin escritura.
  AUDITOR: [
    'empleado:leer',
    'departamento:leer',
    'proyecto:leer',
    'asignacion:leer',
    'tiempo:leer_todos',
    'reporte:generar',
    'auditoria:leer',
  ],
});

export class PoliticaAutorizacion {
  /** Permisos efectivos de un rol (copia inmutable). */
  static permisosDe(rol: Rol): Permiso[] {
    return [...(MATRIZ[rol] ?? [])];
  }

  static puede(rol: Rol, permiso: Permiso): boolean {
    return (MATRIZ[rol] ?? []).includes(permiso);
  }

  /** Igual que `puede`, pero cortando el flujo con 403 si no aplica. */
  static exigir(rol: Rol, permiso: Permiso): void {
    if (!PoliticaAutorizacion.puede(rol, permiso)) {
      throw new ErrorAutorizacion(
        `El rol ${rol} no tiene el permiso requerido (${permiso}).`,
      );
    }
  }

  /** Verdadero si el rol cubre al menos uno de los permisos indicados. */
  static puedeAlguno(rol: Rol, permisos: Permiso[]): boolean {
    return permisos.some((p) => PoliticaAutorizacion.puede(rol, p));
  }
}
