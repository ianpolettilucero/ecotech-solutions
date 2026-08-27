/**
 * Traza de auditoría.
 *
 * Es la única pantalla que se lee de abajo arriba: no muestra el estado en que
 * quedaron las cosas, sino como llegaron a estarlo. Por eso incluye los
 * intentos fallidos, que son justo los que no dejan rastro en el resto de la
 * aplicación y los que más dicen cuando algo va mal.
 */

import type { Permiso, RegistroAuditoriaDTO } from '../../compartido/tipos.js';
import { ClienteApi } from '../ClienteApi.js';
import { Vista } from '../Vista.js';
import type { ColumnaTabla } from '../componentes/Tabla.js';
import { Tabla } from '../componentes/Tabla.js';
import {
  buscador,
  campoFiltro,
  cargando,
  estadoVacio,
  filtros,
  selector,
} from '../componentes/piezas.js';
import { agregar, div, elemento, formatearFechaHora, vaciar } from '../dom.js';

/** Entidades sobre las que el sistema deja asientos, con su rotulo legible. */
const ENTIDADES: readonly { valor: string; texto: string }[] = [
  { valor: '', texto: 'Todas las entidades' },
  { valor: 'Empleado', texto: 'Empleado' },
  { valor: 'Departamento', texto: 'Departamento' },
  { valor: 'Proyecto', texto: 'Proyecto' },
  { valor: 'AsignacionProyecto', texto: 'Asignación a proyecto' },
  { valor: 'RegistroTiempo', texto: 'Registro de tiempo' },
  { valor: 'Reporte', texto: 'Informe' },
  { valor: 'Usuario', texto: 'Usuario' },
];

const LIMITES: readonly { valor: string; texto: string }[] = [
  { valor: '100', texto: '100 asientos' },
  { valor: '200', texto: '200 asientos' },
  { valor: '500', texto: '500 asientos' },
];

export class VistaAuditoria extends Vista {
  override get ruta(): string {
    return 'auditoria';
  }

  override get titulo(): string {
    return 'Auditoría';
  }

  override get icono(): string {
    return 'T';
  }

  override get permisos(): Permiso[] {
    return ['auditoria:leer'];
  }

  private accion = '';
  private entidad = '';
  private exito = '';
  private limite = '200';
  private lista: HTMLElement | null = null;

  override async render(contenedor: HTMLElement): Promise<void> {
    const introduccion = div(
      'tarjeta',
      elemento('h2', { clase: 'tarjeta-titulo', texto: 'Quién hizo qué, y cuándo' }),
      elemento('p', {
        texto:
          'Cada operación que cambia algo deja aquí un asiento con su autor, el momento exacto, la entidad afectada y la dirección IP desde la que se pidió. También quedan los intentos que NO prosperaron: un acceso denegado, un login fallido o una regla de negocio que cortó la operación. Esos son los que permiten distinguir un error honesto de un intento repetido, y por eso la traza no se puede borrar ni editar desde la aplicación.',
      }),
    );

    const barra = filtros(
      campoFiltro(
        'Acción',
        buscador('Acción exacta, p.ej. LOGIN_FALLIDO', (valor) => {
          // El servidor compara la acción completa, sin distinguir mayúsculas:
          // no es una búsqueda por fragmento sino un filtro por clave cerrada.
          this.accion = valor;
          void this.refrescar();
        }),
      ),
      campoFiltro(
        'Entidad',
        selector([...ENTIDADES], this.entidad, (valor) => {
          this.entidad = valor;
          void this.refrescar();
        }),
      ),
      campoFiltro(
        'Resultado',
        selector(
          [
            { valor: '', texto: 'Exitos y fallos' },
            { valor: 'true', texto: 'Solo exitos' },
            { valor: 'false', texto: 'Solo fallos' },
          ],
          this.exito,
          (valor) => {
            this.exito = valor;
            void this.refrescar();
          },
        ),
      ),
      campoFiltro(
        'Cuantos',
        selector([...LIMITES], this.limite, (valor) => {
          this.limite = valor;
          void this.refrescar();
        }),
      ),
    );

    this.lista = div('pila');
    agregar(contenedor, introduccion, barra, this.lista);
    await this.refrescar();
  }

  private async refrescar(): Promise<void> {
    const destino = this.lista;
    if (!destino) return;

    vaciar(destino);
    agregar(destino, cargando());

    const consulta = ClienteApi.consulta({
      accion: this.accion,
      entidad: this.entidad,
      exito: this.exito,
      limite: this.limite,
    });
    const asientos = await this.app.intentar(() =>
      ClienteApi.get<RegistroAuditoriaDTO[]>(`/api/auditoria${consulta}`),
    );

    vaciar(destino);
    if (!asientos) {
      agregar(destino, estadoVacio('No se pudo cargar la traza de auditoría.'));
      return;
    }
    agregar(destino, VistaAuditoria.tabla().render(asientos));
  }

  private static tabla(): Tabla<RegistroAuditoriaDTO> {
    const columnas: ColumnaTabla<RegistroAuditoriaDTO>[] = [
      { titulo: 'Fecha y hora', celda: (a) => formatearFechaHora(a.creadoEn) },
      // Un asiento sin usuario es una operación previa a la autenticación: un
      // login fallido, por ejemplo. Se rotula como anónimo, no se deja vacío.
      { titulo: 'Usuario', celda: (a) => a.emailUsuario ?? 'anónimo' },
      { titulo: 'Acción', clase: 'texto-mono', celda: (a) => a.accion },
      { titulo: 'Entidad', celda: (a) => VistaAuditoria.nombreEntidad(a.entidad) },
      { titulo: 'Resultado', celda: (a) => VistaAuditoria.marcaResultado(a.exito) },
      { titulo: 'Detalle', clase: 'celda-texto', celda: (a) => a.detalle },
      { titulo: 'IP', clase: 'texto-mono', celda: (a) => a.ip ?? '-' },
    ];
    return new Tabla(columnas, {
      vacio: 'No hay asientos que coincidan con los filtros aplicados.',
    });
  }

  private static nombreEntidad(entidad: string): string {
    return ENTIDADES.find((opcion) => opcion.valor === entidad)?.texto ?? entidad;
  }

  private static marcaResultado(exito: boolean): Node {
    return elemento('span', {
      clase: exito ? 'insignia insignia-exito' : 'insignia insignia-peligro',
      texto: exito ? 'Exito' : 'Fallo',
    });
  }
}
