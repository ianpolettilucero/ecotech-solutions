import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ServicioCripto } from '../src/infraestructura/ServicioCripto.js';
import { Esquema, campo } from '../src/dominio/validacion/Esquema.js';
import {
  ReglaContrasena,
  ReglaEmail,
  ReglaEnumerado,
  ReglaFecha,
  ReglaIdentificador,
  ReglaNumero,
  ReglaTexto,
} from '../src/dominio/validacion/Regla.js';
import { ErrorValidacion } from '../src/dominio/base/errores.js';
import { Usuario } from '../src/dominio/seguridad/Usuario.js';

const CLAVE = 'clave-maestra-de-prueba-suficientemente-larga-0001';

describe('ServicioCripto: contrasenas', () => {
  it('deriva un hash verificable y distinto en cada alta', async () => {
    const cripto = new ServicioCripto(CLAVE);
    const a = await cripto.hashearContrasena('Contrasena#Segura1');
    const b = await cripto.hashearContrasena('Contrasena#Segura1');
    // Misma contrasena, sal distinta -> hash distinto. Sin esto, dos empleados
    // con la misma clave serian identificables en un volcado del almacen.
    assert.notEqual(a.hash, b.hash);
    assert.notEqual(a.sal, b.sal);
    assert.equal(await cripto.verificarContrasena('Contrasena#Segura1', a.hash, a.sal), true);
    assert.equal(await cripto.verificarContrasena('Contrasena#Segura2', a.hash, a.sal), false);
  });

  it('una sal corrupta devuelve false en vez de reventar', async () => {
    const cripto = new ServicioCripto(CLAVE);
    assert.equal(await cripto.verificarContrasena('x', 'abc', 'no-es-hexadecimal'), false);
  });

  it('rechaza una clave maestra demasiado corta', () => {
    assert.throws(() => new ServicioCripto('corta'));
  });

  it('no supera el techo de iteraciones que impone Workers', async () => {
    // El runtime de Cloudflare rechaza PBKDF2 por encima de 100.000 iteraciones
    // con NotSupportedError. Miniflare NO aplica ese limite, asi que un valor
    // mayor pasa en `wrangler dev` y aborta la siembra en el primer arranque en
    // produccion. Esta prueba existe porque ya ocurrio.
    assert.equal(ServicioCripto.MAXIMO_ITERACIONES_PBKDF2, 100_000);
    const cripto = new ServicioCripto(CLAVE);
    const { hash, sal } = await cripto.hashearContrasena('Contrasena#Segura1');
    assert.equal(hash.length, 64);
    assert.equal(sal.length, 32);
  });
});

describe('ServicioCripto: cifrado de datos personales', () => {
  it('el ciclo cifrar/descifrar conserva el objeto', async () => {
    const cripto = new ServicioCripto(CLAVE);
    const original = {
      documento: '30122874',
      telefono: '+54 261 4778931',
      direccion: 'Sarmiento 455, Godoy Cruz',
      emailPersonal: 'martin.quiroga@correo.com',
    };
    const sobre = await cripto.cifrarObjeto(original);
    assert.equal(sobre.v, 1);
    assert.notEqual(sobre.ct, '');
    assert.deepEqual(await cripto.descifrarObjeto(sobre), original);
  });

  it('dos cifrados del mismo texto no coinciden (IV aleatorio)', async () => {
    const cripto = new ServicioCripto(CLAVE);
    const a = await cripto.cifrar('30122874');
    const b = await cripto.cifrar('30122874');
    assert.notEqual(a.ct, b.ct);
    assert.notEqual(a.iv, b.iv);
  });

  it('AES-GCM detecta la manipulacion del texto cifrado', async () => {
    const cripto = new ServicioCripto(CLAVE);
    const sobre = await cripto.cifrar('dato sensible');
    const alterado = { ...sobre, ct: `${sobre.ct.slice(0, -4)}AAAA` };
    await assert.rejects(() => cripto.descifrar(alterado));
  });

  it('otra clave maestra no puede abrir el sobre', async () => {
    const sobre = await new ServicioCripto(CLAVE).cifrar('secreto');
    const intruso = new ServicioCripto('otra-clave-maestra-igual-de-larga-pero-distinta');
    await assert.rejects(() => intruso.descifrar(sobre));
  });
});

