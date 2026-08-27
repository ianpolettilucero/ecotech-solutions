/**
 * Perfil del usuario.
 *
 * Reune en un solo sitio lo que la sesion ya sabe: la cuenta, la ficha de
 * empleado vinculada, si la hay, y los permisos efectivos del rol. Esa ultima
 * tarjeta no es decorativa: hace visible el control de acceso, de modo que
 * cualquiera puede comprobar a que le da acceso su rol sin tener que descubrirlo
 * a base de encontrarse pantallas que no aparecen.
 */

import type { DepartamentoDTO, Permiso, SesionDTO } from '../../compartido/tipos.js';
import { ClienteApi, ErrorApi } from '../ClienteApi.js';
import { Vista } from '../Vista.js';
import { Formulario } from '../componentes/Formulario.js';
import { boton, botonera, estadoVacio } from '../componentes/piezas.js';
import { agregar, div, elemento, etiqueta, formatearFecha, formatearFechaHora } from '../dom.js';

/** Forma de la respuesta de `GET /api/departamentos`. */
interface RespuestaDepartamentos {
  departamentos: DepartamentoDTO[];
  conteoEmpleados: Record<string, number>;
}

/** Longitud minima que exige el servidor para una contrasena nueva. */
const MINIMO_CONTRASENA = 12;

/**
 * Que habilita cada permiso, en una frase.
 *
 * El codigo del permiso es preciso pero no se explica solo; el rotulo es lo que
 * permite a alguien de Recursos Humanos entender su propio rol sin leer la
 * matriz de autorizacion del servidor.
 */
const DESCRIPCIONES: Readonly<Record<Permiso, string>> = Object.freeze({
  'empleado:leer': 'Consultar el listado y la ficha de los empleados.',
  'empleado:leer_sensible': 'Ver los datos personales y la remuneracion sin enmascarar.',
  'empleado:crear': 'Dar de alta nuevos empleados.',
  'empleado:editar': 'Modificar la ficha de un empleado.',
  'empleado:eliminar': 'Dar de baja empleados.',
  'departamento:leer': 'Consultar los departamentos y su plantilla.',
  'departamento:crear': 'Crear departamentos.',
  'departamento:editar': 'Modificar un departamento y designar a su gerente.',
  'departamento:eliminar': 'Desactivar departamentos.',
  'proyecto:leer': 'Consultar la cartera de proyectos y su consumo de horas.',
  'proyecto:crear': 'Dar de alta nuevos proyectos.',
  'proyecto:editar': 'Modificar un proyecto y cambiar su estado.',
  'proyecto:eliminar': 'Dar de baja o cancelar proyectos.',
  'asignacion:leer': 'Consultar quien participa en cada proyecto.',
  'asignacion:gestionar': 'Asignar personas a proyectos y cerrar participaciones.',
  'tiempo:leer_propio': 'Ver sus propios partes de horas.',
  'tiempo:leer_todos': 'Ver los partes de horas de toda la organizacion.',
  'tiempo:registrar': 'Cargar, corregir y enviar a aprobacion sus horas.',
  'tiempo:aprobar': 'Aprobar o rechazar los partes que envian otras personas.',
  'reporte:generar': 'Generar informes y exportarlos en PDF, Excel o CSV.',
  'reporte:nomina': 'Generar el informe de nomina, que incluye importes.',
  'auditoria:leer': 'Consultar la traza de auditoria del sistema.',
  'usuario:gestionar': 'Administrar las cuentas de acceso y sus roles.',
});

/** Par rotulo/valor de una ficha. */
function dato(rotulo: string, valor: string): HTMLElement {
  return div(
    'fila',
    elemento('span', { clase: 'texto-menor texto-tenue', texto: rotulo }),
    elemento('strong', { texto: valor }),
  );
}

export class VistaPerfil extends Vista {
  override get ruta(): string {
    return 'perfil';
  }

  override get titulo(): string {
    return 'Mi perfil';
  }

  override get icono(): string {
    return 'U';
  }

  override get permisos(): Permiso[] {
    return [];
  }

