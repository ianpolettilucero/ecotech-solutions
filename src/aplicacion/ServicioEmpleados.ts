import type { Contexto } from './Contexto.js';
import { ServicioAuditoria } from './ServicioAuditoria.js';
import { FabricaEmpleados } from '../dominio/fabricas/FabricaEmpleados.js';
import type { Empleado } from '../dominio/personas/Empleado.js';
import type { DatosSensibles } from '../dominio/personas/Persona.js';
import { Esquema, campo } from '../dominio/validacion/Esquema.js';
import {
  ReglaBooleano,
  ReglaDocumento,
  ReglaEmail,
  ReglaEnumerado,
  ReglaFecha,
  ReglaIdentificador,
  ReglaNumero,
  ReglaTelefono,
  ReglaTexto,
} from '../dominio/validacion/Regla.js';
import { ErrorConflicto, ErrorReglaNegocio, ErrorValidacion } from '../dominio/base/errores.js';
import { formatearLegajo, nuevoId } from '../dominio/base/Identificador.js';
import type { SobreCifrado } from '../infraestructura/ServicioCripto.js';
import { TIPOS_CONTRATO } from '../compartido/tipos.js';
import type { DetalleErrorCampo, EmpleadoDTO, TipoContrato } from '../compartido/tipos.js';

/** Filtros admitidos por el listado. Todos opcionales y acumulativos (AND). */
export type FiltrosEmpleados = {
  departamentoId?: string;
  activo?: boolean;
  texto?: string;
  tipoContrato?: TipoContrato;
};

// ---------------------------------------------------------------------------
// Esquemas de validación
//
// Se declaran como constantes de módulo y no dentro de los métodos por dos
// motivos: se construyen una sola vez por isolate (los `RegExp` de las reglas
// no se recompilan en cada petición) y quedan disponibles para documentar la
// API con `describir()` sin ejecutar el servicio.
// ---------------------------------------------------------------------------

type DatosEmpleadoEntrada = {
  nombre: string;
  apellido: string;
  emailCorporativo: string;
  tipoContrato: TipoContrato;
  fechaInicioContrato: string;
  departamentoId?: string | null;
  documento: string;
  telefono: string;
  direccion: string;
  emailPersonal: string;
  salarioMensual?: number;
  tarifaHora?: number;
  topeMensual?: number;
};

const ESQUEMA_CREAR = new Esquema<DatosEmpleadoEntrada>({
  nombre: campo(new ReglaTexto(2, 60)),
  apellido: campo(new ReglaTexto(2, 60)),
  emailCorporativo: campo(new ReglaEmail()),
  tipoContrato: campo(new ReglaEnumerado(TIPOS_CONTRATO)),
  // Se permite fecha futura: es habitual dar de alta al empleado antes de que
  // se incorpore efectivamente.
  fechaInicioContrato: campo(new ReglaFecha(true)),
  departamentoId: campo(new ReglaIdentificador(), { opcional: true, admiteNulo: true }),
  documento: campo(new ReglaDocumento()),
  telefono: campo(new ReglaTelefono()),
  direccion: campo(new ReglaTexto(5, 200)),
  emailPersonal: campo(new ReglaEmail()),
  // Los económicos son opcionales en el esquema porque cuales son obligatorios
  // depende de la modalidad; eso lo decide `exigirCamposEconomicos`.
  salarioMensual: campo(new ReglaNumero(0.01, 100_000_000), { opcional: true }),
  tarifaHora: campo(new ReglaNumero(0.01, 1_000_000), { opcional: true }),
  topeMensual: campo(new ReglaNumero(0.01, 100_000_000), { opcional: true }),
});

/**
 * Actualización parcial. `tipoContrato` sigue admitido a propósito: si se
 * excluyera del esquema, intentar cambiarlo devolvería un genérico "campo no
 * reconocido" en vez del error de negocio explicativo que se lanza en
 * `actualizar`.
 */
const ESQUEMA_ACTUALIZAR = ESQUEMA_CREAR.parcial();

const ESQUEMA_ID = new Esquema<{ id: string }>({
  id: campo(new ReglaIdentificador()),
});

