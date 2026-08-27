/**
 * Participacion de las personas en los proyectos.
 *
 * Una asignacion nunca se borra: se cierra con fecha. Las horas ya imputadas
 * bajo ella necesitan seguir teniendo un vinculo que las explique, asi que la
 * pantalla habla de "desasignar" y no de "eliminar", y muestra las cerradas
 * junto a las vigentes en lugar de esconderlas.
 */

import type {
  AsignacionDTO,
  EmpleadoDTO,
  EstadoProyecto,
  Permiso,
  ProyectoDTO,
} from '../../compartido/tipos.js';
import { ROLES_PROYECTO } from '../../compartido/tipos.js';
import { ClienteApi, ErrorApi } from '../ClienteApi.js';
import { Vista } from '../Vista.js';
import type { CampoFormulario } from '../componentes/Formulario.js';
import { Formulario } from '../componentes/Formulario.js';
import { Modal } from '../componentes/Modal.js';
import type { ColumnaTabla } from '../componentes/Tabla.js';
import { Tabla } from '../componentes/Tabla.js';
import {
  boton,
  botonera,
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

/** Estados en los que un proyecto todavia admite incorporar gente. */
const ESTADOS_ABIERTOS: readonly EstadoProyecto[] = ['PLANIFICADO', 'EN_CURSO', 'PAUSADO'];

/** Dedicacion que se propone al asignar: la jornada completa. */
const DEDICACION_POR_DEFECTO = 100;

type Vigencia = 'activas' | 'cerradas' | 'todas';

export class VistaAsignaciones extends Vista {
  override get ruta(): string {
    return 'asignaciones';
  }

  override get titulo(): string {
    return 'Asignaciones';
  }

  override get icono(): string {
    return 'A';
  }

  override get permisos(): Permiso[] {
    return ['asignacion:leer'];
  }

  private proyectoId = '';
  private empleadoId = '';
  private vigencia: Vigencia = 'activas';
  private empleados: EmpleadoDTO[] = [];
  private proyectos: ProyectoDTO[] = [];
  private lista: HTMLElement | null = null;

  override async render(contenedor: HTMLElement): Promise<void> {
    // Los dos catalogos se piden en paralelo: son independientes y encadenarlos
    // solo sumaria la latencia de uno a la del otro.
    [this.empleados, this.proyectos] = await Promise.all([
      this.cargarEmpleados(),
      this.cargarProyectos(),
    ]);

    const cabecera = div(
      'vista-cabecera',
      div(
        'pila',
        elemento('h2', { clase: 'vista-titulo', texto: 'Asignaciones' }),
        elemento('p', {
          clase: 'texto-menor texto-tenue',
          texto:
            'Quien participa en que proyecto, con que rol y con cuanta dedicacion. Las participaciones cerradas se conservan como historial.',
        }),
      ),
    );
    if (this.app.puede('asignacion:gestionar')) {
      agregar(cabecera, botonera(boton('Asignar', () => this.abrirAlta(), 'primario')));
    }

    const barra = filtros(
      campoFiltro(
        'Proyecto',
        selector(
          [{ valor: '', texto: 'Todos los proyectos' }, ...this.opcionesProyecto(this.proyectos)],
          this.proyectoId,
          (valor) => {
            this.proyectoId = valor;
            void this.refrescar();
          },
        ),
      ),
      campoFiltro(
        'Empleado',
        selector(
          [{ valor: '', texto: 'Todos los empleados' }, ...this.opcionesEmpleado(this.empleados)],
          this.empleadoId,
          (valor) => {
            this.empleadoId = valor;
            void this.refrescar();
          },
        ),
      ),
      campoFiltro(
        'Vigencia',
        selector(
          [
            { valor: 'activas', texto: 'Solo vigentes' },
            { valor: 'cerradas', texto: 'Solo cerradas' },
            { valor: 'todas', texto: 'Todas' },
          ],
          this.vigencia,
          (valor) => {
            this.vigencia = VistaAsignaciones.comoVigencia(valor);
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
      proyectoId: this.proyectoId,
      empleadoId: this.empleadoId,
      activa: this.vigencia === 'todas' ? '' : String(this.vigencia === 'activas'),
    });
    const asignaciones = await this.app.intentar(() =>
      ClienteApi.get<AsignacionDTO[]>(`/api/asignaciones${consulta}`),
    );

    vaciar(destino);
    if (!asignaciones) {
      agregar(destino, estadoVacio('No se pudieron cargar las asignaciones.'));
      return;
    }
    agregar(destino, this.tabla().render(asignaciones));
  }

  private tabla(): Tabla<AsignacionDTO> {
    const columnas: ColumnaTabla<AsignacionDTO>[] = [
      { titulo: 'Empleado', celda: (a) => this.nombreEmpleado(a.empleadoId) },
      { titulo: 'Proyecto', celda: (a) => this.nombreProyecto(a.proyectoId) },
      { titulo: 'Rol', celda: (a) => insignia(a.rolProyecto) },
      {
        titulo: 'Dedicacion',
        clase: 'celda-numero',
        celda: (a) => `${formatearNumero(a.porcentajeDedicacion, 0)} %`,
      },
      { titulo: 'Desde', celda: (a) => formatearFecha(a.fechaAsignacion) },
      // Una participacion vigente no tiene fecha de cierre todavia.
      { titulo: 'Hasta', celda: (a) => (a.activa ? '-' : formatearFecha(a.fechaDesasignacion)) },
      { titulo: 'Estado', celda: (a) => VistaAsignaciones.marcaVigencia(a) },
      { titulo: 'Acciones', clase: 'celda-acciones', celda: (a) => this.acciones(a) },
    ];
    return new Tabla(columnas, {
      vacio: 'No hay asignaciones que coincidan con los filtros aplicados.',
    });
  }

  private static marcaVigencia(asignacion: AsignacionDTO): Node {
    return elemento('span', {
      clase: asignacion.activa ? 'insignia insignia-exito' : 'insignia insignia-neutro',
      texto: asignacion.activa ? 'Vigente' : 'Cerrada',
    });
  }

  private acciones(asignacion: AsignacionDTO): Node {
    // Una asignacion cerrada no se toca: reescribirla falsearia las horas que
    // se imputaron bajo ella. El servidor lo rechaza, y aqui ni se ofrece.
    if (!this.app.puede('asignacion:gestionar') || !asignacion.activa) {
      return elemento('span', { clase: 'texto-tenue', texto: '-' });
    }
    return botonera(
      boton('Editar', () => this.abrirEdicion(asignacion), 'fantasma'),
      boton('Desasignar', () => void this.confirmarDesasignacion(asignacion), 'peligro'),
    );
  }

  // ---------------------------------------------------------------------------
  // Alta
  // ---------------------------------------------------------------------------

  private abrirAlta(): void {
    const activos = this.empleados.filter((empleado) => empleado.activo);
    const abiertos = this.proyectos.filter((proyecto) =>
      ESTADOS_ABIERTOS.includes(proyecto.estado),
    );

    if (activos.length === 0 || abiertos.length === 0) {
      this.app.notificarAviso(
        'Hacen falta al menos un empleado activo y un proyecto abierto para poder asignar.',
      );
      return;
    }

    const campos: CampoFormulario[] = [
      {
        nombre: 'empleadoId',
        etiqueta: 'Empleado',
        tipo: 'seleccion',
        requerido: true,
        opciones: this.opcionesEmpleado(activos),
        ayuda: 'Solo se listan los empleados activos.',
      },
      {
        nombre: 'proyectoId',
        etiqueta: 'Proyecto',
        tipo: 'seleccion',
        requerido: true,
        opciones: this.opcionesProyecto(abiertos),
        ayuda: 'Solo se listan los proyectos planificados, en curso o pausados.',
      },
      {
        nombre: 'rolProyecto',
        etiqueta: 'Rol en el proyecto',
        tipo: 'seleccion',
        requerido: true,
        valor: 'DESARROLLADOR',
        opciones: ROLES_PROYECTO.map((valor) => ({ valor, texto: etiqueta(valor) })),
      },
      {
        nombre: 'porcentajeDedicacion',
        etiqueta: 'Dedicacion (%)',
        tipo: 'numero',
        valor: DEDICACION_POR_DEFECTO,
        ayuda: 'Parte de la jornada que ocupa este proyecto. La suma de las vigentes no puede pasar del 100 %.',
      },
      {
        nombre: 'fechaAsignacion',
        etiqueta: 'Desde',
        tipo: 'fecha',
        requerido: true,
        valor: hoy(),
      },
    ];

    const formulario = new Formulario(campos);
    Modal.abrir({
      titulo: 'Asignar a un proyecto',
      contenido: formulario.render(),
      textoAceptar: 'Asignar',
      alAceptar: () => this.crear(formulario),
    });
    formulario.enfocar();
  }

  private async crear(formulario: Formulario): Promise<boolean> {
    const valores = formulario.valores();
    formulario.limpiarErrores();
    try {
      await ClienteApi.post<AsignacionDTO>('/api/asignaciones', {
        empleadoId: valores['empleadoId'],
        proyectoId: valores['proyectoId'],
        rolProyecto: valores['rolProyecto'],
        porcentajeDedicacion: valores['porcentajeDedicacion'] ?? DEDICACION_POR_DEFECTO,
        fechaAsignacion: valores['fechaAsignacion'],
      });
      this.app.notificarExito('Asignacion creada.');
      await this.refrescar();
      return true;
    } catch (e) {
      formulario.mostrarErrores(e);
      // Cuando la suma de dedicaciones pasa del 100 %, el 422 ya explica cuanto
      // queda disponible y en cuantos proyectos esta comprometido el resto. Ese
      // texto es mas util que cualquier resumen que se pudiera escribir aqui.
      this.app.notificarError(
        e instanceof ErrorApi ? e.message : 'No se pudo crear la asignacion.',
      );
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Edicion
  // ---------------------------------------------------------------------------

  private abrirEdicion(asignacion: AsignacionDTO): void {
    const campos: CampoFormulario[] = [
      {
        nombre: 'empleado',
        etiqueta: 'Empleado',
        tipo: 'texto',
        valor: this.nombreEmpleado(asignacion.empleadoId),
        soloLectura: true,
      },
      {
        nombre: 'proyecto',
        etiqueta: 'Proyecto',
        tipo: 'texto',
        valor: this.nombreProyecto(asignacion.proyectoId),
        soloLectura: true,
      },
      {
        nombre: 'rolProyecto',
        etiqueta: 'Rol en el proyecto',
        tipo: 'seleccion',
        requerido: true,
        valor: asignacion.rolProyecto,
        opciones: ROLES_PROYECTO.map((valor) => ({ valor, texto: etiqueta(valor) })),
      },
      {
        nombre: 'porcentajeDedicacion',
        etiqueta: 'Dedicacion (%)',
        tipo: 'numero',
        valor: asignacion.porcentajeDedicacion,
        ayuda: 'Al recalcular la disponibilidad no se cuenta la dedicacion actual de esta misma asignacion.',
      },
    ];

    const formulario = new Formulario(campos);
    Modal.abrir({
      titulo: 'Editar asignacion',
      contenido: formulario.render(),
      textoAceptar: 'Guardar cambios',
      alAceptar: () => this.actualizar(asignacion, formulario),
    });
    formulario.enfocar();
  }

  private async actualizar(asignacion: AsignacionDTO, formulario: Formulario): Promise<boolean> {
    const valores = formulario.valores();
    formulario.limpiarErrores();
    try {
      await ClienteApi.patch<AsignacionDTO>(`/api/asignaciones/${asignacion.id}`, {
        rolProyecto: valores['rolProyecto'],
        porcentajeDedicacion: valores['porcentajeDedicacion'] ?? asignacion.porcentajeDedicacion,
      });
      this.app.notificarExito('Asignacion actualizada.');
      await this.refrescar();
      return true;
    } catch (e) {
      formulario.mostrarErrores(e);
      this.app.notificarError(
        e instanceof ErrorApi ? e.message : 'No se pudo actualizar la asignacion.',
      );
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Cierre
  // ---------------------------------------------------------------------------

  private async confirmarDesasignacion(asignacion: AsignacionDTO): Promise<void> {
    const confirmado = await Modal.confirmar(
      'Desasignar',
      `Se cerrara con fecha ${formatearFecha(hoy())} la participacion de ` +
        `${this.nombreEmpleado(asignacion.empleadoId)} en ${this.nombreProyecto(asignacion.proyectoId)}. ` +
        'La asignacion no se borra: queda como historial de las horas ya imputadas.',
      true,
    );
    if (!confirmado) return;

    const consulta = ClienteApi.consulta({ fecha: hoy() });
    const hecho = await this.app.intentar(
      () => ClienteApi.borrar<AsignacionDTO>(`/api/asignaciones/${asignacion.id}${consulta}`),
      'Participacion cerrada.',
    );
    if (hecho) await this.refrescar();
  }

  // ---------------------------------------------------------------------------
  // Catalogos
  // ---------------------------------------------------------------------------

  private async cargarEmpleados(): Promise<EmpleadoDTO[]> {
    try {
      return await ClienteApi.get<EmpleadoDTO[]>('/api/empleados');
    } catch {
      return [];
    }
  }

  private async cargarProyectos(): Promise<ProyectoDTO[]> {
    try {
      const datos = await ClienteApi.get<RespuestaProyectos>('/api/proyectos');
      return datos.proyectos;
    } catch {
      return [];
    }
  }

  private opcionesEmpleado(empleados: EmpleadoDTO[]): { valor: string; texto: string }[] {
    return empleados.map((empleado) => ({
      valor: empleado.id,
      texto: `${empleado.legajo} - ${empleado.nombreCompleto}`,
    }));
  }

  private opcionesProyecto(proyectos: ProyectoDTO[]): { valor: string; texto: string }[] {
    return proyectos.map((proyecto) => ({
      valor: proyecto.id,
      texto: `${proyecto.codigo} - ${proyecto.nombre}`,
    }));
  }

  private nombreEmpleado(id: string): string {
    return this.empleados.find((empleado) => empleado.id === id)?.nombreCompleto ?? id;
  }

  private nombreProyecto(id: string): string {
    const proyecto = this.proyectos.find((candidato) => candidato.id === id);
    return proyecto ? `${proyecto.codigo} - ${proyecto.nombre}` : id;
  }

  private static comoVigencia(valor: string): Vigencia {
    return valor === 'cerradas' || valor === 'todas' ? valor : 'activas';
  }
}
