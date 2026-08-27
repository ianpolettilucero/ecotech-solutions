import {
  RegistroAuditoria,
  type EstadoRegistroAuditoria,
} from '../dominio/auditoria/RegistroAuditoria.js';
import { Esquema, campo } from '../dominio/validacion/Esquema.js';
import { ReglaBooleano, ReglaNumero, ReglaTexto } from '../dominio/validacion/Regla.js';
import type { RegistroAuditoriaDTO } from '../compartido/tipos.js';
import type { Contexto } from './Contexto.js';

/**
 * Nombre de la coleccion en el almacen.
 *
 * Debe coincidir con el que usa `Contexto.auditoria`: aqui se escribe con
 * `mutarColeccion` en vez de con el repositorio (ver `registrar`), y ambos
 * caminos tienen que apuntar a la misma clave de KV.
 */
const COLECCION_AUDITORIA = 'auditoria';

/**
 * Tope de asientos conservados.
 *
 * La traza crece sin limite y KV admite como maximo 25 MiB por valor; al vivir
 * toda la coleccion bajo una sola clave, dejarla crecer terminaria rompiendo
 * *todas* las escrituras de auditoria de golpe. Se poda en cada alta,
 * conservando los mas recientes: es una traza operativa, no un archivo legal
 * permanente (para eso se exporta periodicamente).
 */
const MAXIMO_ASIENTOS = 2000;

/** Cantidad de asientos que devuelve `listar` si no se pide otra cosa. */
const LIMITE_POR_DEFECTO = 200;

/** Techo duro de `listar`, para no serializar la coleccion entera en una respuesta. */
const LIMITE_MAXIMO = 1000;

type EntradaAsiento = {
  accion: string;
  entidad: string;
  entidadId?: string | null;
  detalle?: string;
  exito: boolean;
};

type FiltrosAuditoria = {
  accion?: string;
  entidad?: string;
  exito?: boolean;
  limite?: number;
};

/**
 * Esquema del asiento.
 *
 * Aunque `registrar` lo invocan otros servicios (y no directamente el router),
 * la entrada se normaliza igual: `accion` y `detalle` pueden arrastrar texto
 * proveniente del usuario, y `ReglaTexto` elimina los caracteres de control que
 * permitirian falsificar lineas en la traza.
 */
const ESQUEMA_ASIENTO = new Esquema<EntradaAsiento>({
  accion: campo(new ReglaTexto(1, 80)),
  entidad: campo(new ReglaTexto(1, 60)),
  // No se valida como UUID a proposito: hay asientos que referencian cosas que
  // no son entidades del sistema (el email de un login fallido, por ejemplo).
  entidadId: campo(new ReglaTexto(0, 120), { opcional: true, admiteNulo: true }),
  detalle: campo(new ReglaTexto(0, 300), { opcional: true, porDefecto: '' }),
  exito: campo(new ReglaBooleano()),
});

const ESQUEMA_FILTROS = new Esquema<FiltrosAuditoria>({
  accion: campo(new ReglaTexto(1, 80), { opcional: true }),
  entidad: campo(new ReglaTexto(1, 60), { opcional: true }),
  exito: campo(new ReglaBooleano(), { opcional: true }),
  // El maximo de la regla solo descarta valores absurdos; el tope efectivo
  // (LIMITE_MAXIMO) se aplica al cortar, para que pedir de mas devuelva el tope
  // en vez de un 400.
  limite: campo(new ReglaNumero(1, 100_000, true), {
    opcional: true,
    porDefecto: LIMITE_POR_DEFECTO,
  }),
});

/**
 * Traza de auditoria: quien hizo que, sobre que y con que resultado.
 *
 * Es un servicio transversal, invocado por el resto de servicios despues de
 * cada operacion relevante y tambien por el modulo de autenticacion ante
 * intentos fallidos.
 */
export class ServicioAuditoria {
  constructor(private readonly ctx: Contexto) {}