const ESQUEMA_DEPARTAMENTO = new Esquema<{ departamentoId: string | null }>({
  departamentoId: campo(new ReglaIdentificador(), { admiteNulo: true }),
});

const ESQUEMA_FILTROS = new Esquema<FiltrosEmpleados>({
  departamentoId: campo(new ReglaIdentificador(), { opcional: true }),
  activo: campo(new ReglaBooleano(), { opcional: true }),
  texto: campo(new ReglaTexto(0, 80), { opcional: true }),
  tipoContrato: campo(new ReglaEnumerado(TIPOS_CONTRATO), { opcional: true }),
});

/** Valores con los que se comprueba que no haya un empleado repetido. */
interface ClavesUnicidad {
  indiceDocumento: string;
  indiceEmailPersonal: string;
  emailCorporativo: string;
}

/**
 * Comprueba que vengan los campos económicos que exige la modalidad.
 *
 * La lista de campos la aporta `FabricaEmpleados.camposRequeridos`, de modo que
 * agregar una modalidad de contrato nueva no obliga a tocar este servicio.
 */
function exigirCamposEconomicos(
  tipo: TipoContrato,
  economicos: Record<string, number | null>,
): void {
  const faltantes: DetalleErrorCampo[] = [];
  for (const requerido of FabricaEmpleados.camposRequeridos(tipo)) {
    const clave = String(requerido);
    // Indexar un Record devuelve `T | undefined`: se normaliza a null.
    if ((economicos[clave] ?? null) === null) {
      faltantes.push({ campo: clave, mensaje: `Es obligatorio para un contrato ${tipo}.` });
    }
  }
  if (faltantes.length > 0) {
    throw new ErrorValidacion(
      `Faltan datos económicos propios de un contrato ${tipo}.`,
      faltantes,
    );
  }
}

/**
 * Casos de uso sobre empleados.
 *
 * Concentra lo que la entidad no puede resolver por si sola: autorización,
 * criptografía, integridad referencial con otros agregados y traza de
 * auditoría. La entidad sigue validando sus propios invariantes; el servicio
 * valida los que dependen del resto del sistema.
 */
export class ServicioEmpleados {
  constructor(private readonly ctx: Contexto) {}

  // -------------------------------------------------------------------------
  // Lectura
  // -------------------------------------------------------------------------

  /**
   * Listado filtrado.
   *
   * `texto` busca por nombre, apellido, legajo y email corporativo, y de forma
   * deliberada **nunca** por documento, teléfono, dirección o email personal:
   * esos datos viven dentro de un sobre AES-GCM y no existe forma de mirar
   * dentro sin descifrarlo entero. Hacerlo por cada empleado en cada búsqueda
   * sería caro y, peor aun, el tiempo de respuesta variaría según cuantos
   * sobres se abren, que es un canal lateral por temporización. Para buscar por
   * documento exacto esta el índice ciego (HMAC), que es lo que usa el control
   * de duplicados.
   */
  async listar(filtros?: FiltrosEmpleados): Promise<EmpleadoDTO[]> {
    this.ctx.exigirPermiso('empleado:leer');
    const criterios: FiltrosEmpleados = filtros ? ESQUEMA_FILTROS.validar(filtros) : {};
    const texto = criterios.texto?.trim().toLowerCase() ?? '';

    const empleados = await this.ctx.empleados.listar((empleado) => {
      if (criterios.departamentoId !== undefined) {
        if (empleado.departamentoId !== criterios.departamentoId) return false;
      }
      if (criterios.activo !== undefined && empleado.activo !== criterios.activo) return false;
      if (criterios.tipoContrato !== undefined) {
        if (empleado.tipoContrato !== criterios.tipoContrato) return false;
      }
      if (texto === '') return true;
      return [
        empleado.nombre,
        empleado.apellido,
        empleado.legajo,
        empleado.emailCorporativo,
      ].some((valor) => valor.toLowerCase().includes(texto));
    });

    empleados.sort((a, b) => a.nombreCompleto().localeCompare(b.nombreCompleto(), 'es'));

    // Decisión de rendimiento: en el listado se enmascara SIEMPRE, incluso para
    // quien tiene 'empleado:leer_sensible'. Descifrar N sobres implica N
    // operaciones de WebCrypto por petición y una pantalla de listado no
    // necesita el domicilio de nadie. El dato en claro se entrega en `obtener`,
    // que abre un único sobre y queda registrado como acceso puntual.
    return empleados.map((empleado) => empleado.aDTO(null));
  }