describe('ServicioCripto: indice ciego', () => {
  it('es deterministico y normaliza mayusculas y espacios', async () => {
    const cripto = new ServicioCripto(CLAVE);
    const a = await cripto.indiceCiego('Ana@Eco.com ');
    const b = await cripto.indiceCiego('ana@eco.com');
    assert.equal(a, b);
    assert.notEqual(a, await cripto.indiceCiego('otra@eco.com'));
  });

  it('no revela el valor original', async () => {
    const cripto = new ServicioCripto(CLAVE);
    const indice = await cripto.indiceCiego('30122874');
    assert.equal(indice.includes('30122874'), false);
    assert.equal(indice.length, 64);
  });

  it('la comparacion en tiempo constante distingue bien', () => {
    assert.equal(ServicioCripto.comparacionConstante('abc', 'abc'), true);
    assert.equal(ServicioCripto.comparacionConstante('abc', 'abd'), false);
    assert.equal(ServicioCripto.comparacionConstante('abc', 'abcd'), false);
    assert.equal(ServicioCripto.comparacionConstante('', ''), true);
  });
});

describe('Validacion de entradas', () => {
  it('la regla de texto elimina caracteres de control', () => {
    const regla = new ReglaTexto(1, 50);
    // Byte nulo intercalado: es el vehiculo clasico del truncamiento en capas
    // inferiores escritas en C.
    assert.equal(regla.aplicar('Ana\u0000Gomez', 'nombre'), 'AnaGomez');
    assert.equal(regla.aplicar('  hola  ', 'nombre'), 'hola');
    // Un salto de linea en un campo que acaba en una cabecera HTTP permitiria
    // inyectar cabeceras; se elimina antes de que llegue a ningun lado.
    assert.equal(regla.aplicar('valor\r\nSet-Cookie: x=y', 'nombre'), 'valorSet-Cookie: x=y');
  });

  it('la contrasena exige longitud y variedad', () => {
    const regla = new ReglaContrasena();
    assert.throws(() => regla.aplicar('corta1!', 'c'), { name: 'FalloRegla' });
    assert.throws(() => regla.aplicar('todominusculas', 'c'), { name: 'FalloRegla' });
    assert.throws(() => regla.aplicar('ecotech12345', 'c'), { name: 'FalloRegla' });
    assert.equal(regla.aplicar('EcoTech#2026Admin', 'c'), 'EcoTech#2026Admin');
    // Tope superior: PBKDF2 con una entrada gigante seria un DoS barato.
    assert.throws(() => regla.aplicar('A1!'.repeat(100), 'c'), { name: 'FalloRegla' });
  });

  it('la fecha rechaza dias que no existen', () => {
    const regla = new ReglaFecha();
    assert.equal(regla.aplicar('2026-02-28', 'f'), '2026-02-28');
    assert.throws(() => regla.aplicar('2026-02-31', 'f'), { name: 'FalloRegla' });
    assert.throws(() => regla.aplicar('2026-13-01', 'f'), { name: 'FalloRegla' });
    assert.throws(() => regla.aplicar('27/08/2026', 'f'), { name: 'FalloRegla' });
  });

  it('la fecha sin futuro rechaza el manana', () => {
    const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    assert.throws(() => new ReglaFecha(false).aplicar(manana, 'f'), { name: 'FalloRegla' });
  });

  it('el identificador solo acepta UUID emitidos por el sistema', () => {
    const regla = new ReglaIdentificador();
    const id = crypto.randomUUID();
    assert.equal(regla.aplicar(id, 'id'), id.toLowerCase());
    assert.throws(() => regla.aplicar('../usuarios', 'id'), { name: 'FalloRegla' });
    assert.throws(() => regla.aplicar('1 OR 1=1', 'id'), { name: 'FalloRegla' });
  });

  it('el enumerado es lista blanca', () => {
    const regla = new ReglaEnumerado(['A', 'B'] as const);
    assert.equal(regla.aplicar('A', 'x'), 'A');
    assert.throws(() => regla.aplicar('C', 'x'), { name: 'FalloRegla' });
  });
});

