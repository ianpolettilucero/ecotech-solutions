/**
 * Módulo de empleados.
 *
 * Dos detalles de esta pantalla no son cosméticos:
 *
 * 1. El listado NUNCA trae datos personales en claro (el servidor los enmascara
 *    siempre en la lista), así que "Ver" y "Editar" piden la ficha completa por
 *    id. Cuando aun así llegan enmascarados es que el usuario no tiene
 *    `empleado:leer_sensible`, y entonces se dice con todas las letras en vez
 *    de mostrar unos asteriscos que parecen un dato sin cargar.
 * 2. Los campos económicos que se envian dependen de la modalidad de contrato.
 *    Ver `cuerpoAlta`.
 */

import type {
  DepartamentoDTO,
  EmpleadoDTO,
  Permiso,
  TipoContrato,
} from '../../compartido/tipos.js';
import { TIPOS_CONTRATO } from '../../compartido/tipos.js';
import { ClienteApi, ErrorApi } from '../ClienteApi.js';
import type { NombreIcono } from '../dom.js';
import {
  agregar,
  div,
  elemento,
  etiqueta,
  formatearFecha,
  formatearMoneda,
  hoy,
  vaciar,
} from '../dom.js';
import { Vista } from '../Vista.js';
import { Formulario } from '../componentes/Formulario.js';
import type { CampoFormulario } from '../componentes/Formulario.js';
import { Modal } from '../componentes/Modal.js';
import { Tabla } from '../componentes/Tabla.js';
import type { ColumnaTabla } from '../componentes/Tabla.js';
import {
  boton,
  botonera,
  buscador,
  campoFiltro,
  cargando,
  estadoVacio,
  filtros,
  insignia,
  selector,
} from '../componentes/piezas.js';

/** Respuesta del catálogo de departamentos, que llega con su conteo. */
interface RespuestaDepartamentos {
  departamentos: DepartamentoDTO[];
  conteoEmpleados: Record<string, number>;
}

/** Lo que devuelve `Formulario.valores()`. */
type Valores = Record<string, string | number | boolean | null>;

/**
 * Campos económicos que acepta cada modalidad.
 *
 * La tabla vive aquí, en un solo sitio, y la usan tanto el envío del alta como
 * la ficha de solo lectura: así no hay dos listas que puedan discrepar.
 */
const CAMPOS_ECONOMICOS: Readonly<Record<TipoContrato, readonly string[]>> = Object.freeze({
  ASALARIADO: ['salarioMensual'],
  POR_HORAS: ['tarifaHora'],
  CONTRATISTA: ['tarifaHora', 'topeMensual'],
});

const ETIQUETAS_ECONOMICAS: Readonly<Record<string, string>> = Object.freeze({
  salarioMensual: 'Salario mensual',
  tarifaHora: 'Tarifa por hora',
  topeMensual: 'Tope mensual',
});

function esTipoContrato(valor: string): valor is TipoContrato {
  return (TIPOS_CONTRATO as readonly string[]).includes(valor);
}

function camposEconomicos(tipoContrato: string): readonly string[] {
  return esTipoContrato(tipoContrato) ? CAMPOS_ECONOMICOS[tipoContrato] : [];
}

function comoTexto(valor: string | number | boolean | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(valor);
}

/** `Formulario` ya convierte los campos numéricos; el resto no es un número. */
function comoNumero(valor: string | number | boolean | null | undefined): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

export class VistaEmpleados extends Vista {
  private texto = '';
  private departamentoId = '';
  private tipoContrato = '';
  private activo = '';
  private departamentos: DepartamentoDTO[] = [];
  /** Trozo de DOM que se repinta al filtrar, sin rehacer la vista entera. */
  private zona: HTMLElement | null = null;

  override get ruta(): string {
    return 'empleados';
  }

  override get titulo(): string {
    return 'Empleados';
  }

  override get icono(): NombreIcono {
    return 'personas';
  }

  override get permisos(): Permiso[] {
    return ['empleado:leer'];
  }

  override async render(contenedor: HTMLElement): Promise<void> {
    contenedor.classList.add('pila');
    this.departamentos = await this.cargarDepartamentos();

    const zona = div('pila');
    this.zona = zona;

    agregar(contenedor, this.cabecera(), div('tarjeta', this.barraFiltros(), zona));
    await this.cargar();
  }

