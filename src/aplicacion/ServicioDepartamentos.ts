import { Departamento } from '../dominio/organizacion/Departamento.js';
import { nuevoId } from '../dominio/base/Identificador.js';
import { ErrorConflicto, ErrorReglaNegocio, ErrorValidacion } from '../dominio/base/errores.js';
import { Esquema, campo } from '../dominio/validacion/Esquema.js';
import { ReglaBooleano, ReglaIdentificador, ReglaTexto } from '../dominio/validacion/Regla.js';
import type { DepartamentoDTO } from '../compartido/tipos.js';
import type { Contexto } from './Contexto.js';
import { ServicioAuditoria } from './ServicioAuditoria.js';

/** Cuerpo aceptado al crear un departamento, ya normalizado por el esquema. */
type EntradaDepartamento = {
  nombre: string;
  descripcion: string;
  /** Ausente = sin gerente; `null` explicito = dejar el puesto vacante. */
  gerenteId?: string | null;
};

type FiltrosDepartamento = {
  activo?: boolean;
  texto?: string;
};

/**
 * Esquemas declarados una sola vez a nivel de modulo.
 *
 * Construirlos dentro de cada metodo los recrearia en cada peticion y, sobre
 * todo, dispersaria el contrato de entrada por el cuerpo del servicio. Aqui el
 * contrato se lee de un vistazo y es el mismo objeto que documenta la API.
 */
const ESQUEMA_DEPARTAMENTO = new Esquema<EntradaDepartamento>({
  nombre: campo(new ReglaTexto(3, 80)),
  descripcion: campo(new ReglaTexto(0, 500), { opcional: true, porDefecto: '' }),
  gerenteId: campo(new ReglaIdentificador(), { opcional: true, admiteNulo: true }),
});

/**
 * Variante para actualizaciones parciales: lo que no viene, no se toca. Un PUT
 * completo obligaria al cliente a reenviar el gerente en cada renombrado, con
 * el riesgo de borrarlo por omision.
 */
const ESQUEMA_DEPARTAMENTO_PARCIAL = ESQUEMA_DEPARTAMENTO.parcial();

const ESQUEMA_FILTROS = new Esquema<FiltrosDepartamento>({
  activo: campo(new ReglaBooleano(), { opcional: true }),
  texto: campo(new ReglaTexto(1, 80), { opcional: true }),
});

/**
 * Los identificadores llegan por la ruta, no por el cuerpo, pero son entrada de
 * usuario igual. Se validan con un esquema para que un id malformado devuelva
 * un 400 con detalle y no se use como clave de busqueda tal cual.
 */
const ESQUEMA_ID = new Esquema<{ id: string }>({
  id: campo(new ReglaIdentificador()),
});

/**
 * Normaliza texto para buscar: minusculas y sin marcas diacriticas, de modo que
 * "investigacion" encuentre tambien lo que se cargo con tilde. La busqueda es
 * en memoria porque KV no ofrece indices de texto y el volumen de una PyME
 * (decenas de departamentos) no lo justifica.
 */
function normalizarBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Gestion de la estructura organizativa.
 *
 * Concentra las reglas que la entidad `Departamento` no puede sostener por si
 * sola porque exigen mirar otros agregados: la unicidad del nombre (necesita
 * ver el resto de departamentos) y que el gerente sea un empleado real y
 * activo (necesita el repositorio de empleados). Mantenerlas aqui deja a la
 * entidad libre de dependencias de infraestructura y por lo tanto testeable
 * sin almacen.
 */
export class ServicioDepartamentos {
  constructor(private readonly ctx: Contexto) {}

  // ---------------------------------------------------------------------------
  // Lectura
  // ---------------------------------------------------------------------------

  /** Listado con filtro por estado y busqueda libre sobre nombre y descripcion. */
  async listar(filtros?: { activo?: boolean; texto?: string }): Promise<DepartamentoDTO[]> {
    this.ctx.exigirPermiso('departamento:leer');
    const { activo, texto } = ESQUEMA_FILTROS.validar(filtros ?? {});
    const aguja = texto === undefined ? null : normalizarBusqueda(texto);

    const departamentos = await this.ctx.departamentos.listar((departamento) => {
      if (activo !== undefined && departamento.activo !== activo) return false;
      if (aguja === null) return true;
      return normalizarBusqueda(
        `${departamento.nombre} ${departamento.descripcion}`,
      ).includes(aguja);
    });

    // Orden estable por nombre: el cliente pinta el organigrama tal cual llega.
    return departamentos
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((departamento) => departamento.aDTO());
  }