  async obtener(id: string): Promise<EmpleadoDTO> {
    this.ctx.exigirPermiso('empleado:leer');
    const empleado = await this.cargar(id);
    return this.aDTOConSensibles(empleado);
  }

  /** Uso interno de otros servicios: entidad de dominio, no DTO. */
  async obtenerEntidad(id: string): Promise<Empleado> {
    this.ctx.exigirPermiso('empleado:leer');
    return this.cargar(id);
  }

  /** Descifra el bloque sensible si el solicitante tiene permiso; si no, null. */
  async aDTOConSensibles(empleado: Empleado): Promise<EmpleadoDTO> {
    // Excepción de propiedad del dato: un empleado ve siempre su propia ficha
    // completa aunque su rol no tenga 'empleado:leer_sensible'. Negarle sus
    // propios datos personales no protege a nadie y obligaría a darle un
    // permiso que también abriría las fichas ajenas.
    const esSuPropiaFicha = this.ctx.solicitante?.empleadoId === empleado.id;
    if (!esSuPropiaFicha && !this.ctx.puede('empleado:leer_sensible')) {
      return empleado.aDTO(null);
    }
    // Si el sobre fue manipulado, AES-GCM falla y el error se propaga: es
    // detección de alteración del almacén y no debe silenciarse.
    const sensibles = await this.ctx.cripto.descifrarObjeto<DatosSensibles>(
      empleado.datosSensibles,
    );
    return empleado.aDTO(sensibles);
  }

  // -------------------------------------------------------------------------
  // Escritura
  // -------------------------------------------------------------------------

