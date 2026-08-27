/**
 * Registro y aprobación de horas.
 *
 * Es la pantalla con más reglas de negocio detrás y, precisamente por eso, la
 * que menos reglas repite: el circuito Borrador -> Enviado -> Aprobado o
 * Rechazado lo gobierna el servidor. Aquí solo se ofrecen las acciones que el
 * estado de cada parte admite, para que nadie pulse un botón que va a fallar.
 */

import type {
  AsignacionDTO,
  EmpleadoDTO,
  Permiso,
  ProyectoDTO,
  RegistroTiempoDTO,
} from '../../compartido/tipos.js';
import { ESTADOS_REGISTRO } from '../../compartido/tipos.js';
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
  tarjetaMetrica,
} from '../componentes/piezas.js';
import type { NombreIcono } from '../dom.js';
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

/** Longitud mínima de la descripción que exige el servidor. */
const MINIMO_DESCRIPCION = 10;

/** Longitud mínima del motivo de rechazo que exige el servidor. */
const MINIMO_MOTIVO = 5;

/** Primer día del mes en curso, en formato `AAAA-MM-DD`. */
function primerDiaDelMes(): string {
  return `${hoy().slice(0, 7)}-01`;
}

/** Último día del mes en curso. El día 0 del mes siguiente es el último de este. */
function ultimoDiaDelMes(): string {
  const ahora = new Date();
  const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  const mes = String(fin.getMonth() + 1).padStart(2, '0');
  const dia = String(fin.getDate()).padStart(2, '0');
  return `${fin.getFullYear()}-${mes}-${dia}`;
}

export class VistaHoras extends Vista {
  override get ruta(): string {
    return 'horas';
  }

  override get titulo(): string {
    return 'Registro de horas';
  }

  override get tituloCorto(): string {
    return 'Horas';
  }

  override get icono(): NombreIcono {
    return 'reloj';
  }

  override get permisos(): Permiso[] {
    return ['tiempo:leer_propio', 'tiempo:leer_todos'];
  }

  private desde = primerDiaDelMes();
  private hasta = ultimoDiaDelMes();
  private proyectoId = '';
  private estado = '';
  private empleadoId = '';
  private proyectos: ProyectoDTO[] = [];
  private empleados: EmpleadoDTO[] = [];
  private resumen: HTMLElement | null = null;
  private lista: HTMLElement | null = null;

  /** `true` si el usuario ve las horas de toda la organización y no solo las suyas. */
  private get verTodos(): boolean {
    return this.app.puede('tiempo:leer_todos');
  }

  override async render(contenedor: HTMLElement): Promise<void> {
    this.proyectos = await this.cargarProyectos();
    // La lista de personas solo hace falta cuando se ven horas ajenas: pedirla
    // en el caso contrario sería una llamada cuyo resultado no se pinta nunca.
    this.empleados = this.verTodos ? await this.cargarEmpleados() : [];

    const cabecera = div(
      'vista-cabecera',
      div(
        'pila',
        elemento('h2', { clase: 'vista-titulo', texto: 'Registro de horas' }),
        elemento('p', {
          clase: 'texto-menor texto-tenue',
          texto: this.verTodos
            ? 'Partes de horas de la organización, con su estado dentro del circuito de aprobación.'
            : 'Sus partes de horas y el estado en que se encuentra cada uno.',
        }),
      ),
    );
    if (this.app.puede('tiempo:registrar')) {
      agregar(cabecera, botonera(boton('Cargar horas', () => void this.abrirAlta(), 'primario')));
    }

    const controles: HTMLElement[] = [
      campoFiltro(
        'Desde',
        this.controlFecha(this.desde, (valor) => {
          this.desde = valor;
          void this.refrescar();
        }),
      ),
      campoFiltro(
        'Hasta',
        this.controlFecha(this.hasta, (valor) => {
          this.hasta = valor;
          void this.refrescar();
        }),
      ),
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
        'Estado',
        selector(
          [
            { valor: '', texto: 'Todos los estados' },
            ...ESTADOS_REGISTRO.map((valor) => ({ valor, texto: etiqueta(valor) })),
          ],
          this.estado,
          (valor) => {
            this.estado = valor;
            void this.refrescar();
          },
        ),
      ),
    ];
    if (this.verTodos) {
      controles.push(
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
      );
    }