describe('Esquema: lista blanca estricta', () => {
  const esquema = new Esquema<{ nombre: string; edad: number; email: string }>({
    nombre: campo(new ReglaTexto(2, 40)),
    edad: campo(new ReglaNumero(0, 120, true), { opcional: true, porDefecto: 0 }),
    email: campo(new ReglaEmail()),
  });

  it('acepta y normaliza lo declarado', () => {
    const salida = esquema.validar({ nombre: ' Ana ', email: 'ANA@Eco.COM' });
    assert.deepEqual(salida, { nombre: 'Ana', edad: 0, email: 'ana@eco.com' });
  });

  it('rechaza campos no declarados: cierra el mass assignment', () => {
    // Sin esto, un empleado podria ascenderse solo mandando {"rol":"ADMIN_RRHH"}
    // en la peticion de editar su propio perfil.
    assert.throws(
      () => esquema.validar({ nombre: 'Ana', email: 'a@b.com', rol: 'ADMIN_RRHH' }),
      ErrorValidacion,
    );
  });

  it('rechaza claves que contaminarian el prototipo', () => {
    assert.throws(
      () => esquema.validar(JSON.parse('{"nombre":"Ana","email":"a@b.com","__proto__":{"x":1}}')),
      ErrorValidacion,
    );
  });

  it('acumula todos los errores de una vez', () => {
    try {
      esquema.validar({ nombre: 'A', email: 'no-es-email' });
      assert.fail('deberia haber lanzado');
    } catch (e) {
      assert.ok(e instanceof ErrorValidacion);
      assert.equal(e.campos.length, 2);
      assert.deepEqual(
        e.campos.map((c) => c.campo).sort(),
        ['email', 'nombre'],
      );
    }
  });

  it('exige los campos obligatorios', () => {
    assert.throws(() => esquema.validar({ email: 'a@b.com' }), ErrorValidacion);
  });

  it('rechaza cuerpos que no son objetos', () => {
    assert.throws(() => esquema.validar('texto'), ErrorValidacion);
    assert.throws(() => esquema.validar([1, 2]), ErrorValidacion);
    assert.throws(() => esquema.validar(null), ErrorValidacion);
  });

  it('la variante parcial no exige nada pero valida lo que llega', () => {
    const parcial = esquema.parcial();
    assert.deepEqual(parcial.validar({}), {});
    assert.deepEqual(parcial.validar({ nombre: 'Ana' }), { nombre: 'Ana' });
    assert.throws(() => parcial.validar({ email: 'roto' }), ErrorValidacion);
  });
});

describe('Usuario: defensa contra fuerza bruta', () => {
  const nuevo = (): Usuario =>
    new Usuario({
      id: crypto.randomUUID(),
      creadoEn: '2026-01-01T00:00:00.000Z',
      actualizadoEn: '2026-01-01T00:00:00.000Z',
      email: 'admin@ecotech.com',
      hashContrasena: 'a'.repeat(64),
      salContrasena: 'b'.repeat(32),
      rol: 'ADMIN_RRHH',
      empleadoId: null,
      activo: true,
      debeCambiarContrasena: false,
      ultimoAcceso: null,
      intentosFallidos: 0,
      bloqueadoHasta: null,
    });

  it('bloquea la cuenta al quinto intento fallido', () => {
    const usuario = nuevo();
    for (let i = 0; i < 4; i++) usuario.registrarIntentoFallido();
    assert.equal(usuario.estaBloqueado(), false);
    usuario.registrarIntentoFallido();
    assert.equal(usuario.estaBloqueado(), true);
    assert.ok(usuario.segundosDeBloqueoRestantes() > 0);
  });

  it('el bloqueo es temporal, no permanente', () => {
    const usuario = nuevo();
    for (let i = 0; i < 5; i++) usuario.registrarIntentoFallido();
    const dentroDeUnaHora = new Date(Date.now() + 3_600_000);
    // Si fuera permanente, cualquiera podria dejar fuera a un empleado legitimo
    // simplemente fallando su contrasena cinco veces.
    assert.equal(usuario.estaBloqueado(dentroDeUnaHora), false);
  });

  it('un acceso correcto limpia el contador', () => {
    const usuario = nuevo();
    usuario.registrarIntentoFallido();
    usuario.registrarAccesoExitoso();
    assert.equal(usuario.intentosFallidos, 0);
    assert.equal(usuario.estaBloqueado(), false);
    assert.ok(usuario.ultimoAcceso);
  });

  it('el DTO nunca expone el hash ni la sal', () => {
    const dto = nuevo().aDTO() as unknown as Record<string, unknown>;
    assert.equal('hashContrasena' in dto, false);
    assert.equal('salContrasena' in dto, false);
    assert.equal('bloqueadoHasta' in dto, false);
    assert.equal(dto['email'], 'admin@ecotech.com');
  });

  it('cambiar credenciales levanta el bloqueo', () => {
    const usuario = nuevo();
    for (let i = 0; i < 5; i++) usuario.registrarIntentoFallido();
    usuario.cambiarCredenciales('c'.repeat(64), 'd'.repeat(32));
    assert.equal(usuario.estaBloqueado(), false);
  });
});