  private departamentos: DepartamentoDTO[] = [];

  override async render(contenedor: HTMLElement): Promise<void> {
    const sesion = this.app.sesion;
    if (!sesion) {
      agregar(contenedor, estadoVacio('No hay una sesion activa.'));
      return;
    }

    if (sesion.empleado?.departamentoId) {
      this.departamentos = await this.cargarDepartamentos();
    }

    const rejilla = div('rejilla');
    agregar(rejilla, this.tarjetaCuenta(sesion));
    if (sesion.empleado) {
      agregar(rejilla, this.tarjetaEmpleado(sesion), this.tarjetaDatosPersonales(sesion));
    }
    agregar(rejilla, this.tarjetaContrasena(), this.tarjetaPermisos(sesion));

    agregar(
      contenedor,
      div(
        'pila',
        elemento('h2', { clase: 'vista-titulo', texto: 'Mi perfil' }),
        elemento('p', {
          clase: 'texto-menor texto-tenue',
          texto: 'Los datos de su cuenta y lo que su rol le permite hacer en el sistema.',
        }),
      ),
      rejilla,
    );
  }

  // ---------------------------------------------------------------------------
  // Fichas
  // ---------------------------------------------------------------------------

  private tarjetaCuenta(sesion: SesionDTO): HTMLElement {
    const tarjeta = div(
      'tarjeta',
      elemento('h3', { clase: 'tarjeta-titulo', texto: 'Cuenta' }),
      dato('Email', sesion.usuario.email),
      dato('Rol', etiqueta(sesion.usuario.rol)),
      dato('Ultimo acceso', formatearFechaHora(sesion.usuario.ultimoAcceso)),
      dato('La sesion expira', formatearFechaHora(sesion.expiraEn)),
    );
    if (sesion.usuario.debeCambiarContrasena) {
      agregar(
        tarjeta,
        elemento('p', {
          clase: 'texto-menor',
          texto:
            'Su contrasena es la inicial que se le entrego. Cambiela ahora: mientras siga siendo la sembrada, no podra usar el resto de los modulos.',
        }),
      );
    }
    return tarjeta;
  }

  private tarjetaEmpleado(sesion: SesionDTO): HTMLElement {
    const empleado = sesion.empleado;
    if (!empleado) return div('tarjeta');

    return div(
      'tarjeta',
      elemento('h3', { clase: 'tarjeta-titulo', texto: 'Ficha de empleado' }),
      dato('Legajo', empleado.legajo),
      dato('Nombre', empleado.nombreCompleto),
      dato('Email corporativo', empleado.emailCorporativo),
      dato('Tipo de contrato', etiqueta(empleado.tipoContrato)),
      dato('Departamento', this.nombreDepartamento(empleado.departamentoId)),
      dato('Fecha de ingreso', formatearFecha(empleado.fechaInicioContrato)),
      dato('Situacion', empleado.activo ? 'Activo' : 'Dado de baja'),
    );
  }

  private tarjetaDatosPersonales(sesion: SesionDTO): HTMLElement {
    const empleado = sesion.empleado;
    if (!empleado) return div('tarjeta');

    const tarjeta = div(
      'tarjeta',
      elemento('h3', { clase: 'tarjeta-titulo', texto: 'Datos personales' }),
      dato('Documento', empleado.datosSensibles.documento),
      dato('Telefono', empleado.datosSensibles.telefono),
      dato('Direccion', empleado.datosSensibles.direccion),
      dato('Email personal', empleado.datosSensibles.emailPersonal),
    );
    agregar(
      tarjeta,
      elemento('p', {
        clase: 'texto-menor texto-tenue',
        // Se explica el porque del enmascarado: si no, parece un fallo de carga.
        texto: empleado.sensiblesEnmascarados
          ? 'Estos datos llegan enmascarados: se guardan cifrados y solo se devuelven en claro a quien tiene el permiso de lectura sensible.'
          : 'Estos datos se guardan cifrados y solo viajan en claro hacia quien tiene permiso para verlos.',
      }),
    );
    return tarjeta;
  }