  // ---------------------------------------------------------------------------
  // Armazón de la pantalla
  // ---------------------------------------------------------------------------

  private cabecera(): HTMLElement {
    const cabecera = div(
      'seccion-titulo',
      div(
        'pila',
        elemento('h2', { clase: 'titulo-pagina', texto: 'Plantilla' }),
        elemento('p', {
          clase: 'subtitulo',
          texto: 'Alta, consulta y baja de empleados. Los datos personales solo se muestran a quien tiene permiso para verlos.',
        }),
      ),
    );
    if (this.app.puede('empleado:crear')) {
      agregar(cabecera, botonera(boton('Nuevo empleado', () => this.abrirAlta(), 'primario')));
    }
    return cabecera;
  }

  private barraFiltros(): HTMLElement {
    const opcionesDepartamento = [
      { valor: '', texto: 'Todos los departamentos' },
      ...this.departamentos.map((departamento) => ({
        valor: departamento.id,
        texto: departamento.nombre,
      })),
    ];
    const opcionesContrato = [
      { valor: '', texto: 'Todos los contratos' },
      ...TIPOS_CONTRATO.map((tipo) => ({ valor: tipo, texto: etiqueta(tipo) })),
    ];
    const opcionesEstado = [
      { valor: '', texto: 'Todos' },
      { valor: 'true', texto: 'Activos' },
      { valor: 'false', texto: 'Inactivos' },
    ];

    return filtros(
      campoFiltro(
        'Buscar',
        buscador('Nombre, legajo o email', (texto) => {
          this.texto = texto;
          void this.cargar();
        }),
      ),
      campoFiltro(
        'Departamento',
        selector(opcionesDepartamento, this.departamentoId, (valor) => {
          this.departamentoId = valor;
          void this.cargar();
        }),
      ),
      campoFiltro(
        'Contrato',
        selector(opcionesContrato, this.tipoContrato, (valor) => {
          this.tipoContrato = valor;
          void this.cargar();
        }),
      ),
      campoFiltro(
        'Estado',
        selector(opcionesEstado, this.activo, (valor) => {
          this.activo = valor;
          void this.cargar();
        }),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Datos
  // ---------------------------------------------------------------------------

  /**
   * Catálogo de departamentos, solo para resolver nombres y poblar selectores.
   * Si el rol no lo puede leer, la vista sigue siendo útil: la columna muestra
   * un guion en vez de dejar la pantalla en un error.
   */
  private async cargarDepartamentos(): Promise<DepartamentoDTO[]> {
    if (!this.app.puede('departamento:leer')) return [];
    try {
      const respuesta = await ClienteApi.get<RespuestaDepartamentos>('/api/departamentos');
      return respuesta.departamentos;
    } catch {
      return [];
    }
  }

  private async cargar(): Promise<void> {
    const zona = this.zona;
    if (!zona) return;

    vaciar(zona);
    agregar(zona, cargando());

    const consulta = ClienteApi.consulta({
      texto: this.texto,
      departamentoId: this.departamentoId,
      tipoContrato: this.tipoContrato,
      activo: this.activo,
    });
    const empleados = await this.app.intentar(() =>
      ClienteApi.get<EmpleadoDTO[]>(`/api/empleados${consulta}`),
    );

    vaciar(zona);
    if (!empleados) {
      agregar(zona, estadoVacio('No se pudo cargar el listado de empleados.'));
      return;
    }
    agregar(zona, this.tabla().render(empleados));
  }

  private tabla(): Tabla<EmpleadoDTO> {
    const columnas: ColumnaTabla<EmpleadoDTO>[] = [
      { titulo: 'Legajo', clase: 'celda-codigo', celda: (e) => e.legajo },
      { titulo: 'Nombre completo', celda: (e) => e.nombreCompleto },
      { titulo: 'Email corporativo', celda: (e) => e.emailCorporativo },
      { titulo: 'Contrato', celda: (e) => insignia(e.tipoContrato) },
      { titulo: 'Departamento', celda: (e) => this.nombreDepartamento(e.departamentoId) },
      { titulo: 'Ingreso', celda: (e) => formatearFecha(e.fechaInicioContrato) },
      { titulo: 'Estado', celda: (e) => this.insigniaEstado(e.activo) },
      { titulo: 'Acciones', clase: 'celda-acciones', celda: (e) => this.acciones(e) },
    ];
    return new Tabla<EmpleadoDTO>(columnas, {
      vacio: 'Ningún empleado coincide con los filtros aplicados.',
    });
  }

  private acciones(empleado: EmpleadoDTO): HTMLElement {
    const botones: HTMLElement[] = [
      boton('Ver', () => void this.abrirFicha(empleado.id), 'fantasma'),
    ];
    if (this.app.puede('empleado:editar')) {
      botones.push(boton('Editar', () => void this.abrirEdicion(empleado.id), 'secundario'));
    }
    // Solo se ofrece la baja de quien sigue activo: repetirla es un error de
    // negocio en el servidor y no tiene sentido invitar a provocarlo.
    if (this.app.puede('empleado:eliminar') && empleado.activo) {
      // Etiqueta corta a propósito: la fila ya tiene ocho columnas y "Dar de
      // baja" empujaba la acción fuera del ancho visible. El alcance completo
      // de la operación se explica en el diálogo de confirmación, que es donde
      // hay que leerlo antes de decidir.
      botones.push(boton('Baja', () => void this.darDeBaja(empleado), 'peligro'));
    }
    return botonera(...botones);
  }

  /**
   * El alta y la baja no son una enumeración del dominio, así que `etiqueta()`
   * no las traduce: la insignia se arma aquí con el mismo lenguaje visual.
   */
  private insigniaEstado(activo: boolean): HTMLElement {
    return elemento('span', {
      clase: activo ? 'insignia insignia-exito' : 'insignia insignia-neutro',
      texto: activo ? 'Activo' : 'Inactivo',
    });
  }

  private nombreDepartamento(id: string | null): string {
    if (id === null || id === '') return 'Sin asignar';
    // `.find` puede no encontrar nada; sin el catálogo cargado, tampoco.
    return this.departamentos.find((departamento) => departamento.id === id)?.nombre ?? '-';
  }

  // ---------------------------------------------------------------------------
  // Ficha de solo lectura
  // ---------------------------------------------------------------------------

  private async abrirFicha(id: string): Promise<void> {
    // La ficha se pide por id a propósito: el listado enmascara siempre los
    // datos personales, tenga permiso quien mira o no.
    const empleado = await this.app.intentar(() =>
      ClienteApi.get<EmpleadoDTO>(`/api/empleados/${id}`),
    );
    if (!empleado) return;

    Modal.abrir({
      titulo: `Ficha de ${empleado.nombreCompleto}`,
      contenido: this.ficha(empleado),
      // El diálogo siempre trae dos botones; en una ficha que no guarda nada
      // los dos cierran, y el principal se rotula sin ambiguedad.
      textoAceptar: 'Cerrar',
      textoCancelar: 'Volver',
      alAceptar: () => true,
    });
  }

  private ficha(empleado: EmpleadoDTO): Node {
    const contenido = div(
      'pila',
      this.dato('Legajo', empleado.legajo),
      this.dato('Nombre completo', empleado.nombreCompleto),
      this.dato('Email corporativo', empleado.emailCorporativo),
      this.dato('Tipo de contrato', etiqueta(empleado.tipoContrato)),
      this.dato('Fecha de ingreso', formatearFecha(empleado.fechaInicioContrato)),
      this.dato('Departamento', this.nombreDepartamento(empleado.departamentoId)),
      this.dato('Estado', empleado.activo ? 'Activo' : 'Inactivo'),
      elemento('hr', { clase: 'separador' }),
    );

    if (empleado.sensiblesEnmascarados) {
      agregar(contenido, this.avisoEnmascarado());
      return contenido;
    }

    agregar(
      contenido,
      this.dato('Documento', empleado.datosSensibles.documento),
      this.dato('Teléfono', empleado.datosSensibles.telefono),
      this.dato('Dirección', empleado.datosSensibles.direccion),
      this.dato('Email personal', empleado.datosSensibles.emailPersonal),
    );
    // Solo se listan las condiciones económicas propias de la modalidad: en un
    // contrato por horas el "salario mensual" no está vacío, es que no existe.
    for (const clave of camposEconomicos(empleado.tipoContrato)) {
      agregar(
        contenido,
        this.dato(
          ETIQUETAS_ECONOMICAS[clave] ?? clave,
          formatearMoneda(this.valorEconomico(empleado, clave)),
        ),
      );
    }
    return contenido;
  }

  private avisoEnmascarado(): HTMLElement {
    return div(
      'aviso-seguridad',
      elemento('span', { texto: '!', datos: { 'aria-hidden': 'true' } }),
      div(
        'pila',
        elemento('strong', { texto: 'Datos personales ocultos' }),
        elemento('p', {
          texto: 'Su usuario no tiene el permiso para ver datos personales, así que el documento, el teléfono, la dirección, el email personal y las condiciones económicas no se muestran. Lo que el servidor devuelve en su lugar no es el dato real.',
        }),
      ),
    );
  }

  private valorEconomico(empleado: EmpleadoDTO, clave: string): number | null {
    if (clave === 'salarioMensual') return empleado.salarioMensual;
    if (clave === 'tarifaHora') return empleado.tarifaHora;
    return empleado.topeMensual;
  }

  private dato(rotulo: string, valor: string): HTMLElement {
    return div(
      'fila fila-separada',
      elemento('span', { clase: 'texto-tenue', texto: rotulo }),
      elemento('span', { texto: valor === '' ? '-' : valor }),
    );
  }

  // ---------------------------------------------------------------------------
  // Alta
  // ---------------------------------------------------------------------------

  private abrirAlta(): void {
    const formulario = new Formulario(this.camposAlta());

    Modal.abrir({
      titulo: 'Nuevo empleado',
      contenido: formulario.render(),
      textoAceptar: 'Dar de alta',
      alAceptar: async () => {
        formulario.limpiarErrores();
        try {
          await ClienteApi.post<EmpleadoDTO>('/api/empleados', this.cuerpoAlta(formulario.valores()));
        } catch (error) {
          // Los errores por campo se pintan bajo su input; el mensaje general
          // va a la notificación. El diálogo sigue abierto con lo escrito.
          formulario.mostrarErrores(error);
          this.app.notificarError(
            error instanceof ErrorApi ? error.message : 'No se pudo dar de alta al empleado.',
          );
          return false;
        }
        this.app.notificarExito('Empleado dado de alta.');
        await this.cargar();
        return true;
      },
    });
    formulario.enfocar();
  }

  private camposAlta(): CampoFormulario[] {
    return [
      { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
      { nombre: 'apellido', etiqueta: 'Apellido', tipo: 'texto', requerido: true },
      {
        nombre: 'emailCorporativo',
        etiqueta: 'Email corporativo',
        tipo: 'email',
        requerido: true,
      },
      {
        nombre: 'tipoContrato',
        etiqueta: 'Tipo de contrato',
        tipo: 'seleccion',
        requerido: true,
        valor: 'ASALARIADO',
        opciones: TIPOS_CONTRATO.map((tipo) => ({ valor: tipo, texto: etiqueta(tipo) })),
        ayuda: 'Decide qué condiciones económicas hay que completar y no se puede cambiar después del alta.',
      },
      {
        nombre: 'fechaInicioContrato',
        etiqueta: 'Fecha de ingreso',
        tipo: 'fecha',
        requerido: true,
        valor: hoy(),
      },
      {
        nombre: 'departamentoId',
        etiqueta: 'Departamento',
        tipo: 'seleccion',
        valor: '',
        opciones: this.opcionesDepartamento(null),
      },
      { nombre: 'documento', etiqueta: 'Documento', tipo: 'texto', requerido: true },
      { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', requerido: true },
      { nombre: 'direccion', etiqueta: 'Dirección', tipo: 'texto', requerido: true },
      { nombre: 'emailPersonal', etiqueta: 'Email personal', tipo: 'email', requerido: true },
      {
        nombre: 'salarioMensual',
        etiqueta: 'Salario mensual',
        tipo: 'numero',
        ayuda: 'Solo para contratos asalariados.',
      },
      {
        nombre: 'tarifaHora',
        etiqueta: 'Tarifa por hora',
        tipo: 'numero',
        ayuda: 'Solo para contratos por horas y de contratista.',
      },
      {
        nombre: 'topeMensual',
        etiqueta: 'Tope mensual',
        tipo: 'numero',
        ayuda: 'Solo para contratistas: límite que la facturación del mes no puede superar.',
      },
    ];
  }

  /**
   * Cuerpo del alta.
   *
   * Los tres campos económicos se pintan siempre porque el usuario puede
   * cambiar de modalidad mientras rellena, pero **solo viajan los que la
   * modalidad elegida admite**: un contrato por horas no tiene salario mensual,
   * y mandarlo igualmente guardaría un dato que la fórmula de remuneración no
   * va a usar nunca. El resto se omite del cuerpo, no se envia como nulo.
   */
  private cuerpoAlta(valores: Valores): Record<string, unknown> {
    const tipoContrato = comoTexto(valores['tipoContrato']);
    const departamentoId = comoTexto(valores['departamentoId']);

    const cuerpo: Record<string, unknown> = {
      nombre: comoTexto(valores['nombre']),
      apellido: comoTexto(valores['apellido']),
      emailCorporativo: comoTexto(valores['emailCorporativo']),
      tipoContrato,
      fechaInicioContrato: comoTexto(valores['fechaInicioContrato']),
      // "Sin asignar" viaja como nulo: el esquema admite nulo, pero no una
      // cadena vacía como identificador.
      departamentoId: departamentoId === '' ? null : departamentoId,
      documento: comoTexto(valores['documento']),
      telefono: comoTexto(valores['telefono']),
      direccion: comoTexto(valores['direccion']),
      emailPersonal: comoTexto(valores['emailPersonal']),
    };

    for (const clave of camposEconomicos(tipoContrato)) {
      const valor = comoNumero(valores[clave]);
      // Si falta, se omite: el servidor responde con el error por campo
      // ("es obligatorio para este contrato") y queda pintado en su sitio.
      if (valor !== null) cuerpo[clave] = valor;
    }
    return cuerpo;
  }

  // ---------------------------------------------------------------------------
  // Edición
  // ---------------------------------------------------------------------------

  private async abrirEdicion(id: string): Promise<void> {
    const empleado = await this.app.intentar(() =>
      ClienteApi.get<EmpleadoDTO>(`/api/empleados/${id}`),
    );
    if (!empleado) return;

    const campos = this.camposEdicion(empleado);
    const formulario = new Formulario(campos);
    const contenido = div('pila', formulario.render());
    // Sin permiso sobre los datos personales, esos campos no se pintan: lo que
    // llega enmascarado no se puede editar sin sobrescribir el dato real.
    if (empleado.sensiblesEnmascarados) agregar(contenido, this.avisoEnmascarado());

    Modal.abrir({
      titulo: `Editar a ${empleado.nombreCompleto}`,
      contenido,
      textoAceptar: 'Guardar cambios',
      alAceptar: async () => {
        formulario.limpiarErrores();
        const cambios = this.cambios(campos, formulario.valores());
        if (Object.keys(cambios).length === 0) {
          this.app.notificarAviso('No hay cambios que guardar.');
          return false;
        }
        try {
          await ClienteApi.patch<EmpleadoDTO>(`/api/empleados/${empleado.id}`, cambios);
        } catch (error) {
          formulario.mostrarErrores(error);
          this.app.notificarError(
            error instanceof ErrorApi ? error.message : 'No se pudo guardar la ficha.',
          );
          return false;
        }
        this.app.notificarExito('Ficha actualizada.');
        await this.cargar();
        return true;
      },
    });
    formulario.enfocar();
  }

  private camposEdicion(empleado: EmpleadoDTO): CampoFormulario[] {
    const campos: CampoFormulario[] = [
      { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, valor: empleado.nombre },
      {
        nombre: 'apellido',
        etiqueta: 'Apellido',
        tipo: 'texto',
        requerido: true,
        valor: empleado.apellido,
      },
      {
        nombre: 'emailCorporativo',
        etiqueta: 'Email corporativo',
        tipo: 'email',
        requerido: true,
        valor: empleado.emailCorporativo,
      },
      {
        nombre: 'tipoContrato',
        etiqueta: 'Tipo de contrato',
        tipo: 'seleccion',
        valor: empleado.tipoContrato,
        opciones: TIPOS_CONTRATO.map((tipo) => ({ valor: tipo, texto: etiqueta(tipo) })),
        // La modalidad define la clase concreta y la fórmula de remuneración:
        // cambiarla exige baja y alta nueva, así que aquí solo se muestra.
        soloLectura: true,
        ayuda: 'Para cambiar la modalidad hay que dar de baja el contrato y registrar un alta nueva.',
      },
      {
        nombre: 'fechaInicioContrato',
        etiqueta: 'Fecha de ingreso',
        tipo: 'fecha',
        requerido: true,
        valor: empleado.fechaInicioContrato,
      },
      {
        nombre: 'departamentoId',
        etiqueta: 'Departamento',
        tipo: 'seleccion',
        valor: empleado.departamentoId ?? '',
        opciones: this.opcionesDepartamento(empleado.departamentoId),
      },
    ];

    if (empleado.sensiblesEnmascarados) return campos;

    campos.push(
      {
        nombre: 'documento',
        etiqueta: 'Documento',
        tipo: 'texto',
        requerido: true,
        valor: empleado.datosSensibles.documento,
      },
      {
        nombre: 'telefono',
        etiqueta: 'Teléfono',
        tipo: 'texto',
        requerido: true,
        valor: empleado.datosSensibles.telefono,
      },
      {
        nombre: 'direccion',
        etiqueta: 'Dirección',
        tipo: 'texto',
        requerido: true,
        valor: empleado.datosSensibles.direccion,
      },
      {
        nombre: 'emailPersonal',
        etiqueta: 'Email personal',
        tipo: 'email',
        requerido: true,
        valor: empleado.datosSensibles.emailPersonal,
      },
    );

    for (const clave of camposEconomicos(empleado.tipoContrato)) {
      campos.push({
        nombre: clave,
        etiqueta: ETIQUETAS_ECONOMICAS[clave] ?? clave,
        tipo: 'numero',
        valor: this.valorEconomico(empleado, clave),
      });
    }
    return campos;
  }

  /**
   * Cambios respecto de lo que se cargo en el formulario.
   *
   * Se compara contra el valor con el que se pinto cada campo, que salió del
   * DTO: así el PATCH lleva solo lo que el usuario toco. Mandar la ficha
   * entera reescribiría el sobre cifrado de los datos personales en cada
   * guardado y dejaría una traza de auditoría que dice que cambio todo.
   */
  private cambios(campos: CampoFormulario[], valores: Valores): Record<string, unknown> {
    const cambios: Record<string, unknown> = {};

    for (const campo of campos) {
      if (campo.soloLectura) continue;

      if (campo.tipo === 'numero') {
        const nuevo = comoNumero(valores[campo.nombre]);
        // Vaciar un importe no se traduce en un envío: la modalidad exige que
        // exista, y borrarlo es un error de datos, no una intención.
        if (nuevo !== null && nuevo !== comoNumero(campo.valor)) cambios[campo.nombre] = nuevo;
        continue;
      }

      const nuevo = comoTexto(valores[campo.nombre]);
      if (nuevo === comoTexto(campo.valor)) continue;
      cambios[campo.nombre] =
        campo.nombre === 'departamentoId' && nuevo === '' ? null : nuevo;
    }
    return cambios;
  }

  /** Opciones del selector de departamento, con la baja del propio empleado. */
  private opcionesDepartamento(actual: string | null): { valor: string; texto: string }[] {
    const opciones = [{ valor: '', texto: 'Sin asignar' }];
    for (const departamento of this.departamentos) {
      // Un departamento dado de baja no admite incorporaciones nuevas, pero si
      // es el que ya tiene el empleado debe seguir en la lista para no
      // moverlo de sitio sin querer al guardar.
      if (!departamento.activo && departamento.id !== actual) continue;
      opciones.push({ valor: departamento.id, texto: departamento.nombre });
    }
    return opciones;
  }

  // ---------------------------------------------------------------------------
  // Baja
  // ---------------------------------------------------------------------------

  private async darDeBaja(empleado: EmpleadoDTO): Promise<void> {
    const confirmado = await Modal.confirmar(
      'Dar de baja al empleado',
      `${empleado.nombreCompleto} (legajo ${empleado.legajo}) pasara a inactivo. Es una baja lógica: la ficha y las horas ya imputadas se conservan, pero además se cierran con fecha de hoy todas sus asignaciones a proyectos, queda vacante cualquier departamento que dirigiera y se desactiva su cuenta de acceso.`,
      true,
    );
    if (!confirmado) return;

    const resultado = await this.app.intentar(
      () => ClienteApi.borrar<{ eliminado: boolean }>(`/api/empleados/${empleado.id}`),
      `${empleado.nombreCompleto} quedo dado de baja.`,
    );
    if (resultado) await this.cargar();
  }
}