  async obtener(id: string): Promise<DepartamentoDTO> {
    this.ctx.exigirPermiso('departamento:leer');
    const departamento = await this.ctx.departamentos.obtenerOFallar(this.normalizarId(id));
    return departamento.aDTO();
  }

  /**
   * Cantidad de empleados activos por departamento, indexada por id.
   *
   * Se exige `departamento:leer` y no `empleado:leer` porque lo que se expone
   * es un agregado de la estructura, sin un solo dato de persona; ademas todo
   * rol que ve el organigrama ve tambien esta columna en el listado.
   *
   * Se siembran en cero todos los departamentos existentes para que el cliente
   * no tenga que distinguir "sin empleados" de "clave ausente".
   */
  async conteoEmpleados(): Promise<Record<string, number>> {
    this.ctx.exigirPermiso('departamento:leer');

    const conteo: Record<string, number> = {};
    for (const departamento of await this.ctx.departamentos.listar()) {
      conteo[departamento.id] = 0;
    }

    const empleados = await this.ctx.empleados.listar((empleado) => empleado.activo);
    for (const empleado of empleados) {
      const departamentoId = empleado.departamentoId;
      if (departamentoId === null) continue;
      conteo[departamentoId] = (conteo[departamentoId] ?? 0) + 1;
    }
    return conteo;
  }

  // ---------------------------------------------------------------------------
  // Escritura
  // ---------------------------------------------------------------------------

