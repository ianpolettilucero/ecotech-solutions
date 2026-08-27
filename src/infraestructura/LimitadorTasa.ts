import type { AlmacenKV } from './AlmacenKV.js';

export interface ResultadoLimite {
  permitido: boolean;
  intentosRestantes: number;
  reintentarEnSegundos: number;
}

/**
 * Limitador de tasa por ventana fija sobre KV.
 *
 * Protege los puntos caros o abusables: el login (fuerza bruta) y la generacion
 * de informes (cada PDF cuesta CPU). Se apoya en el TTL nativo de KV, de modo
 * que los contadores caducan solos y no hace falta purgarlos.
 *
 * Limitacion conocida y asumida: KV es eventualmente consistente, asi que un
 * atacante muy distribuido podria colarse algunos intentos de mas antes de que
 * el contador se propague. Es una segunda linea de defensa; la primera es el
 * bloqueo de cuenta de `Usuario`, que si es exacto porque vive junto al dato del
 * usuario. Esta redundancia es deliberada.
 */
export class LimitadorTasa {
  constructor(private readonly almacen: AlmacenKV) {}

  /**
   * Consume un intento del cubo `clave`.
   * @param maximo intentos permitidos dentro de la ventana
   * @param ventanaSegundos duracion de la ventana
   */
  async consumir(clave: string, maximo: number, ventanaSegundos: number): Promise<ResultadoLimite> {
    const claveKv = `limite:${clave}`;
    const ahora = Date.now();

    const estado = await this.almacen.mutar<{ inicio: number; conteo: number }>(
      claveKv,
      (actual) => {
        // Ventana caducada (o inexistente): se empieza de cero.
        if (!actual || ahora - actual.inicio >= ventanaSegundos * 1000) {
          return { inicio: ahora, conteo: 1 };
        }
        return { inicio: actual.inicio, conteo: actual.conteo + 1 };
      },
    );

    const finVentana = estado.inicio + ventanaSegundos * 1000;
    const reintentarEnSegundos = Math.max(1, Math.ceil((finVentana - ahora) / 1000));

    return {
      permitido: estado.conteo <= maximo,
      intentosRestantes: Math.max(0, maximo - estado.conteo),
      reintentarEnSegundos,
    };
  }

  /** Limpia el contador tras un intento exitoso (p. ej. un login correcto). */
  async reiniciar(clave: string): Promise<void> {
    await this.almacen.borrar(`limite:${clave}`);
  }
}
