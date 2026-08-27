/**
 * Modulo de departamentos.
 *
 * El organigrama es pequeno y cabe entero en una peticion, asi que el listado
 * llega con el conteo de empleados ya calculado y no hay que encadenar una
 * llamada por fila.
 *
 * La baja tiene una regla de negocio propia en el servidor: un departamento con
 * empleados activos no se elimina. El mensaje de ese 422 explica el motivo y a
 * quien hay que reasignar, de modo que aqui se muestra tal cual llega en vez de
 * sustituirlo por un generico "no se pudo eliminar".
 */

import type { DepartamentoDTO, EmpleadoDTO, Permiso } from '../../compartido/tipos.js';
import { ClienteApi, ErrorApi } from '../ClienteApi.js';
import { agregar, div, elemento, formatearNumero, vaciar } from '../dom.js';
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
  selector,
} from '../componentes/piezas.js';

interface RespuestaDepartamentos {
  departamentos: DepartamentoDTO[];
  conteoEmpleados: Record<string, number>;
}

/** Lo que devuelve `Formulario.valores()`. */
type Valores = Record<string, string | number | boolean | null>;

function comoTexto(valor: string | number | boolean | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(valor);
}

export class VistaDepartamentos extends Vista {
  private texto = '';
  private activo = '';
  private empleados: EmpleadoDTO[] = [];
  /** Trozo de DOM que se repinta al filtrar, sin rehacer la vista entera. */
  private zona: HTMLElement | null = null;

  override get ruta(): string {
    return 'departamentos';
  }

  override get titulo(): string {
    return 'Departamentos';
  }

  override get icono(): string {
    return 'D';
  }

  override get permisos(): Permiso[] {
    return ['departamento:leer'];
  }

  override async render(contenedor: HTMLElement): Promise<void> {
    contenedor.classList.add('pila');
    this.empleados = await this.cargarEmpleados();

    const zona = div('pila');
    this.zona = zona;

    agregar(contenedor, this.cabecera(), div('tarjeta', this.barraFiltros(), zona));
    await this.cargar();
  }

  // ---------------------------------------------------------------------------
  // Armazon de la pantalla
  // ---------------------------------------------------------------------------

  private cabecera(): HTMLElement {
    const cabecera = div(
      'seccion-titulo',
      div(
        'pila',
        elemento('h2', { clase: 'titulo-pagina', texto: 'Organigrama' }),
        elemento('p', {
          clase: 'subtitulo',
          texto: 'Unidades organizativas, quien las dirige y cuanta gente activa tiene cada una.',
        }),
      ),
    );
    if (this.app.puede('departamento:crear')) {
      agregar(
        cabecera,
        botonera(boton('Nuevo departamento', () => this.abrirFormulario(null), 'primario')),
      );
    }
    return cabecera;
  }