  async crear(datos: unknown): Promise<DepartamentoDTO> {
    this.ctx.exigirPermiso('departamento:crear');
    const validados = ESQUEMA_DEPARTAMENTO.validar(datos);

    const nombreNormalizado = Departamento.normalizarNombre(validados.nombre);
    await this.exigirNombreDisponible(nombreNormalizado, null);
    const gerenteId = await this.resolverGerente(validados.gerenteId ?? null);

    const ahora = new Date().toISOString();
    const departamento = new Departamento({
      id: nuevoId(),
      creadoEn: ahora,
      actualizadoEn: ahora,
      nombre: validados.nombre,
      nombreNormalizado,
      descripcion: validados.descripcion,
      gerenteId,
      activo: true,
    });

    await this.ctx.departamentos.guardar(departamento);
    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'DEPARTAMENTO_CREADO',
      entidad: 'Departamento',
      entidadId: departamento.id,
      detalle: `nombre=${departamento.nombre}`,
      exito: true,
    });
    return departamento.aDTO();
  }

  async actualizar(id: string, datos: unknown): Promise<DepartamentoDTO> {
    this.ctx.exigirPermiso('departamento:editar');
    const idDepartamento = this.normalizarId(id);
    const validados = ESQUEMA_DEPARTAMENTO_PARCIAL.validar(datos);
    const departamento = await this.ctx.departamentos.obtenerOFallar(idDepartamento);

    const cambios: string[] = [];

    if (validados.nombre !== undefined) {
      const nombreNormalizado = Departamento.normalizarNombre(validados.nombre);
      // Se excluye el propio id: renombrar "Ventas" a "ventas" no es duplicar.
      await this.exigirNombreDisponible(nombreNormalizado, idDepartamento);
      departamento.renombrar(validados.nombre);
      cambios.push('nombre');
    }

    if (validados.descripcion !== undefined) {
      departamento.cambiarDescripcion(validados.descripcion);
      cambios.push('descripcion');
    }

    if (validados.gerenteId !== undefined) {
      departamento.designarGerente(await this.resolverGerente(validados.gerenteId));
      cambios.push('gerenteId');
    }

    await this.ctx.departamentos.guardar(departamento);
    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'DEPARTAMENTO_ACTUALIZADO',
      entidad: 'Departamento',
      entidadId: departamento.id,
      detalle: `campos=${cambios.length > 0 ? cambios.join(', ') : 'sin cambios'}`,
      exito: true,
    });
    return departamento.aDTO();
  }

  /**
   * Baja de un departamento.
   *
   * **No hay borrado en cascada.** Si quedan empleados activos asignados, la
   * operacion se rechaza en vez de dejarlos en el aire: hacer desaparecer en
   * silencio la pertenencia organizativa de gente que sigue trabajando
   * descuadraria los informes por departamento sin que nadie lo hubiera
   * decidido, y es exactamente el tipo de perdida de datos que el sistema debe
   * evitar. Reasignar personas es una decision de RRHH, no un efecto colateral
   * de un clic en "eliminar".
   *
   * Cuando ya no queda nadie, la baja es *logica* (`desactivar`): los proyectos
   * y las horas de periodos cerrados siguen apuntando a este id y necesitan
   * poder resolverlo para mostrarse.
   */
  async eliminar(id: string): Promise<void> {
    this.ctx.exigirPermiso('departamento:eliminar');
    const idDepartamento = this.normalizarId(id);
    const departamento = await this.ctx.departamentos.obtenerOFallar(idDepartamento);

    const empleadosActivos = await this.ctx.empleados.contar(
      (empleado) => empleado.activo && empleado.departamentoId === idDepartamento,
    );
    if (empleadosActivos > 0) {
      const detalle =
        empleadosActivos === 1
          ? '1 empleado activo asignado'
          : `${empleadosActivos} empleados activos asignados`;
      throw new ErrorReglaNegocio(
        `No se puede eliminar el departamento "${departamento.nombre}": tiene ${detalle}. ` +
          'Reasigne esas personas a otro departamento antes de darlo de baja.',
      );
    }

    departamento.desactivar();
    await this.ctx.departamentos.guardar(departamento);
    await new ServicioAuditoria(this.ctx).registrar({
      accion: 'DEPARTAMENTO_DESACTIVADO',
      entidad: 'Departamento',
      entidadId: departamento.id,
      detalle: `baja logica de "${departamento.nombre}" sin empleados activos`,
      exito: true,
    });
  }

  // ---------------------------------------------------------------------------
  // Reglas que necesitan mirar otros agregados
  // ---------------------------------------------------------------------------

  private normalizarId(id: string): string {
    return ESQUEMA_ID.validar({ id }).id;
  }

  /**
   * Unicidad de nombre por su forma normalizada.
   *
   * Se compara contra todos los departamentos, incluidos los inactivos: un
   * nombre dado de baja sigue reservado, porque reutilizarlo haria que dos
   * unidades distintas se confundieran en los informes historicos. Para volver
   * a usarlo hay que reactivar el original.
   */
  private async exigirNombreDisponible(
    nombreNormalizado: string,
    idExcluido: string | null,
  ): Promise<void> {
    const duplicado = await this.ctx.departamentos.buscarUno(
      (departamento) =>
        departamento.id !== idExcluido &&
        departamento.nombreNormalizado === nombreNormalizado,
    );
    if (duplicado) {
      throw new ErrorConflicto(
        `Ya existe un departamento llamado "${duplicado.nombre}".`,
      );
    }
  }

  /**
   * Integridad referencial del gerente.
   *
   * La entidad guarda solo el id y no puede comprobar que exista; esa
   * verificacion vive aqui porque requiere otro repositorio. Se exige ademas
   * que el empleado este activo: designar gerente a alguien dado de baja
   * dejaria un departamento dirigido por quien ya no trabaja en la empresa.
   */
  private async resolverGerente(gerenteId: string | null): Promise<string | null> {
    if (gerenteId === null) return null;

    const empleado = await this.ctx.empleados.obtener(gerenteId);
    if (!empleado) {
      throw new ErrorValidacion('El gerente indicado no existe.', [
        { campo: 'gerenteId', mensaje: 'No corresponde a ningun empleado registrado.' },
      ]);
    }
    if (!empleado.activo) {
      throw new ErrorValidacion('El gerente indicado no esta activo.', [
        { campo: 'gerenteId', mensaje: 'El empleado esta dado de baja.' },
      ]);
    }
    return empleado.id;
  }
}