  async crear(datos: unknown): Promise<EmpleadoDTO> {
    this.ctx.exigirPermiso('empleado:crear');
    const entrada = ESQUEMA_CREAR.validar(datos);

    const economicos: Record<string, number | null> = {
      salarioMensual: entrada.salarioMensual ?? null,
      tarifaHora: entrada.tarifaHora ?? null,
      topeMensual: entrada.topeMensual ?? null,
    };
    exigirCamposEconomicos(entrada.tipoContrato, economicos);

    // Este es exactamente el problema de "duplicidad de información de
    // empleados" que motiva el sistema: en las hojas de cálculo la misma
    // persona terminaba cargada dos veces con el documento escrito distinto.
    // Se comprueba antes de escribir nada, y por índice ciego (HMAC) para no
    // tener que descifrar la colección entera ni guardar el documento en claro.
    const indiceDocumento = await this.ctx.cripto.indiceCiego(entrada.documento);
    const indiceEmailPersonal = await this.ctx.cripto.indiceCiego(entrada.emailPersonal);
    await this.exigirUnicidad(
      {
        indiceDocumento,
        indiceEmailPersonal,
        // `ReglaEmail` ya normaliza a minúsculas, así que la comparación
        // directa no distingue mayúsculas.
        emailCorporativo: entrada.emailCorporativo,
      },
      null,
    );

    const departamentoId = entrada.departamentoId ?? null;
    if (departamentoId !== null) await this.exigirDepartamentoValido(departamentoId);

    // Los cuatro datos personales viajan en un único sobre: se abren y se
    // cierran juntos, y así una sola operación de cifrado cubre toda la ficha.
    const sobre = await this.ctx.cripto.cifrarObjeto({
      documento: entrada.documento,
      telefono: entrada.telefono,
      direccion: entrada.direccion,
      emailPersonal: entrada.emailPersonal,
    });

    const legajo = formatearLegajo(await this.ctx.almacen.siguienteCorrelativo('legajo'));

    // La fabrica es el único punto que conoce las clases concretas; aquí solo
    // se trabaja contra el tipo abstracto `Empleado`.
    const empleado = FabricaEmpleados.crear({
      id: nuevoId(),
      nombre: entrada.nombre,
      apellido: entrada.apellido,
      emailCorporativo: entrada.emailCorporativo,
      datosSensibles: sobre,
      indiceDocumento,
      indiceEmailPersonal,
      legajo,
      tipoContrato: entrada.tipoContrato,
      fechaInicioContrato: entrada.fechaInicioContrato,
      departamentoId,
      activo: true,
      salarioMensual: economicos['salarioMensual'] ?? null,
      tarifaHora: economicos['tarifaHora'] ?? null,
      topeMensual: economicos['topeMensual'] ?? null,
    });

    await this.ctx.empleados.guardar(empleado);

    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'EMPLEADO_CREADO',
      entidad: 'Empleado',
      entidadId: empleado.id,
      detalle: `Alta de ${empleado.nombreCompleto()} (legajo ${legajo}, ${empleado.tipoContrato}).`,
      exito: true,
    });

    return this.aDTOConSensibles(empleado);
  }

  async actualizar(id: string, datos: unknown): Promise<EmpleadoDTO> {
    this.ctx.exigirPermiso('empleado:editar');
    const empleado = await this.cargar(id);
    const entrada = ESQUEMA_ACTUALIZAR.validar(datos);

    // La modalidad de contrato determina la clase concreta (asalariado, por
    // horas, contratista) y con ella la fórmula de remuneración. Cambiarla en
    // caliente exigiría mutar el tipo del objeto ya persistido y dejaría la
    // nómina de los periodos ya liquidados calculada con otra regla. El
    // procedimiento correcto es dar de baja el contrato y crear uno nuevo, que
    // además deja dos asientos de auditoría en vez de uno ambiguo.
    if (entrada.tipoContrato !== undefined && entrada.tipoContrato !== empleado.tipoContrato) {
      throw new ErrorReglaNegocio(
        'No se puede cambiar el tipo de contrato de un empleado existente. ' +
          'Debe darse de baja el contrato actual y registrar un alta nueva con la modalidad deseada.',
      );
    }

    const cambiaSensibles =
      entrada.documento !== undefined ||
      entrada.telefono !== undefined ||
      entrada.direccion !== undefined ||
      entrada.emailPersonal !== undefined;
    const emailCorporativoDestino = entrada.emailCorporativo ?? empleado.emailCorporativo;
    const cambiaEmailCorporativo = emailCorporativoDestino !== empleado.emailCorporativo;

    let indiceDocumento = empleado.indiceDocumento;
    let indiceEmailPersonal = empleado.indiceEmailPersonal;
    let sobreNuevo: SobreCifrado | null = null;

    if (cambiaSensibles) {
      // El sobre es indivisible: para modificar un solo campo hay que abrirlo,
      // mezclar con lo que ya había y volver a cerrarlo con un IV nuevo.
      const actuales = await this.ctx.cripto.descifrarObjeto<DatosSensibles>(
        empleado.datosSensibles,
      );
      const fusionados: DatosSensibles = {
        documento: entrada.documento ?? actuales.documento,
        telefono: entrada.telefono ?? actuales.telefono,
        direccion: entrada.direccion ?? actuales.direccion,
        emailPersonal: entrada.emailPersonal ?? actuales.emailPersonal,
      };
      indiceDocumento = await this.ctx.cripto.indiceCiego(fusionados.documento);
      indiceEmailPersonal = await this.ctx.cripto.indiceCiego(fusionados.emailPersonal);
      sobreNuevo = await this.ctx.cripto.cifrarObjeto(fusionados);
    }

    if (cambiaSensibles || cambiaEmailCorporativo) {
      // Se excluye al propio empleado: de lo contrario chocaría consigo mismo.
      await this.exigirUnicidad(
        { indiceDocumento, indiceEmailPersonal, emailCorporativo: emailCorporativoDestino },
        empleado.id,
      );
    }

    if (sobreNuevo !== null) {
      empleado.actualizarDatosSensibles(sobreNuevo, indiceDocumento, indiceEmailPersonal);
    }
    if (cambiaEmailCorporativo) empleado.cambiarEmailCorporativo(emailCorporativoDestino);

    if (entrada.nombre !== undefined || entrada.apellido !== undefined) {
      empleado.renombrar(entrada.nombre ?? empleado.nombre, entrada.apellido ?? empleado.apellido);
    }
    if (entrada.fechaInicioContrato !== undefined) {
      empleado.cambiarFechaInicioContrato(entrada.fechaInicioContrato);
    }
    if (entrada.departamentoId !== undefined) {
      if (entrada.departamentoId === null) {
        empleado.quitarDeDepartamento();
      } else {
        await this.exigirDepartamentoValido(entrada.departamentoId);
        empleado.asignarADepartamento(entrada.departamentoId);
      }
    }

    if (
      entrada.salarioMensual !== undefined ||
      entrada.tarifaHora !== undefined ||
      entrada.topeMensual !== undefined
    ) {
      // Cada subclase toma solo los parámetros que le competen e ignora los
      // nulos, de modo que enviar los tres es seguro: el que no aplica se
      // descarta y el ausente no pisa el valor vigente.
      empleado.actualizarRemuneracion({
        salarioMensual: entrada.salarioMensual ?? null,
        tarifaHora: entrada.tarifaHora ?? null,
        topeMensual: entrada.topeMensual ?? null,
      });
    }

    await this.ctx.empleados.guardar(empleado);

    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'EMPLEADO_ACTUALIZADO',
      entidad: 'Empleado',
      entidadId: empleado.id,
      // Se registran los campos tocados, nunca sus valores: un asiento de
      // auditoría con el domicilio en claro anularía el cifrado en reposo.
      detalle: `Campos modificados: ${Object.keys(entrada).join(', ') || 'ninguno'}.`,
      exito: true,
    });

    return this.aDTOConSensibles(empleado);
  }

  /**
   * Baja del empleado.
   *
   * Es una **baja lógica**: `desactivar()` marca el registro como inactivo pero
   * lo conserva. Un borrado físico dejaría huerfanas las horas ya cargadas y
   * las asignaciones históricas, y los informes de periodos ya cerrados
   * cambiarian retroactivamente, que es justamente lo que se busca evitar.
   *
   * Efecto en cascada sobre los agregados que lo referencian, para no dejar
   * punteros colgando:
   * 1. cualquier departamento que dirigiera queda con la gerencia vacante;
   * 2. sus asignaciones a proyectos se cierran con fecha de hoy (no se borran:
   *    explican las horas imputadas hasta hoy);
   * 3. su cuenta de acceso, si tenía una, se desactiva; de nada sirve dar de
   *    baja a alguien si conserva la sesión.
   */
  async eliminar(id: string): Promise<void> {
    this.ctx.exigirPermiso('empleado:eliminar');
    const empleado = await this.cargar(id);
    if (!empleado.activo) {
      throw new ErrorReglaNegocio('El empleado ya se encuentra dado de baja.');
    }

    const departamentos = await this.ctx.departamentos.listar(
      (departamento) => departamento.gerenteId === empleado.id,
    );
    for (const departamento of departamentos) departamento.liberarSiEsGerente(empleado.id);
    await this.ctx.departamentos.guardarVarias(departamentos);

    const hoy = new Date().toISOString().slice(0, 10);
    const asignaciones = await this.ctx.asignaciones.listar(
      (asignacion) => asignacion.empleadoId === empleado.id && asignacion.activa,
    );
    for (const asignacion of asignaciones) {
      // Una asignación con fecha de alta futura no puede cerrarse antes de
      // empezar; en ese caso se cierra en su propia fecha de inicio.
      asignacion.desasignar(hoy < asignacion.fechaAsignacion ? asignacion.fechaAsignacion : hoy);
    }
    await this.ctx.asignaciones.guardarVarias(asignaciones);

    const usuario = await this.ctx.usuarios.buscarUno((cuenta) => cuenta.empleadoId === empleado.id);
    if (usuario !== null && usuario.activo) {
      usuario.desactivar();
      await this.ctx.usuarios.guardar(usuario);
    }

    empleado.desactivar();
    await this.ctx.empleados.guardar(empleado);

    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'EMPLEADO_DADO_DE_BAJA',
      entidad: 'Empleado',
      entidadId: empleado.id,
      detalle:
        `Baja lógica de ${empleado.nombreCompleto()} (legajo ${empleado.legajo}). ` +
        `Gerencias liberadas: ${departamentos.length}; asignaciones cerradas: ${asignaciones.length}; ` +
        `cuenta desactivada: ${usuario !== null ? 'si' : 'no'}.`,
      exito: true,
    });
  }

  /** Reasigna el departamento del empleado. `null` lo deja sin departamento. */
  async asignarDepartamento(id: string, departamentoId: string | null): Promise<EmpleadoDTO> {
    this.ctx.exigirPermiso('empleado:editar');
    const empleado = await this.cargar(id);
    const destino = ESQUEMA_DEPARTAMENTO.validar({ departamentoId }).departamentoId;

    if (destino === null) {
      empleado.quitarDeDepartamento();
    } else {
      await this.exigirDepartamentoValido(destino);
      // La entidad garantiza el invariante "un solo departamento a la vez":
      // el campo es escalar, asignar es reemplazar.
      empleado.asignarADepartamento(destino);
    }

    await this.ctx.empleados.guardar(empleado);

    await new ServicioAuditoria(this.ctx).registrar({
      accion: destino === null ? 'EMPLEADO_DEPARTAMENTO_QUITADO' : 'EMPLEADO_DEPARTAMENTO_ASIGNADO',
      entidad: 'Empleado',
      entidadId: empleado.id,
      detalle:
        destino === null
          ? `${empleado.legajo} quedo sin departamento.`
          : `${empleado.legajo} asignado al departamento ${destino}.`,
      exito: true,
    });

    return this.aDTOConSensibles(empleado);
  }

  // -------------------------------------------------------------------------
  // Apoyo privado
  // -------------------------------------------------------------------------

  /**
   * Valida el identificador y recupera la entidad, sin comprobar permisos: los
   * comprueba cada caso de uso con el permiso que le corresponde.
   */
  private async cargar(id: string): Promise<Empleado> {
    const identificador = ESQUEMA_ID.validar({ id }).id;
    return this.ctx.empleados.obtenerOFallar(identificador);
  }

  /**
   * Nucleo del control de duplicados. Recorre la colección una sola vez
   * comparando huellas HMAC (documento y email personal) y el email
   * corporativo en claro, que no es dato sensible.
   *
   * @param idExcluido empleado que no debe compararse consigo mismo (edición).
   */
  private async exigirUnicidad(claves: ClavesUnicidad, idExcluido: string | null): Promise<void> {
    const otros = await this.ctx.empleados.listar((empleado) => empleado.id !== idExcluido);
    for (const otro of otros) {
      if (otro.indiceDocumento === claves.indiceDocumento) {
        throw new ErrorConflicto(
          `Ya existe un empleado registrado con ese documento (legajo ${otro.legajo}).`,
        );
      }
      if (otro.emailCorporativo.toLowerCase() === claves.emailCorporativo) {
        throw new ErrorConflicto(
          `El email corporativo ya está en uso por el legajo ${otro.legajo}.`,
        );
      }
      if (otro.indiceEmailPersonal === claves.indiceEmailPersonal) {
        throw new ErrorConflicto(
          `Ya existe un empleado registrado con ese email personal (legajo ${otro.legajo}).`,
        );
      }
    }
  }

  /**
   * Integridad referencial entre agregados: se comprueba aquí y no en la
   * entidad, porque exige consultar otro repositorio y `Empleado` no debe
   * conocer la persistencia.
   */
  private async exigirDepartamentoValido(departamentoId: string): Promise<void> {
    const departamento = await this.ctx.departamentos.obtener(departamentoId);
    if (departamento === null || !departamento.activo) {
      throw new ErrorValidacion('El departamento indicado no existe o está inactivo.', [
        { campo: 'departamentoId', mensaje: 'No corresponde a un departamento activo.' },
      ]);
    }
  }
}