  private barraFiltros(): HTMLElement {
    const opcionesEstado = [
      { valor: '', texto: 'Todos' },
      { valor: 'true', texto: 'Activos' },
      { valor: 'false', texto: 'Inactivos' },
    ];

    return filtros(
      campoFiltro(
        'Buscar',
        buscador('Nombre o descripcion', (texto) => {
          this.texto = texto;
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
   * Plantilla completa: hace falta para resolver el nombre del gerente y para
   * poblar el selector. Si el rol no puede leer empleados, la columna cae a un
   * guion y el selector se queda en "Vacante", pero la vista sigue en pie.
   */
  private async cargarEmpleados(): Promise<EmpleadoDTO[]> {
    if (!this.app.puede('empleado:leer')) return [];
    try {
      return await ClienteApi.get<EmpleadoDTO[]>('/api/empleados');
    } catch {
      return [];
    }
  }

  private async cargar(): Promise<void> {
    const zona = this.zona;
    if (!zona) return;

    vaciar(zona);
    agregar(zona, cargando());

    const consulta = ClienteApi.consulta({ texto: this.texto, activo: this.activo });
    const respuesta = await this.app.intentar(() =>
      ClienteApi.get<RespuestaDepartamentos>(`/api/departamentos${consulta}`),
    );

    vaciar(zona);
    if (!respuesta) {
      agregar(zona, estadoVacio('No se pudo cargar el organigrama.'));
      return;
    }
    agregar(zona, this.tabla(respuesta.conteoEmpleados).render(respuesta.departamentos));
  }

  private tabla(conteo: Record<string, number>): Tabla<DepartamentoDTO> {
    const columnas: ColumnaTabla<DepartamentoDTO>[] = [
      { titulo: 'Nombre', celda: (d) => d.nombre },
      { titulo: 'Descripcion', celda: (d) => (d.descripcion === '' ? '-' : d.descripcion) },
      { titulo: 'Gerente', celda: (d) => this.nombreGerente(d.gerenteId) },
      {
        titulo: 'Empleados',
        clase: 'celda-numero',
        // Indexar un Record devuelve `number | undefined`; el servidor siembra
        // en cero los departamentos vacios, pero no se depende de ello.
        celda: (d) => formatearNumero(conteo[d.id] ?? 0, 0),
      },
      { titulo: 'Estado', celda: (d) => this.insigniaEstado(d.activo) },
      { titulo: 'Acciones', clase: 'celda-acciones', celda: (d) => this.acciones(d) },
    ];
    return new Tabla<DepartamentoDTO>(columnas, {
      vacio: 'Ningun departamento coincide con los filtros aplicados.',
    });
  }

  private acciones(departamento: DepartamentoDTO): HTMLElement {
    const botones: HTMLElement[] = [];
    if (this.app.puede('departamento:editar')) {
      botones.push(boton('Editar', () => this.abrirFormulario(departamento), 'secundario'));
    }
    if (this.app.puede('departamento:eliminar') && departamento.activo) {
      botones.push(boton('Eliminar', () => void this.eliminar(departamento), 'peligro'));
    }
    if (botones.length === 0) {
      return elemento('span', { clase: 'texto-tenue', texto: '-' });
    }
    return botonera(...botones);
  }

  /** El alta y la baja no son enumeracion del dominio: se rotulan aqui. */
  private insigniaEstado(activo: boolean): HTMLElement {
    return elemento('span', {
      clase: activo ? 'insignia insignia-exito' : 'insignia insignia-neutro',
      texto: activo ? 'Activo' : 'Inactivo',
    });
  }

  private nombreGerente(gerenteId: string | null): string {
    if (gerenteId === null || gerenteId === '') return 'Vacante';
    // `.find` puede no encontrar nada, y sin permiso de lectura de empleados la
    // lista esta vacia: en ambos casos se muestra un guion, no "Vacante", que
    // significaria justo lo contrario de lo que pasa.
    return this.empleados.find((empleado) => empleado.id === gerenteId)?.nombreCompleto ?? '-';
  }

  // ---------------------------------------------------------------------------
  // Alta y edicion
  // ---------------------------------------------------------------------------

  private abrirFormulario(departamento: DepartamentoDTO | null): void {
    const campos = this.campos(departamento);
    const formulario = new Formulario(campos);

    Modal.abrir({
      titulo: departamento === null ? 'Nuevo departamento' : `Editar ${departamento.nombre}`,
      contenido: formulario.render(),
      textoAceptar: departamento === null ? 'Crear' : 'Guardar cambios',
      alAceptar: async () => {
        formulario.limpiarErrores();
        const valores = formulario.valores();

        try {
          if (departamento === null) {
            await ClienteApi.post<DepartamentoDTO>('/api/departamentos', this.cuerpo(valores));
          } else {
            const cambios = this.cambios(campos, valores);
            if (Object.keys(cambios).length === 0) {
              this.app.notificarAviso('No hay cambios que guardar.');
              return false;
            }
            await ClienteApi.patch<DepartamentoDTO>(
              `/api/departamentos/${departamento.id}`,
              cambios,
            );
          }
        } catch (error) {
          // Errores por campo bajo su input, mensaje general en la
          // notificacion, y el dialogo abierto con lo que ya estaba escrito.
          formulario.mostrarErrores(error);
          this.app.notificarError(
            error instanceof ErrorApi ? error.message : 'No se pudo guardar el departamento.',
          );
          return false;
        }

        this.app.notificarExito(
          departamento === null ? 'Departamento creado.' : 'Departamento actualizado.',
        );
        await this.cargar();
        return true;
      },
    });
    formulario.enfocar();
  }

  private campos(departamento: DepartamentoDTO | null): CampoFormulario[] {
    return [
      {
        nombre: 'nombre',
        etiqueta: 'Nombre',
        tipo: 'texto',
        requerido: true,
        valor: departamento?.nombre ?? '',
      },
      {
        nombre: 'descripcion',
        etiqueta: 'Descripcion',
        tipo: 'area',
        valor: departamento?.descripcion ?? '',
        ayuda: 'Que hace la unidad. Se muestra en el listado y en los informes.',
      },
      {
        nombre: 'gerenteId',
        etiqueta: 'Gerente',
        tipo: 'seleccion',
        valor: departamento?.gerenteId ?? '',
        opciones: this.opcionesGerente(departamento?.gerenteId ?? null),
        ayuda: 'Un departamento puede quedar sin gerente mientras se cubre el puesto.',
      },
    ];
  }

  /**
   * Solo se ofrece gente activa: designar gerente a alguien dado de baja
   * dejaria una jefatura que no existe. Se conserva el gerente actual aunque no
   * aparezca en la lista para no perderlo al guardar otro campo.
   */
  private opcionesGerente(actual: string | null): { valor: string; texto: string }[] {
    const opciones = [{ valor: '', texto: 'Vacante' }];
    for (const empleado of this.empleados) {
      if (!empleado.activo && empleado.id !== actual) continue;
      opciones.push({ valor: empleado.id, texto: empleado.nombreCompleto });
    }
    return opciones;
  }

  private cuerpo(valores: Valores): Record<string, unknown> {
    const gerenteId = comoTexto(valores['gerenteId']);
    return {
      nombre: comoTexto(valores['nombre']),
      descripcion: comoTexto(valores['descripcion']),
      // "Vacante" viaja como nulo: el esquema admite nulo, pero no una cadena
      // vacia como identificador.
      gerenteId: gerenteId === '' ? null : gerenteId,
    };
  }

  /** Solo lo que cambio respecto del valor con el que se pinto el formulario. */
  private cambios(campos: CampoFormulario[], valores: Valores): Record<string, unknown> {
    const cambios: Record<string, unknown> = {};
    for (const campo of campos) {
      const nuevo = comoTexto(valores[campo.nombre]);
      if (nuevo === comoTexto(campo.valor)) continue;
      cambios[campo.nombre] = campo.nombre === 'gerenteId' && nuevo === '' ? null : nuevo;
    }
    return cambios;
  }

  // ---------------------------------------------------------------------------
  // Baja
  // ---------------------------------------------------------------------------

  private async eliminar(departamento: DepartamentoDTO): Promise<void> {
    const confirmado = await Modal.confirmar(
      'Eliminar departamento',
      `El departamento "${departamento.nombre}" quedara inactivo. Es una baja logica: los proyectos y las horas de periodos ya cerrados siguen apuntando a el y deben poder resolverlo. Si todavia tiene empleados activos asignados, el servidor rechazara la baja.`,
      true,
    );
    if (!confirmado) return;

    // `intentar` muestra el mensaje del servidor tal cual. Es justo lo que hace
    // falta cuando el rechazo es el 422 por empleados activos: ese texto dice
    // cuantos son y que hay que reasignarlos antes de volver a intentarlo.
    const resultado = await this.app.intentar(
      () => ClienteApi.borrar<{ eliminado: boolean }>(`/api/departamentos/${departamento.id}`),
      `El departamento "${departamento.nombre}" quedo dado de baja.`,
    );
    if (resultado) await this.cargar();
  }
}
