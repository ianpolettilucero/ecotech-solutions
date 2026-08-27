import { Empleado, type EstadoEmpleado } from '../personas/Empleado.js';
import { EmpleadoAsalariado } from '../personas/EmpleadoAsalariado.js';
import { EmpleadoPorHoras } from '../personas/EmpleadoPorHoras.js';
import { Contratista } from '../personas/Contratista.js';
import { ErrorValidacion } from '../base/errores.js';
import type { TipoContrato } from '../../compartido/tipos.js';

/**
 * Fabrica de empleados.
 *
 * Es el **unico** punto del sistema que menciona las clases concretas. Todo lo
 * demas (repositorios, servicios, informes, nomina) trabaja contra el tipo
 * abstracto `Empleado`.
 *
 * Resuelve un problema muy concreto de la persistencia: en KV se guarda un
 * objeto plano, y al leerlo hay que decidir que subclase reconstruir. Sin
 * fabrica, ese `switch` se repetiria en cada repositorio y en cada punto de alta.
 * Aqui esta una sola vez, y agregar una modalidad de contrato es agregar un caso
 * en un unico lugar conocido.
 */
export class FabricaEmpleados {
  /**
   * Reconstruye la instancia correcta a partir del estado persistido.
   * Es la operacion inversa de `Empleado.aEstado()`.
   */
  static rehidratar(estado: EstadoEmpleado): Empleado {
    switch (estado.tipoContrato) {
      case 'ASALARIADO':
        return new EmpleadoAsalariado(estado);
      case 'POR_HORAS':
        return new EmpleadoPorHoras(estado);
      case 'CONTRATISTA':
        return new Contratista(estado);
      default:
        // Un estado con tipo desconocido significa datos corruptos o una version
        // futura del esquema. Fallar es preferible a devolver un empleado con
        // remuneracion cero, que pasaria inadvertido en la nomina.
        throw new ErrorValidacion(
          `Tipo de contrato desconocido en el almacen: "${String(estado.tipoContrato)}".`,
        );
    }
  }

  /** Alta de un empleado nuevo, con los parametros propios de su modalidad. */
  static crear(datos: Omit<EstadoEmpleado, 'creadoEn' | 'actualizadoEn'>): Empleado {
    const ahora = new Date().toISOString();
    const empleado = FabricaEmpleados.rehidratar({
      ...datos,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
    // Se valida en el alta y no solo al guardar, para que un objeto invalido
    // nunca llegue a circular por la capa de servicio.
    empleado.validar();
    return empleado;
  }

  /** Etiquetas legibles para los desplegables del cliente y los informes. */
  static etiqueta(tipo: TipoContrato): string {
    switch (tipo) {
      case 'ASALARIADO':
        return 'Asalariado';
      case 'POR_HORAS':
        return 'Por horas';
      case 'CONTRATISTA':
        return 'Contratista';
      default:
        return String(tipo);
    }
  }

  /**
   * Campos economicos obligatorios segun la modalidad. El servicio los usa para
   * armar el esquema de validacion correcto sin conocer las clases concretas.
   */
  static camposRequeridos(tipo: TipoContrato): (keyof EstadoEmpleado)[] {
    switch (tipo) {
      case 'ASALARIADO':
        return ['salarioMensual'];
      case 'POR_HORAS':
        return ['tarifaHora'];
      case 'CONTRATISTA':
        return ['tarifaHora', 'topeMensual'];
      default:
        return [];
    }
  }
}
