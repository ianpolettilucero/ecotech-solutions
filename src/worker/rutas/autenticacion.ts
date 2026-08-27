import type { Enrutador } from '../Enrutador.js';
import { ServicioAutenticacion } from '../../aplicacion/ServicioAutenticacion.js';
import { ErrorAutenticacion } from '../../dominio/base/errores.js';
import { huellaDe, ipDe, json, leerJson } from '../http.js';

export function registrarRutasAutenticacion(enrutador: Enrutador): void {
  // El login es público por definición. `Servicioautenticación` aplica sus
  // propias defensas: límite por IP, bloqueo por cuenta y respuesta uniforme.
  enrutador.post(
    '/api/auth/login',
    async (api) => {
      const servicio = new ServicioAutenticacion(api.ctx);
      const cuerpo = await leerJson(api.peticion);
      const { sesion, token } = await servicio.iniciarSesion(
        cuerpo,
        ipDe(api.peticion),
        huellaDe(api.peticion),
      );
      return json(sesion, 200, { 'Set-Cookie': ServicioAutenticacion.cookieDeSesion(token) });
    },
    { requiereSesion: false },
  );

  // Cerrar sesión no exige sesión valida: si la cookie ya caduco, el cliente
  // igualmente debe poder limpiar su estado sin recibir un 401.
  enrutador.post(
    '/api/auth/logout',
    async (api) => {
      const servicio = new ServicioAutenticacion(api.ctx);
      const token = ServicioAutenticacion.leerTokenDeCookie(api.peticion.headers.get('Cookie'));
      await servicio.cerrarSesion(token);
      return json({ cerrada: true }, 200, { 'Set-Cookie': ServicioAutenticacion.cookieDeCierre() });
    },
    { requiereSesion: false },
  );

  // Es el punto que consulta la SPA al arrancar para saber si hay sesión.
  enrutador.get('/api/auth/sesion', async (api) => {
    const solicitante = api.ctx.exigirSolicitante();
    if (!api.sesion) throw new ErrorAutenticacion('No hay una sesión activa.');
    const usuario = await api.ctx.usuarios.obtenerOFallar(solicitante.usuarioId);
    const servicio = new ServicioAutenticacion(api.ctx);
    return json(await servicio.aDTO(usuario, api.sesion));
  });

  enrutador.post('/api/auth/contrasena', async (api) => {
    const servicio = new ServicioAutenticacion(api.ctx);
    await servicio.cambiarContrasena(await leerJson(api.peticion));
    return json({ actualizada: true });
  });
}