  // ---------------------------------------------------------------------------
  // Cambio de contrasena
  // ---------------------------------------------------------------------------

  private tarjetaContrasena(): HTMLElement {
    const formulario = new Formulario([
      {
        nombre: 'contrasenaActual',
        etiqueta: 'Contrasena actual',
        tipo: 'contrasena',
        requerido: true,
      },
      {
        nombre: 'contrasenaNueva',
        etiqueta: 'Contrasena nueva',
        tipo: 'contrasena',
        requerido: true,
        ayuda: `Al menos ${MINIMO_CONTRASENA} caracteres, combinando tres de estas familias: minusculas, mayusculas, numeros y simbolos.`,
      },
      {
        nombre: 'contrasenaRepetida',
        etiqueta: 'Repita la contrasena nueva',
        tipo: 'contrasena',
        requerido: true,
      },
    ]);

    return div(
      'tarjeta',
      elemento('h3', { clase: 'tarjeta-titulo', texto: 'Cambiar contrasena' }),
      formulario.render(),
      botonera(
        boton('Cambiar contrasena', () => void this.cambiarContrasena(formulario), 'primario'),
      ),
    );
  }

  private async cambiarContrasena(formulario: Formulario): Promise<void> {
    const valores = formulario.valores();
    formulario.limpiarErrores();

    const nueva = String(valores['contrasenaNueva'] ?? '');
    const repetida = String(valores['contrasenaRepetida'] ?? '');
    // La repeticion no viaja al servidor: es un control de la interfaz para
    // evitar guardar una clave mal tecleada que despues nadie podria adivinar.
    if (nueva !== repetida) {
      this.app.notificarError('La contrasena nueva y su repeticion no coinciden.');
      return;
    }

    try {
      await ClienteApi.post<{ actualizada: boolean }>('/api/auth/contrasena', {
        contrasenaActual: valores['contrasenaActual'],
        contrasenaNueva: nueva,
      });
      this.app.notificarExito('Contrasena actualizada.');
      // Se relee la sesion: al rotar la clave sembrada desaparece la obligacion
      // de cambiarla, y con ella el desvio forzoso a esta pantalla.
      await this.app.recargar();
    } catch (e) {
      formulario.mostrarErrores(e);
      this.app.notificarError(
        e instanceof ErrorApi ? e.message : 'No se pudo cambiar la contrasena.',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Permisos
  // ---------------------------------------------------------------------------

  private tarjetaPermisos(sesion: SesionDTO): HTMLElement {
    const lista = elemento('ul', { clase: 'pila' });
    for (const permiso of sesion.permisos) {
      agregar(
        lista,
        elemento(
          'li',
          { clase: 'pila' },
          elemento('code', { clase: 'texto-mono', texto: permiso }),
          elemento('span', { clase: 'texto-menor texto-tenue', texto: DESCRIPCIONES[permiso] }),
        ),
      );
    }

    return div(
      'tarjeta',
      div(
        'tarjeta-titulo',
        elemento('span', { texto: 'Permisos de su rol' }),
        elemento('small', { texto: `${sesion.permisos.length} permiso(s)` }),
      ),
      elemento('p', {
        clase: 'texto-menor texto-tenue',
        texto: `Su rol es ${etiqueta(sesion.usuario.rol)}. Todo lo que no figure en esta lista lo rechaza el servidor, aunque se llegue a la direccion a mano.`,
      }),
      lista,
    );
  }

  // ---------------------------------------------------------------------------
  // Catalogo
  // ---------------------------------------------------------------------------

  private async cargarDepartamentos(): Promise<DepartamentoDTO[]> {
    try {
      const datos = await ClienteApi.get<RespuestaDepartamentos>('/api/departamentos');
      return datos.departamentos;
    } catch {
      return [];
    }
  }

  private nombreDepartamento(id: string | null): string {
    if (!id) return 'Sin departamento';
    return this.departamentos.find((departamento) => departamento.id === id)?.nombre ?? id;
  }
}