    this.resumen = div('rejilla-metricas');
    this.lista = div('pila');
    agregar(contenedor, cabecera, filtros(...controles), this.resumen, this.lista);
    await this.refrescar();
  }

  private controlFecha(valor: string, alCambiar: (valor: string) => void): HTMLInputElement {
    return elemento('input', {
      tipo: 'date',
      valor,
      al: {
        change: (evento: Event) => {
          const destino = evento.currentTarget;
          if (destino instanceof HTMLInputElement) alCambiar(destino.value);
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Listado y resumen
  // ---------------------------------------------------------------------------

  private async refrescar(): Promise<void> {
    const resumen = this.resumen;
    const destino = this.lista;
    if (!resumen || !destino) return;

    vaciar(resumen);
    vaciar(destino);
    agregar(destino, cargando());

    const consulta = ClienteApi.consulta({
      empleadoId: this.verTodos ? this.empleadoId : '',
      proyectoId: this.proyectoId,
      desde: this.desde,
      hasta: this.hasta,
      estado: this.estado,
    });
    const registros = await this.app.intentar(() =>
      ClienteApi.get<RegistroTiempoDTO[]>(`/api/registros-tiempo${consulta}`),
    );

    vaciar(destino);
    if (!registros) {
      agregar(destino, estadoVacio('No se pudieron cargar los registros de horas.'));
      return;
    }

    this.pintarResumen(resumen, registros);
    agregar(destino, this.tabla().render(registros));
  }

  private pintarResumen(destino: HTMLElement, registros: RegistroTiempoDTO[]): void {
    const aprobados = registros.filter((registro) => registro.estado === 'APROBADO');
    const pendientes = registros.filter((registro) => registro.estado === 'ENVIADO');

    agregar(
      destino,
      tarjetaMetrica('Horas del periodo', `${formatearNumero(VistaHoras.sumar(registros), 2)} h`, {
        detalle: `${registros.length} registro(s)`,
        tono: 'azul',
        icono: 'reloj',
      }),
      tarjetaMetrica('Horas aprobadas', `${formatearNumero(VistaHoras.sumar(aprobados), 2)} h`, {
        detalle: `${aprobados.length} registro(s)`,
        tono: 'verde',
        icono: 'visto',
      }),
      tarjetaMetrica('Horas pendientes', `${formatearNumero(VistaHoras.sumar(pendientes), 2)} h`, {
        detalle: `${pendientes.length} registro(s) a la espera de aprobación`,
        tono: 'ambar',
        icono: 'arena',
      }),
    );
  }

  private static sumar(registros: RegistroTiempoDTO[]): number {
    return registros.reduce((total, registro) => total + registro.horas, 0);
  }

  private tabla(): Tabla<RegistroTiempoDTO> {
    const columnas: ColumnaTabla<RegistroTiempoDTO>[] = [
      { titulo: 'Fecha', celda: (r) => formatearFecha(r.fecha) },
    ];
    if (this.verTodos) {
      columnas.push({ titulo: 'Empleado', celda: (r) => this.nombreEmpleado(r.empleadoId) });
    }
    columnas.push(
      { titulo: 'Proyecto', celda: (r) => this.nombreProyecto(r.proyectoId) },
      {
        titulo: 'Horas',
        clase: 'celda-numero',
        celda: (r) => formatearNumero(r.horas, 2),
      },
      { titulo: 'Descripción', clase: 'celda-texto', celda: (r) => r.descripcion },
      { titulo: 'Estado', celda: (r) => VistaHoras.celdaEstado(r) },
      { titulo: 'Acciones', clase: 'celda-acciones', celda: (r) => this.acciones(r) },
    );
    return new Tabla(columnas, {
      vacio: 'No hay horas cargadas en el periodo y con los filtros elegidos.',
    });
  }

  private static celdaEstado(registro: RegistroTiempoDTO): Node {
    const marca = insignia(registro.estado);
    if (registro.estado !== 'RECHAZADO' || !registro.motivoRechazo) return marca;

    // El motivo va debajo del estado y también como titulo: quien lo lee tiene
    // que saber que corregir sin abrir nada, y el texto puede quedar recortado.
    marca.title = `Motivo del rechazo: ${registro.motivoRechazo}`;
    return div(
      'pila',
      marca,
      elemento('span', {
        clase: 'texto-menor texto-tenue',
        texto: registro.motivoRechazo,
        titulo: registro.motivoRechazo,
      }),
    );
  }

  private acciones(registro: RegistroTiempoDTO): Node {
    const botones: HTMLElement[] = [];
    const puedeAprobar = this.app.puede('tiempo:aprobar');
    // Cargar y corregir horas es potestad de quien las trabajo; quien ve las de
    // todos puede además corregir un parte ajeno que todavía no salió a revisar.
    const puedeGestionar =
      this.app.puede('tiempo:registrar') &&
      (registro.empleadoId === this.empleadoPropio() || this.verTodos);

    if ((registro.estado === 'BORRADOR' || registro.estado === 'RECHAZADO') && puedeGestionar) {
      botones.push(boton('Editar', () => this.abrirEdicion(registro), 'fantasma'));
      botones.push(boton('Enviar', () => void this.enviar(registro), 'secundario'));
      botones.push(boton('Eliminar', () => void this.eliminar(registro), 'peligro'));
    }
    if (registro.estado === 'ENVIADO' && puedeAprobar) {
      botones.push(boton('Aprobar', () => void this.aprobar(registro), 'primario'));
      botones.push(boton('Rechazar', () => this.abrirRechazo(registro), 'peligro'));
    }
    if (registro.estado === 'APROBADO' && puedeAprobar) {
      botones.push(boton('Rechazar', () => this.abrirRechazo(registro), 'peligro'));
    }

    if (botones.length === 0) {
      return elemento('span', { clase: 'texto-tenue', texto: '-' });
    }
    return botonera(...botones);
  }

  // ---------------------------------------------------------------------------
  // Alta
  // ---------------------------------------------------------------------------

  private async abrirAlta(): Promise<void> {
    const propio = this.empleadoPropio();
    if (!propio) {
      this.app.notificarAviso(
        'Su usuario no está vinculado a una ficha de empleado, así que no puede cargar horas.',
      );
      return;
    }

    // Solo se ofrecen los proyectos en los que hay una participación vigente:
    // el servidor rechaza cualquier otro, y ofrecerlos sería invitar al error.
    const asignaciones = await this.app.intentar(() =>
      ClienteApi.get<AsignacionDTO[]>(
        `/api/asignaciones${ClienteApi.consulta({ empleadoId: propio, activa: true })}`,
      ),
    );
    if (!asignaciones) return;

    const vigentes = new Set(asignaciones.map((asignacion) => asignacion.proyectoId));
    const disponibles = this.proyectos.filter((proyecto) => vigentes.has(proyecto.id));
    if (disponibles.length === 0) {
      this.app.notificarAviso(
        'No tiene ninguna asignación vigente, de modo que no hay proyectos a los que imputar horas.',
      );
      return;
    }

    const campos: CampoFormulario[] = [
      {
        nombre: 'proyectoId',
        etiqueta: 'Proyecto',
        tipo: 'seleccion',
        requerido: true,
        opciones: this.opcionesProyecto(disponibles),
        ayuda: 'Solo sus proyectos con asignación vigente. Además, deben estar en curso para admitir carga.',
      },
      { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, valor: hoy() },
      {
        nombre: 'horas',
        etiqueta: 'Horas',
        tipo: 'numero',
        requerido: true,
        ayuda: 'Horas trabajadas ese día en ese proyecto.',
      },
      {
        nombre: 'descripcion',
        etiqueta: 'Descripción',
        tipo: 'area',
        requerido: true,
        ayuda: `Que se hizo, con al menos ${MINIMO_DESCRIPCION} caracteres. Es lo que lee quien aprueba.`,
      },
    ];

    const formulario = new Formulario(campos);
    Modal.abrir({
      titulo: 'Cargar horas',
      contenido: formulario.render(),
      textoAceptar: 'Guardar borrador',
      alAceptar: () => this.crear(formulario),
    });
    formulario.enfocar();
  }

  private async crear(formulario: Formulario): Promise<boolean> {
    const valores = formulario.valores();
    if (!this.validar(valores)) return false;

    formulario.limpiarErrores();
    try {
      await ClienteApi.post<RegistroTiempoDTO>('/api/registros-tiempo', {
        proyectoId: valores['proyectoId'],
        fecha: valores['fecha'],
        horas: valores['horas'],
        descripcion: valores['descripcion'],
      });
      this.app.notificarExito('Horas guardadas como borrador.');
      await this.refrescar();
      return true;
    } catch (e) {
      formulario.mostrarErrores(e);
      this.app.notificarError(e instanceof ErrorApi ? e.message : 'No se pudieron guardar las horas.');
      return false;
    }
  }

  /** Comprobaciones que se pueden hacer sin ir al servidor. El servidor repite todas. */
  private validar(valores: Record<string, string | number | boolean | null>): boolean {
    const fecha = String(valores['fecha'] ?? '');
    if (fecha === '') {
      this.app.notificarError('Indique la fecha del parte.');
      return false;
    }
    if (fecha > hoy()) {
      this.app.notificarError('No se pueden cargar horas con fecha futura.');
      return false;
    }
    const descripcion = String(valores['descripcion'] ?? '').trim();
    if (descripcion.length < MINIMO_DESCRIPCION) {
      this.app.notificarError(
        `La descripción debe tener al menos ${MINIMO_DESCRIPCION} caracteres.`,
      );
      return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Edición
  // ---------------------------------------------------------------------------

  private abrirEdicion(registro: RegistroTiempoDTO): void {
    const campos: CampoFormulario[] = [
      {
        nombre: 'proyecto',
        etiqueta: 'Proyecto',
        tipo: 'texto',
        valor: this.nombreProyecto(registro.proyectoId),
        soloLectura: true,
        ayuda: 'Para imputar a otro proyecto, elimine el borrador y cargue las horas de nuevo.',
      },
      { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, valor: registro.fecha },
      {
        nombre: 'horas',
        etiqueta: 'Horas',
        tipo: 'numero',
        requerido: true,
        valor: registro.horas,
      },
      {
        nombre: 'descripcion',
        etiqueta: 'Descripción',
        tipo: 'area',
        requerido: true,
        valor: registro.descripcion,
        ayuda: `Mínimo ${MINIMO_DESCRIPCION} caracteres.`,
      },
    ];

    const formulario = new Formulario(campos);
    Modal.abrir({
      titulo: `Editar el parte del ${formatearFecha(registro.fecha)}`,
      contenido: formulario.render(),
      textoAceptar: 'Guardar cambios',
      alAceptar: () => this.actualizar(registro, formulario),
    });
    formulario.enfocar();
  }

  private async actualizar(
    registro: RegistroTiempoDTO,
    formulario: Formulario,
  ): Promise<boolean> {
    const valores = formulario.valores();
    if (!this.validar(valores)) return false;

    formulario.limpiarErrores();
    try {
      await ClienteApi.patch<RegistroTiempoDTO>(`/api/registros-tiempo/${registro.id}`, {
        fecha: valores['fecha'],
        horas: valores['horas'],
        descripcion: valores['descripcion'],
      });
      this.app.notificarExito('Registro actualizado.');
      await this.refrescar();
      return true;
    } catch (e) {
      formulario.mostrarErrores(e);
      this.app.notificarError(
        e instanceof ErrorApi ? e.message : 'No se pudo actualizar el registro.',
      );
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Circuito de aprobación
  // ---------------------------------------------------------------------------

  private async enviar(registro: RegistroTiempoDTO): Promise<void> {
    const confirmado = await Modal.confirmar(
      'Enviar a aprobación',
      `Se enviaran ${formatearNumero(registro.horas, 2)} h del ${formatearFecha(registro.fecha)}. ` +
        'A partir de ese momento el parte deja de ser editable hasta que alguien lo apruebe o lo rechace.',
    );
    if (!confirmado) return;

    const hecho = await this.app.intentar(
      () => ClienteApi.post<RegistroTiempoDTO>(`/api/registros-tiempo/${registro.id}/enviar`),
      'Parte enviado a aprobación.',
    );
    if (hecho) await this.refrescar();
  }

  private async aprobar(registro: RegistroTiempoDTO): Promise<void> {
    const hecho = await this.app.intentar(
      () => ClienteApi.post<RegistroTiempoDTO>(`/api/registros-tiempo/${registro.id}/aprobar`),
      'Parte aprobado.',
    );
    if (hecho) await this.refrescar();
  }

  private async eliminar(registro: RegistroTiempoDTO): Promise<void> {
    const confirmado = await Modal.confirmar(
      'Eliminar el parte',
      `Se borrara el registro de ${formatearNumero(registro.horas, 2)} h del ` +
        `${formatearFecha(registro.fecha)}. Solo se pueden borrar partes que aún no entraron al circuito de aprobación.`,
      true,
    );
    if (!confirmado) return;

    const hecho = await this.app.intentar(
      () => ClienteApi.borrar<{ eliminado: boolean }>(`/api/registros-tiempo/${registro.id}`),
      'Registro eliminado.',
    );
    if (hecho) await this.refrescar();
  }

  private abrirRechazo(registro: RegistroTiempoDTO): void {
    const formulario = new Formulario([
      {
        nombre: 'motivo',
        etiqueta: 'Motivo del rechazo',
        tipo: 'area',
        requerido: true,
        ayuda: `Mínimo ${MINIMO_MOTIVO} caracteres. Lo lee quien cargo las horas y queda en la traza de auditoría.`,
      },
    ]);

    Modal.abrir({
      titulo: `Rechazar el parte del ${formatearFecha(registro.fecha)}`,
      contenido: formulario.render(),
      textoAceptar: 'Rechazar',
      peligro: true,
      alAceptar: () => this.rechazar(registro, formulario),
    });
    formulario.enfocar();
  }

  private async rechazar(registro: RegistroTiempoDTO, formulario: Formulario): Promise<boolean> {
    const motivo = String(formulario.valores()['motivo'] ?? '').trim();
    if (motivo.length < MINIMO_MOTIVO) {
      this.app.notificarError(`El motivo debe tener al menos ${MINIMO_MOTIVO} caracteres.`);
      return false;
    }

    formulario.limpiarErrores();
    try {
      await ClienteApi.post<RegistroTiempoDTO>(
        `/api/registros-tiempo/${registro.id}/rechazar`,
        { motivo },
      );
      this.app.notificarExito('Parte rechazado.');
      await this.refrescar();
      return true;
    } catch (e) {
      formulario.mostrarErrores(e);
      this.app.notificarError(e instanceof ErrorApi ? e.message : 'No se pudo rechazar el parte.');
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Catálogos
  // ---------------------------------------------------------------------------

  private empleadoPropio(): string | null {
    return this.app.sesion?.empleado?.id ?? null;
  }

  private async cargarProyectos(): Promise<ProyectoDTO[]> {
    try {
      const datos = await ClienteApi.get<RespuestaProyectos>('/api/proyectos');
      return datos.proyectos;
    } catch {
      return [];
    }
  }

  private async cargarEmpleados(): Promise<EmpleadoDTO[]> {
    try {
      return await ClienteApi.get<EmpleadoDTO[]>('/api/empleados');
    } catch {
      return [];
    }
  }

  private opcionesProyecto(proyectos: ProyectoDTO[]): { valor: string; texto: string }[] {
    return proyectos.map((proyecto) => ({
      valor: proyecto.id,
      texto: `${proyecto.codigo} - ${proyecto.nombre}`,
    }));
  }

  private opcionesEmpleado(empleados: EmpleadoDTO[]): { valor: string; texto: string }[] {
    return empleados.map((empleado) => ({
      valor: empleado.id,
      texto: `${empleado.legajo} - ${empleado.nombreCompleto}`,
    }));
  }

  private nombreProyecto(id: string): string {
    const proyecto = this.proyectos.find((candidato) => candidato.id === id);
    return proyecto ? `${proyecto.codigo} - ${proyecto.nombre}` : id;
  }

  private nombreEmpleado(id: string): string {
    return this.empleados.find((empleado) => empleado.id === id)?.nombreCompleto ?? id;
  }
}