  /**
   * Asienta un evento.
   *
   * **No exige permiso** y **nunca lanza**: la auditoria es un efecto lateral
   * de la operacion real, no parte de ella. Si fallara la escritura en KV y se
   * dejara propagar la excepcion, un empleado no podria cargar sus horas por un
   * problema del registro, que es un modo de fallo mucho peor que perder un
   * asiento. Se deja constancia en el log del Worker y se continua.
   *
   * Tampoco requiere solicitante: un login rechazado es anonimo por definicion
   * y es justamente el evento que mas interesa registrar.
   */
  async registrar(datos: {
    accion: string;
    entidad: string;
    entidadId?: string | null;
    detalle?: string;
    exito: boolean;
  }): Promise<void> {
    try {
      const validados = ESQUEMA_ASIENTO.validar(datos);
      const solicitante = this.ctx.solicitante;

      const asiento = RegistroAuditoria.registrar({
        usuarioId: solicitante?.usuarioId ?? null,
        emailUsuario: solicitante?.email ?? null,
        accion: validados.accion,
        entidad: validados.entidad,
        entidadId: validados.entidadId ? validados.entidadId : null,
        detalle: validados.detalle ?? '',
        exito: validados.exito,
        ip: solicitante?.ip ?? null,
      });
      const estado = asiento.aEstado();

      // Se muta la coleccion directamente en lugar de `repositorio.guardar`
      // para que el alta y la poda ocurran en la misma lectura-escritura: con
      // dos pasadas se pagarian dos escrituras de KV por cada evento auditado.
      await this.ctx.almacen.mutarColeccion<EstadoRegistroAuditoria>(
        COLECCION_AUDITORIA,
        (actual) => {
          const siguiente: Record<string, EstadoRegistroAuditoria> = {
            ...actual,
            [estado.id]: estado,
          };
          if (Object.keys(siguiente).length <= MAXIMO_ASIENTOS) return siguiente;

          const conservados = Object.values(siguiente)
            .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
            .slice(0, MAXIMO_ASIENTOS);
          const podada: Record<string, EstadoRegistroAuditoria> = {};
          for (const conservado of conservados) podada[conservado.id] = conservado;
          return podada;
        },
      );
    } catch (e) {
      // Ultimo recurso: si ni siquiera se puede auditar, que quede al menos en
      // el log de la plataforma. Nunca se propaga hacia la operacion original.
      console.error('[auditoria] no se pudo registrar el asiento', {
        accion: datos.accion,
        entidad: datos.entidad,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  /** Consulta la traza, de mas reciente a mas antigua. Solo para quien audita. */
  async listar(filtros?: {
    accion?: string;
    entidad?: string;
    exito?: boolean;
    limite?: number;
  }): Promise<RegistroAuditoriaDTO[]> {
    this.ctx.exigirPermiso('auditoria:leer');

    const validados = ESQUEMA_FILTROS.validar(filtros ?? {});
    const limite = Math.min(validados.limite ?? LIMITE_POR_DEFECTO, LIMITE_MAXIMO);

    // Coincidencia exacta sin distinguir mayusculas: los valores de `accion` y
    // `entidad` son claves cerradas del sistema, no texto libre a buscar.
    const accionBuscada = validados.accion?.toLowerCase();
    const entidadBuscada = validados.entidad?.toLowerCase();
    const exitoBuscado = validados.exito;

    const asientos = await this.ctx.auditoria.listar((asiento) => {
      if (accionBuscada !== undefined && asiento.accion.toLowerCase() !== accionBuscada) {
        return false;
      }
      if (entidadBuscada !== undefined && asiento.entidad.toLowerCase() !== entidadBuscada) {
        return false;
      }
      if (exitoBuscado !== undefined && asiento.exito !== exitoBuscado) return false;
      return true;
    });

    return asientos
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
      .slice(0, limite)
      .map((asiento) => asiento.aDTO());
  }
}
