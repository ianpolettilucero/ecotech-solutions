import {
  RegistroAuditoria,
  type EstadoRegistroAuditoria,
} from '../dominio/auditoria/RegistroAuditoria.js';
import { Esquema, campo } from '../dominio/validacion/Esquema.js';
import { ReglaBooleano, ReglaNumero, ReglaTexto } from '../dominio/validacion/Regla.js';
import type { RegistroAuditoriaDTO } from '../compartido/tipos.js';
import type { Contexto } from './Contexto.js';

/**
 * Nombre de la colección en el almacén.
 *
 * Debe coincidir con el que usa `Contexto.auditoría`: aquí se escribe con
 * `mutarcolección` en vez de con el repositorio (ver `registrar`), y ambos
 * caminos tienen que apuntar a la misma clave de KV.
 */
const COLECCION_AUDITORIA = 'auditoria';

/**
 * Tope de asientos conservados.
 *
 * La traza crece sin límite y KV admite como máximo 25 MiB por valor; al vivir
 * toda la colección bajo una sola clave, dejarla crecer terminaría rompiendo
 * *todas* las escrituras de auditoría de golpe. Se poda en cada alta,
 * conservando los más recientes: es una traza operativa, no un archivo legal
 * permanente (para eso se exporta periódicamente).
 */
const MAXIMO_ASIENTOS = 2000;

/** Cantidad de asientos que devuelve `listar` si no se pide otra cosa. */
const LIMITE_POR_DEFECTO = 200;

/** Techo duro de `listar`, para no serializar la colección entera en una respuesta. */
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
 * la entrada se normaliza igual: `acción` y `detalle` pueden arrastrar texto
 * proveniente del usuario, y `ReglaTexto` elimina los caracteres de control que
 * permitirian falsificar líneas en la traza.
 */
const ESQUEMA_ASIENTO = new Esquema<EntradaAsiento>({
  accion: campo(new ReglaTexto(1, 80)),
  entidad: campo(new ReglaTexto(1, 60)),
  // No se valida como UUID a propósito: hay asientos que referencian cosas que
  // no son entidades del sistema (el email de un login fallido, por ejemplo).
  entidadId: campo(new ReglaTexto(0, 120), { opcional: true, admiteNulo: true }),
  detalle: campo(new ReglaTexto(0, 300), { opcional: true, porDefecto: '' }),
  exito: campo(new ReglaBooleano()),
});

const ESQUEMA_FILTROS = new Esquema<FiltrosAuditoria>({
  accion: campo(new ReglaTexto(1, 80), { opcional: true }),
  entidad: campo(new ReglaTexto(1, 60), { opcional: true }),
  exito: campo(new ReglaBooleano(), { opcional: true }),
  // El máximo de la regla solo descarta valores absurdos; el tope efectivo
  // (LIMITE_MAXIMO) se aplica al cortar, para que pedir de más devuelva el tope
  // en vez de un 400.
  limite: campo(new ReglaNumero(1, 100_000, true), {
    opcional: true,
    porDefecto: LIMITE_POR_DEFECTO,
  }),
});

/**
 * Traza de auditoría: quien hizo que, sobre que y con que resultado.
 *
 * Es un servicio transversal, invocado por el resto de servicios después de
 * cada operación relevante y también por el módulo de autenticación ante
 * intentos fallidos.
 */
export class ServicioAuditoria {
  constructor(private readonly ctx: Contexto) {}

  /**
   * Asienta un evento.
   *
   * **No exige permiso** y **nunca lanza**: la auditoría es un efecto lateral
   * de la operación real, no parte de ella. Si fallara la escritura en KV y se
   * dejara propagar la excepción, un empleado no podría cargar sus horas por un
   * problema del registro, que es un modo de fallo mucho peor que perder un
   * asiento. Se deja constancia en el log del Worker y se continua.
   *
   * Tampoco requiere solicitante: un login rechazado es anónimo por definición
   * y es justamente el evento que más interesa registrar.
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

      // Se muta la colección directamente en lugar de `repositorio.guardar`
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
      // Último recurso: si ni siquiera se puede auditar, que quede al menos en
      // el log de la plataforma. Nunca se propaga hacia la operación original.
      console.error('[auditoria] no se pudo registrar el asiento', {
        accion: datos.accion,
        entidad: datos.entidad,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  /** Consulta la traza, de más reciente a más antigua. Solo para quien audita. */
  async listar(filtros?: {
    accion?: string;
    entidad?: string;
    exito?: boolean;
    limite?: number;
  }): Promise<RegistroAuditoriaDTO[]> {
    this.ctx.exigirPermiso('auditoria:leer');

    const validados = ESQUEMA_FILTROS.validar(filtros ?? {});
    const limite = Math.min(validados.limite ?? LIMITE_POR_DEFECTO, LIMITE_MAXIMO);

    // Coincidencia exacta sin distinguir mayúsculas: los valores de `acción` y
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
