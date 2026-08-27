/**
 * Cartera de proyectos.
 *
 * La pantalla no calcula nada del ciclo de vida: el servidor es quien decide si
 * una transición de estado es legal y si un borrado debe convertirse en una
 * cancelación. Aquí solo se ofrecen las acciones y se muestra, palabra por
 * palabra, la explicación que devuelve la API cuando dice que no. Duplicar esas
 * reglas en el cliente solo conseguiría que las dos versiones se separaran.
 */

import type {
  DepartamentoDTO,
  EstadoProyecto,
  Permiso,
  ProyectoDTO,
} from '../../compartido/tipos.js';
import { ESTADOS_PROYECTO } from '../../compartido/tipos.js';
import { ClienteApi, ErrorApi } from '../ClienteApi.js';
import { Vista } from '../Vista.js';
import type { CampoFormulario } from '../componentes/Formulario.js';
import { Formulario } from '../componentes/Formulario.js';
import { Modal } from '../componentes/Modal.js';
import type { ColumnaTabla } from '../componentes/Tabla.js';
import { Tabla } from '../componentes/Tabla.js';
import {
  barraProgreso,
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
import {
  agregar,
  div,
  elemento,
  etiqueta,
  formatearFecha,
  formatearNumero,
  hoy,
  vaciar,
} from '../dom.js';

/** Forma de la respuesta de `GET /api/proyectos`. */
interface RespuestaProyectos {
  proyectos: ProyectoDTO[];
  horasPorProyecto: Record<string, number>;
}

/** Forma de la respuesta de `GET /api/departamentos`. */
interface RespuestaDepartamentos {
  departamentos: DepartamentoDTO[];
  conteoEmpleados: Record<string, number>;
}

export class VistaProyectos extends Vista {
  override get ruta(): string {
    return 'proyectos';
  }

  override get titulo(): string {
    return 'Proyectos';
  }

  override get icono(): string {
    return 'P';
  }

  override get permisos(): Permiso[] {
    return ['proyecto:leer'];
  }

  private texto = '';
  private estado = '';
  private departamentoId = '';
  private departamentos: DepartamentoDTO[] = [];
  /** Zona que se repinta al cambiar un filtro, sin rehacer la cabecera. */
  private lista: HTMLElement | null = null;

  override async render(contenedor: HTMLElement): Promise<void> {
    this.departamentos = await this.cargarDepartamentos();

    const cabecera = div(
      'vista-cabecera',
      div(
        'pila',
        elemento('h2', { clase: 'vista-titulo', texto: 'Proyectos' }),
        elemento('p', {
          clase: 'texto-menor texto-tenue',
          texto:
            'Cartera completa con el consumo de horas frente al presupuesto aprobado de cada proyecto.',
        }),
      ),
    );
    if (this.app.puede('proyecto:crear')) {
      agregar(
        cabecera,
        botonera(boton('Nuevo proyecto', () => this.abrirFormulario(null), 'primario')),
      );
    }

    const barra = filtros(
      campoFiltro(
        'Buscar',
        buscador('Código o nombre', (valor) => {
          this.texto = valor;
          void this.refrescar();
        }),
      ),
      campoFiltro(
        'Estado',
        selector(
          [
            { valor: '', texto: 'Todos los estados' },
            ...ESTADOS_PROYECTO.map((valor) => ({ valor, texto: etiqueta(valor) })),
          ],
          this.estado,
          (valor) => {
            this.estado = valor;
            void this.refrescar();
          },
        ),
      ),
      campoFiltro(
        'Departamento',
        selector(
          [{ valor: '', texto: 'Todos los departamentos' }, ...this.opcionesDepartamento()],
          this.departamentoId,
          (valor) => {
            this.departamentoId = valor;
            void this.refrescar();
          },
        ),
      ),
    );

    this.lista = div('pila');
    agregar(contenedor, cabecera, barra, this.lista);
    await this.refrescar();
  }

  // ---------------------------------------------------------------------------
  // Listado
  // ---------------------------------------------------------------------------

  private async refrescar(): Promise<void> {
    const destino = this.lista;
    if (!destino) return;

    vaciar(destino);
    agregar(destino, cargando());

    const consulta = ClienteApi.consulta({
      texto: this.texto,
      estado: this.estado,
      departamentoId: this.departamentoId,
    });
    const datos = await this.app.intentar(() =>
      ClienteApi.get<RespuestaProyectos>(`/api/proyectos${consulta}`),
    );

    vaciar(destino);
    if (!datos) {
      agregar(destino, estadoVacio('No se pudo cargar la cartera de proyectos.'));
      return;
    }
    agregar(destino, this.tabla(datos.horasPorProyecto).render(datos.proyectos));
  }

  private tabla(horasPorProyecto: Record<string, number>): Tabla<ProyectoDTO> {
    const columnas: ColumnaTabla<ProyectoDTO>[] = [
      { titulo: 'Código', clase: 'texto-mono', celda: (p) => p.codigo },
      { titulo: 'Nombre', celda: (p) => p.nombre },
      { titulo: 'Estado', celda: (p) => insignia(p.estado) },
      { titulo: 'Departamento', celda: (p) => this.nombreDepartamento(p.departamentoId) },
      { titulo: 'Inicio', celda: (p) => formatearFecha(p.fechaInicio) },
      { titulo: 'Fin estimado', celda: (p) => formatearFecha(p.fechaFinEstimada) },
      {
        titulo: 'Presup. (h)',
        clase: 'celda-numero',
        celda: (p) => formatearNumero(p.presupuestoHoras, 0),
      },
      {
        titulo: 'Imputadas',
        clase: 'celda-numero',
        // El indexado de un Record puede no traer clave: sin el `?? 0` la celda
        // mostraría "undefined" en cuanto un proyecto no tenga horas cargadas.
        celda: (p) => formatearNumero(horasPorProyecto[p.id] ?? 0, 1),
      },
      { titulo: 'Consumo', celda: (p) => this.celdaConsumo(p, horasPorProyecto[p.id] ?? 0) },
      { titulo: 'Acciones', clase: 'celda-acciones', celda: (p) => this.acciones(p) },
    ];
    return new Tabla(columnas, {
      vacio: 'Ningún proyecto coincide con los filtros aplicados.',
    });
  }

  private celdaConsumo(proyecto: ProyectoDTO, imputadas: number): Node {
    if (proyecto.presupuestoHoras <= 0) {
      return elemento('span', { clase: 'texto-menor texto-tenue', texto: 'Sin presupuesto' });
    }
    const porcentaje = (imputadas / proyecto.presupuestoHoras) * 100;
    const barra = barraProgreso(porcentaje);
    barra.title =
      `${formatearNumero(porcentaje, 0)} % del presupuesto ` +
      `(${formatearNumero(imputadas, 1)} de ${formatearNumero(proyecto.presupuestoHoras, 0)} h)`;
    return barra;
  }

  private acciones(proyecto: ProyectoDTO): Node {
    const botones: HTMLElement[] = [];
    if (this.app.puede('proyecto:editar')) {
      botones.push(boton('Editar', () => this.abrirFormulario(proyecto), 'fantasma'));
      // Ver el comentario de VistaEmpleados: la fila tiene diez columnas y las
      // etiquetas largas expulsaban las acciones del ancho visible.
      botones.push(boton('Estado', () => this.abrirCambioEstado(proyecto), 'secundario'));
    }
    if (this.app.puede('proyecto:eliminar')) {
      botones.push(boton('Eliminar', () => void this.confirmarEliminacion(proyecto), 'peligro'));
    }
    if (botones.length === 0) {
      return elemento('span', { clase: 'texto-tenue', texto: '-' });
    }
    return botonera(...botones);
  }

  // ---------------------------------------------------------------------------
  // Alta y edición
  // ---------------------------------------------------------------------------

  private abrirFormulario(proyecto: ProyectoDTO | null): void {
    const campos: CampoFormulario[] = [
      {
        nombre: 'nombre',
        etiqueta: 'Nombre',
        tipo: 'texto',
        requerido: true,
        valor: proyecto?.nombre ?? '',
      },
      {
        nombre: 'descripcion',
        etiqueta: 'Descripción',
        tipo: 'area',
        valor: proyecto?.descripcion ?? '',
        ayuda: 'Objetivo y alcance acordados. Se ve en los informes de proyecto.',
      },
      {
        nombre: 'fechaInicio',
        etiqueta: 'Fecha de inicio',
        tipo: 'fecha',
        requerido: true,
        valor: proyecto?.fechaInicio ?? hoy(),
      },
      {
        nombre: 'fechaFinEstimada',
        etiqueta: 'Fin estimado',
        tipo: 'fecha',
        valor: proyecto?.fechaFinEstimada ?? '',
        ayuda: 'Opcional. Déjelo vacío si todavía no hay una fecha comprometida.',
      },
      {
        nombre: 'departamentoId',
        etiqueta: 'Departamento responsable',
        tipo: 'seleccion',
        valor: proyecto?.departamentoId ?? '',
        opciones: [{ valor: '', texto: 'Sin asignar' }, ...this.opcionesDepartamento()],
      },
      {
        nombre: 'presupuestoHoras',
        etiqueta: 'Presupuesto (horas)',
        tipo: 'numero',
        valor: proyecto?.presupuestoHoras ?? 0,
        ayuda: 'Horas aprobadas. Es la referencia con la que se calcula el consumo.',
      },
    ];

    const formulario = new Formulario(campos);
    Modal.abrir({
      titulo: proyecto ? `Editar ${proyecto.codigo}` : 'Nuevo proyecto',
      contenido: formulario.render(),
      textoAceptar: proyecto ? 'Guardar cambios' : 'Crear proyecto',
      alAceptar: () => this.guardar(proyecto, formulario),
    });
    formulario.enfocar();
  }

  private async guardar(proyecto: ProyectoDTO | null, formulario: Formulario): Promise<boolean> {
    const valores = formulario.valores();
    // Un desplegable vacío significa "sin departamento", no la cadena vacía: el
    // esquema del servidor admite null pero rechaza un identificador vacío.
    const cuerpo = {
      nombre: valores['nombre'],
      descripcion: valores['descripcion'],
      fechaInicio: valores['fechaInicio'],
      fechaFinEstimada: valores['fechaFinEstimada'] === '' ? null : valores['fechaFinEstimada'],
      departamentoId: valores['departamentoId'] === '' ? null : valores['departamentoId'],
      presupuestoHoras: valores['presupuestoHoras'] ?? 0,
    };

    formulario.limpiarErrores();
    try {
      if (proyecto) {
        await ClienteApi.patch<ProyectoDTO>(`/api/proyectos/${proyecto.id}`, cuerpo);
        this.app.notificarExito('Proyecto actualizado.');
      } else {
        await ClienteApi.post<ProyectoDTO>('/api/proyectos', cuerpo);
        this.app.notificarExito('Proyecto creado.');
      }
      await this.refrescar();
      return true;
    } catch (e) {
      formulario.mostrarErrores(e);
      this.app.notificarError(
        e instanceof ErrorApi ? e.message : 'No se pudo guardar el proyecto.',
      );
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Cambio de estado
  // ---------------------------------------------------------------------------

  private abrirCambioEstado(proyecto: ProyectoDTO): void {
    let elegido: EstadoProyecto = proyecto.estado;
    const control = selector(
      ESTADOS_PROYECTO.map((valor) => ({ valor, texto: etiqueta(valor) })),
      proyecto.estado,
      (valor) => {
        // `find` puede no encontrar nada: se comprueba antes de asignar en vez
        // de forzar el tipo con una aserción que el compilador no puede avalar.
        const encontrado = ESTADOS_PROYECTO.find((estado) => estado === valor);
        if (encontrado) elegido = encontrado;
      },
    );

    Modal.abrir({
      titulo: `Cambiar estado de ${proyecto.codigo}`,
      contenido: div(
        'pila',
        elemento('p', {
          texto: `Ahora mismo el proyecto está ${etiqueta(proyecto.estado)}.`,
        }),
        campoFiltro('Nuevo estado', control),
        elemento('p', {
          clase: 'texto-menor texto-tenue',
          texto:
            'El servidor solo acepta las transiciones válidas del ciclo de vida. Si la que elige no lo es, le dirá exactamente por qué.',
        }),
      ),
      textoAceptar: 'Cambiar estado',
      alAceptar: () => this.cambiarEstado(proyecto, elegido),
    });
  }

  private async cambiarEstado(proyecto: ProyectoDTO, estado: EstadoProyecto): Promise<boolean> {
    if (estado === proyecto.estado) {
      this.app.notificarAviso('El proyecto ya está en ese estado.');
      return false;
    }
    try {
      await ClienteApi.put<ProyectoDTO>(`/api/proyectos/${proyecto.id}/estado`, { estado });
      this.app.notificarExito(`${proyecto.codigo} paso a ${etiqueta(estado)}.`);
      await this.refrescar();
      return true;
    } catch (e) {
      // Una transición rechazada llega como 422 con el motivo redactado por el
      // dominio. Se muestra tal cual: reescribirlo aquí perdería el detalle.
      this.app.notificarError(
        e instanceof ErrorApi ? e.message : 'No se pudo cambiar el estado del proyecto.',
      );
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Baja
  // ---------------------------------------------------------------------------

  private async confirmarEliminacion(proyecto: ProyectoDTO): Promise<void> {
    const confirmado = await Modal.confirmar(
      `Eliminar ${proyecto.codigo}`,
      `Va a dar de baja "${proyecto.nombre}". Si el proyecto tiene horas cargadas o asignaciones, ` +
        'no se borra: pasa a Cancelado, porque borrarlo dejaría sin justificante las horas ya imputadas.',
      true,
    );
    if (!confirmado) return;

    const hecho = await this.app.intentar(
      () => ClienteApi.borrar<{ eliminado: boolean }>(`/api/proyectos/${proyecto.id}`),
      'Proyecto dado de baja.',
    );
    if (hecho) await this.refrescar();
  }

  // ---------------------------------------------------------------------------
  // Catálogo de departamentos
  // ---------------------------------------------------------------------------

  private async cargarDepartamentos(): Promise<DepartamentoDTO[]> {
    try {
      const datos = await ClienteApi.get<RespuestaDepartamentos>('/api/departamentos');
      return datos.departamentos;
    } catch {
      // Sin el catálogo la pantalla sigue siendo útil: solo se pierde el nombre
      // legible del departamento, no el listado de proyectos.
      return [];
    }
  }

  private opcionesDepartamento(): { valor: string; texto: string }[] {
    return this.departamentos.map((departamento) => ({
      valor: departamento.id,
      texto: departamento.nombre,
    }));
  }

  private nombreDepartamento(id: string | null): string {
    if (!id) return '-';
    return this.departamentos.find((departamento) => departamento.id === id)?.nombre ?? id;
  }
}
