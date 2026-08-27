import { ErrorInterno } from '../dominio/base/errores.js';

import type { SobreCifrado } from '../dominio/base/SobreCifrado.js';

// Se reexporta por comodidad de los llamadores, pero la definicion vive en el
// dominio: es el dominio quien declara la forma de un dato protegido.
export type { SobreCifrado };

/**
 * Usos de clave de WebCrypto. Se declara aqui porque el tipo `KeyUsage` de la
 * libreria DOM no existe en los tipos del runtime de Workers, y este modulo se
 * compila contra estos ultimos.
 */
type UsoDeClave = 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'deriveKey' | 'deriveBits';

const CODIFICADOR = new TextEncoder();
const DECODIFICADOR = new TextDecoder();

function aBase64(bytes: Uint8Array): string {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}

function desdeBase64(texto: string): Uint8Array<ArrayBuffer> {
  const binario = atob(texto);
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

/**
 * Bytes aleatorios sobre un `ArrayBuffer` concreto.
 *
 * Desde TypeScript 5.7 `Uint8Array` es generico en su buffer, y las firmas de
 * WebCrypto exigen `ArrayBuffer` y no `ArrayBufferLike` (que admitiria un
 * `SharedArrayBuffer`, no valido para estas operaciones). Construir el buffer
 * de forma explicita evita el ensanchamiento del tipo.
 */
function bytesAleatorios(longitud: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(longitud));
  crypto.getRandomValues(bytes);
  return bytes;
}

function aHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Servicios criptograficos del sistema, todos sobre WebCrypto (nativo del
 * runtime de Workers, sin dependencias de terceros).
 *
 * Cubre tres requisitos distintos que conviene no confundir:
 *
 * 1. **Contrasenas** -> PBKDF2-SHA256 con sal por usuario. Es una funcion de
 *    *derivacion* lenta y de una sola via: ni siquiera el sistema puede
 *    recuperar la contrasena original.
 * 2. **Datos personales** -> AES-256-GCM. Es cifrado *reversible* y autenticado:
 *    RRHH necesita volver a leer el domicilio de un empleado, pero un volcado
 *    del almacen KV no revela nada sin la clave, que vive en un secret del
 *    Worker y nunca en el repositorio.
 * 3. **Indices ciegos** -> HMAC-SHA256. Permite comprobar "ya existe un
 *    empleado con este documento" sin descifrar la coleccion entera ni guardar
 *    el documento en claro.
 */
export class ServicioCripto {
  private claveAes: CryptoKey | null = null;
  private claveHmac: CryptoKey | null = null;

  /**
   * Iteraciones de PBKDF2.
   *
   * OWASP recomienda 210.000 para PBKDF2-HMAC-SHA256, pero **el runtime de
   * Cloudflare Workers rechaza cualquier valor por encima de 100.000**:
   *
   *   NotSupportedError: Pbkdf2 failed: iteration counts above 100000
   *   are not supported (requested 210000)
   *
   * No es una eleccion, es el techo de la plataforma. Conviene saber que el
   * emulador local (Miniflare) NO aplica ese limite: con 210.000 todo funciona
   * en `wrangler dev` y revienta en el primer arranque en produccion. Este
   * proyecto lo descubrio asi, y por eso `tests/seguridad.test.ts` fija el valor
   * con una prueba: subirlo vuelve a romper el despliegue.
   *
   * Lo que compensa la diferencia frente a la recomendacion son los controles
   * que la rodean, no el numero: bloqueo de cuenta a los cinco intentos,
   * limitador por IP, y una politica de contrasena de 12 caracteres minimos con
   * tres familias. El analisis esta en `docs/06-seguridad.md`.
   */
  private static readonly ITERACIONES_PBKDF2 = 100_000;

  /** Techo que impone el runtime de Workers. Superarlo aborta en produccion. */
  static readonly MAXIMO_ITERACIONES_PBKDF2 = 100_000;
  private static readonly LONGITUD_SAL = 16;
  private static readonly LONGITUD_IV = 12;

  constructor(private readonly claveMaestra: string) {
    if (!claveMaestra || claveMaestra.length < 32) {
      throw new ErrorInterno(
        'La clave maestra de cifrado no esta configurada o es demasiado corta.',
      );
    }
  }

  // -------------------------------------------------------------------------
  // Derivacion de claves de proposito especifico
  // -------------------------------------------------------------------------

  /**
   * Deriva por HKDF una subclave distinta para cada proposito. Reutilizar la
   * misma clave para cifrar y para el indice ciego debilitaria ambos usos.
   */
  private async derivar(
    proposito: string,
    algoritmo: 'AES-GCM' | 'HMAC',
    usos: UsoDeClave[],
  ): Promise<CryptoKey> {
    const material = await crypto.subtle.importKey(
      'raw',
      CODIFICADOR.encode(this.claveMaestra),
      'HKDF',
      false,
      ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: CODIFICADOR.encode('ecotech-solutions-v1'),
        info: CODIFICADOR.encode(proposito),
      },
      material,
      algoritmo === 'AES-GCM'
        ? { name: 'AES-GCM', length: 256 }
        : { name: 'HMAC', hash: 'SHA-256' },
      false,
      usos,
    );
  }

  private async obtenerClaveAes(): Promise<CryptoKey> {
    this.claveAes ??= await this.derivar('cifrado-datos-personales', 'AES-GCM', [
      'encrypt',
      'decrypt',
    ]);
    return this.claveAes;
  }

  private async obtenerClaveHmac(): Promise<CryptoKey> {
    this.claveHmac ??= await this.derivar('indice-ciego', 'HMAC', ['sign']);
    return this.claveHmac;
  }

  // -------------------------------------------------------------------------
  // Cifrado simetrico autenticado de datos personales
  // -------------------------------------------------------------------------

  async cifrar(textoPlano: string): Promise<SobreCifrado> {
    const clave = await this.obtenerClaveAes();
    const iv = bytesAleatorios(ServicioCripto.LONGITUD_IV);
    const cifrado = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      clave,
      CODIFICADOR.encode(textoPlano),
    );
    return { v: 1, iv: aBase64(iv), ct: aBase64(new Uint8Array(cifrado)) };
  }

  async descifrar(sobre: SobreCifrado): Promise<string> {
    const clave = await this.obtenerClaveAes();
    try {
      const plano = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: desdeBase64(sobre.iv) },
        clave,
        desdeBase64(sobre.ct),
      );
      return DECODIFICADOR.decode(plano);
    } catch {
      // GCM falla si el texto fue alterado: es deteccion de manipulacion.
      throw new ErrorInterno('No se pudo descifrar un dato protegido.');
    }
  }

  /** Cifra un objeto completo (se serializa a JSON antes). */
  async cifrarObjeto(valor: unknown): Promise<SobreCifrado> {
    return this.cifrar(JSON.stringify(valor));
  }

  async descifrarObjeto<T>(sobre: SobreCifrado): Promise<T> {
    return JSON.parse(await this.descifrar(sobre)) as T;
  }

  // -------------------------------------------------------------------------
  // Indice ciego
  // -------------------------------------------------------------------------

  /**
   * Huella deterministica de un valor sensible, para comprobar unicidad sin
   * almacenarlo en claro. Normaliza a minusculas y recorta espacios para que
   * "Ana@Eco.com " y "ana@eco.com" colisionen a proposito.
   */
  async indiceCiego(valor: string): Promise<string> {
    const clave = await this.obtenerClaveHmac();
    const firma = await crypto.subtle.sign(
      'HMAC',
      clave,
      CODIFICADOR.encode(valor.trim().toLowerCase()),
    );
    return aHex(new Uint8Array(firma));
  }

  // -------------------------------------------------------------------------
  // Contrasenas
  // -------------------------------------------------------------------------

  /** Deriva `hash` y `sal` (ambos hexadecimales) para una contrasena nueva. */
  async hashearContrasena(contrasena: string): Promise<{ hash: string; sal: string }> {
    const sal = bytesAleatorios(ServicioCripto.LONGITUD_SAL);
    const hash = await this.pbkdf2(contrasena, sal);
    return { hash: aHex(hash), sal: aHex(sal) };
  }

  /** Verificacion en tiempo constante contra ataques de temporizacion. */
  async verificarContrasena(
    contrasena: string,
    hashEsperado: string,
    salHex: string,
  ): Promise<boolean> {
    let sal: Uint8Array<ArrayBuffer>;
    try {
      sal = ServicioCripto.desdeHex(salHex);
    } catch {
      return false;
    }
    const calculado = aHex(await this.pbkdf2(contrasena, sal));
    return ServicioCripto.comparacionConstante(calculado, hashEsperado);
  }

  private async pbkdf2(contrasena: string, sal: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
    const material = await crypto.subtle.importKey(
      'raw',
      CODIFICADOR.encode(contrasena),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: sal,
        iterations: ServicioCripto.ITERACIONES_PBKDF2,
        hash: 'SHA-256',
      },
      material,
      256,
    );
    return new Uint8Array(bits);
  }

  // -------------------------------------------------------------------------
  // Utilidades
  // -------------------------------------------------------------------------

  /** SHA-256 en hexadecimal. Se usa para guardar tokens de sesion hasheados. */
  static async sha256(valor: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', CODIFICADOR.encode(valor));
    return aHex(new Uint8Array(digest));
  }

  /**
   * Comparacion de cadenas en tiempo constante respecto del contenido.
   * Se recorre siempre la longitud mayor para no filtrar por longitud.
   */
  static comparacionConstante(a: string, b: string): boolean {
    const longitud = Math.max(a.length, b.length);
    let diferencia = a.length ^ b.length;
    for (let i = 0; i < longitud; i++) {
      diferencia |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    return diferencia === 0;
  }

  private static desdeHex(hex: string): Uint8Array<ArrayBuffer> {
    if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) {
      throw new Error('hexadecimal invalido');
    }
    const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Number.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
}
