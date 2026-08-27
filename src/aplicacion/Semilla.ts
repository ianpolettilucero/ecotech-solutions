import type { Contexto } from './Contexto.js';
import { FabricaEmpleados } from '../dominio/fabricas/FabricaEmpleados.js';
import { Departamento } from '../dominio/organizacion/Departamento.js';
import { Proyecto } from '../dominio/organizacion/Proyecto.js';
import { AsignacionProyecto } from '../dominio/organizacion/AsignacionProyecto.js';
import { RegistroTiempo } from '../dominio/tiempo/RegistroTiempo.js';
import { Usuario } from '../dominio/seguridad/Usuario.js';
import { formatearCodigoProyecto, formatearLegajo, nuevoId } from '../dominio/base/Identificador.js';
import type { Empleado } from '../dominio/personas/Empleado.js';
import type { Rol, RolProyecto, TipoContrato } from '../compartido/tipos.js';

/**
 * Contrasena del administrador en el primer arranque.
 *
 * Se usa solo si NO esta definido el secret `CLAVE_ADMIN_INICIAL`. Es publica a
 * proposito (esta en el repositorio) porque su unica funcion es permitir el
 * primer acceso; el usuario queda marcado con `debeCambiarContrasena`, de modo
 * que el sistema obliga a reemplazarla antes de dejar operar. En un despliegue
 * real se define el secret y esta constante nunca llega a usarse.
 */
export const CLAVE_ADMIN_POR_DEFECTO = 'EcoTech#2026Admin';

/** Clave que marca que la siembra ya se ejecuto. */
const CLAVE_MARCA = 'sistema:sembrado';

interface PlantillaEmpleado {
  nombre: string;
  apellido: string;
  tipoContrato: TipoContrato;
  departamento: string;
  fechaInicioContrato: string;
  documento: string;
  telefono: string;
  direccion: string;
  salarioMensual?: number;
  tarifaHora?: number;
  topeMensual?: number;
  /** Si tiene cuenta, con que rol. */
  rol?: Rol;
}

const DEPARTAMENTOS: { nombre: string; descripcion: string }[] = [
  {
    nombre: 'Desarrollo Sostenible',
    descripcion: 'Disena e implementa las soluciones de eficiencia energetica de la empresa.',
  },
  {
    nombre: 'Investigacion y Desarrollo',
    descripcion: 'Investigacion aplicada en materiales y almacenamiento de energia.',
  },
  {
    nombre: 'Ventas',
    descripcion: 'Relacion comercial, licitaciones y seguimiento de clientes.',
  },
  {
    nombre: 'Recursos Humanos',
    descripcion: 'Gestion de personal, contratacion y liquidacion de haberes.',
  },
  {
    nombre: 'Operaciones',
    descripcion: 'Instalacion, puesta en marcha y mantenimiento en campo.',
  },
];

const EMPLEADOS: PlantillaEmpleado[] = [
  {
    nombre: 'Valeria', apellido: 'Sandoval', tipoContrato: 'ASALARIADO',
    departamento: 'Recursos Humanos', fechaInicioContrato: '2021-03-01',
    documento: '28455901', telefono: '+54 261 4551200', direccion: 'Av. San Martin 1240, Mendoza',
    salarioMensual: 2450000, rol: 'ADMIN_RRHH',
  },
  {
    nombre: 'Martin', apellido: 'Quiroga', tipoContrato: 'ASALARIADO',
    departamento: 'Desarrollo Sostenible', fechaInicioContrato: '2020-06-15',
    documento: '30122874', telefono: '+54 261 4778931', direccion: 'Sarmiento 455, Godoy Cruz',
    salarioMensual: 3100000, rol: 'GERENTE',
  },
  {
    nombre: 'Lucia', apellido: 'Ferreyra', tipoContrato: 'ASALARIADO',
    departamento: 'Investigacion y Desarrollo', fechaInicioContrato: '2019-09-02',
    documento: '27998145', telefono: '+54 261 4330077', direccion: 'Belgrano 890, Ciudad',
    salarioMensual: 3350000, rol: 'GERENTE',
  },
  {
    nombre: 'Diego', apellido: 'Alcaraz', tipoContrato: 'ASALARIADO',
    departamento: 'Ventas', fechaInicioContrato: '2022-01-10',
    documento: '33447120', telefono: '+54 261 4661188', direccion: 'Colon 210, Ciudad',
    salarioMensual: 2200000,
  },
  {
    nombre: 'Camila', apellido: 'Bustos', tipoContrato: 'POR_HORAS',
    departamento: 'Desarrollo Sostenible', fechaInicioContrato: '2023-04-03',
    documento: '38771402', telefono: '+54 261 4902233', direccion: 'Rivadavia 77, Maipu',
    tarifaHora: 14500, rol: 'EMPLEADO',
  },
  {
    nombre: 'Federico', apellido: 'Aguirre', tipoContrato: 'POR_HORAS',
    departamento: 'Operaciones', fechaInicioContrato: '2023-08-21',
    documento: '39120558', telefono: '+54 261 4118844', direccion: 'Las Heras 1502, Guaymallen',
    tarifaHora: 12800,
  },
  {
    nombre: 'Sofia', apellido: 'Miranda', tipoContrato: 'CONTRATISTA',
    departamento: 'Investigacion y Desarrollo', fechaInicioContrato: '2024-02-05',
    documento: '35608833', telefono: '+54 351 5221900', direccion: 'Independencia 45, Cordoba',
    tarifaHora: 21000, topeMensual: 2800000,
  },
  {
    nombre: 'Ignacio', apellido: 'Peralta', tipoContrato: 'CONTRATISTA',
    departamento: 'Desarrollo Sostenible', fechaInicioContrato: '2024-07-15',
    documento: '36901277', telefono: '+54 11 47882310', direccion: 'Av. Rivadavia 5600, CABA',
    tarifaHora: 24500, topeMensual: 3200000,
  },
  {
    nombre: 'Renata', apellido: 'Villalba', tipoContrato: 'ASALARIADO',
    departamento: 'Operaciones', fechaInicioContrato: '2022-11-07',
    documento: '34210996', telefono: '+54 261 4553311', direccion: 'Mitre 330, Lujan de Cuyo',
    salarioMensual: 2050000,
  },
  {
    nombre: 'Tomas', apellido: 'Ledesma', tipoContrato: 'POR_HORAS',
    departamento: 'Ventas', fechaInicioContrato: '2025-01-13',
    documento: '41556200', telefono: '+54 261 4009911', direccion: 'San Lorenzo 12, Ciudad',
    tarifaHora: 11200,
  },
];

const PROYECTOS: {
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFinEstimada: string | null;
  estado: 'PLANIFICADO' | 'EN_CURSO' | 'PAUSADO' | 'FINALIZADO';
  departamento: string;
  presupuestoHoras: number;
}[] = [
  {
    nombre: 'Red de Paneles Solares Cuyo',
    descripcion: 'Instalacion de 4 parques solares comunitarios en Mendoza y San Juan.',
    fechaInicio: '2026-02-02', fechaFinEstimada: '2026-12-18', estado: 'EN_CURSO',
    departamento: 'Desarrollo Sostenible', presupuestoHoras: 3200,
  },
  {
    nombre: 'Baterias de Flujo de Vanadio',
    descripcion: 'Investigacion de almacenamiento estacionario de larga duracion.',
    fechaInicio: '2026-01-15', fechaFinEstimada: '2027-06-30', estado: 'EN_CURSO',
    departamento: 'Investigacion y Desarrollo', presupuestoHoras: 4500,
  },
  {
    nombre: 'Plataforma de Telemetria EcoView',
    descripcion: 'Monitoreo remoto en tiempo real de las instalaciones desplegadas.',
    fechaInicio: '2026-03-10', fechaFinEstimada: '2026-11-30', estado: 'EN_CURSO',
    departamento: 'Desarrollo Sostenible', presupuestoHoras: 2600,
  },
  {
    nombre: 'Certificacion ISO 14001',
    descripcion: 'Adecuacion del sistema de gestion ambiental para la certificacion.',
    fechaInicio: '2026-05-04', fechaFinEstimada: '2026-10-30', estado: 'PLANIFICADO',
    departamento: 'Operaciones', presupuestoHoras: 800,
  },
  {
    nombre: 'Licitacion Parque Eolico Patagonia',
    descripcion: 'Preparacion de la oferta tecnica y economica para la licitacion nacional.',
    fechaInicio: '2026-04-01', fechaFinEstimada: '2026-09-15', estado: 'PAUSADO',
    departamento: 'Ventas', presupuestoHoras: 600,
  },
  {
    nombre: 'Auditoria Energetica Bodegas',
    descripcion: 'Relevamiento de consumo y plan de eficiencia para 12 bodegas.',
    fechaInicio: '2025-08-01', fechaFinEstimada: '2026-01-31', estado: 'FINALIZADO',
    departamento: 'Operaciones', presupuestoHoras: 950,
  },
];

const TAREAS_EJEMPLO = [
  'Relevamiento en sitio y toma de mediciones de consumo',
  'Ajuste del modelo de simulacion de generacion fotovoltaica',
  'Reunion de seguimiento con el equipo de instalacion',
  'Documentacion tecnica del modulo de telemetria',
  'Pruebas de integracion con el sistema de monitoreo',
  'Analisis de resultados del ensayo de celdas',
  'Preparacion del informe mensual para el cliente',
  'Revision del pliego y armado de la oferta economica',
  'Mantenimiento preventivo de inversores',
  'Capacitacion al personal operativo del cliente',
];

/**
 * Siembra el sistema en el primer arranque.
 *
 * Se ejecuta de forma perezosa en la primera peticion en lugar de por un script
 * aparte: en Cloudflare Workers no hay un "post-deploy" donde correr migraciones,
 * y obligar a un paso manual haria que un despliegue limpio quedara sin usuario
 * con el que entrar.
 *
 * Es **idempotente**: una marca en KV impide que se repita. Comprobarla cuesta
 * una lectura por peticion, que se sirve de la cache del isolate.
 */
export class Semilla {
  constructor(private readonly ctx: Contexto) {}

  async yaSembrado(): Promise<boolean> {
    return (await this.ctx.almacen.leer<{ hecho: boolean }>(CLAVE_MARCA))?.hecho === true;
  }

  /** Ejecuta la siembra si hace falta. Devuelve `true` si sembro ahora. */
  async ejecutarSiHaceFalta(): Promise<boolean> {
    if (await this.yaSembrado()) return false;
    await this.sembrar();
    await this.ctx.almacen.escribir(CLAVE_MARCA, {
      hecho: true,
      fecha: new Date().toISOString(),
    });
    return true;
  }

  private async sembrar(): Promise<void> {
    const hoy = new Date();
    const cripto = this.ctx.cripto;

    // --- Departamentos ----------------------------------------------------
    const departamentosPorNombre = new Map<string, Departamento>();
    for (const plantilla of DEPARTAMENTOS) {
      const ahora = new Date().toISOString();
      const departamento = new Departamento({
        id: nuevoId(),
        creadoEn: ahora,
        actualizadoEn: ahora,
        nombre: plantilla.nombre,
        nombreNormalizado: Departamento.normalizarNombre(plantilla.nombre),
        descripcion: plantilla.descripcion,
        gerenteId: null,
        activo: true,
      });
      departamentosPorNombre.set(plantilla.nombre, departamento);
    }

    // --- Empleados --------------------------------------------------------
    const empleados: Empleado[] = [];
    let correlativoLegajo = 0;
    for (const plantilla of EMPLEADOS) {
      correlativoLegajo += 1;
      const departamento = departamentosPorNombre.get(plantilla.departamento);
      const emailCorporativo = Semilla.emailCorporativo(plantilla.nombre, plantilla.apellido);
      const emailPersonal = Semilla.emailPersonal(plantilla.nombre, plantilla.apellido);

      const sobre = await cripto.cifrarObjeto({
        documento: plantilla.documento,
        telefono: plantilla.telefono,
        direccion: plantilla.direccion,
        emailPersonal,
      });

      const empleado = FabricaEmpleados.crear({
        id: nuevoId(),
        legajo: formatearLegajo(correlativoLegajo),
        nombre: plantilla.nombre,
        apellido: plantilla.apellido,
        emailCorporativo,
        datosSensibles: sobre,
        indiceDocumento: await cripto.indiceCiego(plantilla.documento),
        indiceEmailPersonal: await cripto.indiceCiego(emailPersonal),
        tipoContrato: plantilla.tipoContrato,
        fechaInicioContrato: plantilla.fechaInicioContrato,
        departamentoId: departamento?.id ?? null,
        activo: true,
        salarioMensual: plantilla.salarioMensual ?? null,
        tarifaHora: plantilla.tarifaHora ?? null,
        topeMensual: plantilla.topeMensual ?? null,
      });
      empleados.push(empleado);
    }
    await this.ctx.almacen.escribir('contador:legajo', { valor: correlativoLegajo });

    // Gerencias: cada gerente dirige su propio departamento.
    const martin = empleados.find((e) => e.apellido === 'Quiroga');
    const lucia = empleados.find((e) => e.apellido === 'Ferreyra');
    const valeria = empleados.find((e) => e.apellido === 'Sandoval');
    const renata = empleados.find((e) => e.apellido === 'Villalba');
    const diego = empleados.find((e) => e.apellido === 'Alcaraz');
    departamentosPorNombre.get('Desarrollo Sostenible')?.designarGerente(martin?.id ?? null);
    departamentosPorNombre.get('Investigacion y Desarrollo')?.designarGerente(lucia?.id ?? null);
    departamentosPorNombre.get('Recursos Humanos')?.designarGerente(valeria?.id ?? null);
    departamentosPorNombre.get('Operaciones')?.designarGerente(renata?.id ?? null);
    departamentosPorNombre.get('Ventas')?.designarGerente(diego?.id ?? null);

    // --- Proyectos --------------------------------------------------------
    const proyectos: Proyecto[] = [];
    let correlativoProyecto = 0;
    for (const plantilla of PROYECTOS) {
      correlativoProyecto += 1;
      const ahora = new Date().toISOString();
      const proyecto = new Proyecto({
        id: nuevoId(),
        creadoEn: ahora,
        actualizadoEn: ahora,
        codigo: formatearCodigoProyecto(correlativoProyecto),
        nombre: plantilla.nombre,
        descripcion: plantilla.descripcion,
        fechaInicio: plantilla.fechaInicio,
        fechaFinEstimada: plantilla.fechaFinEstimada,
        // Se persiste el estado final directamente: pasar por `cambiarEstado`
        // exigiria recorrer la maquina de estados paso a paso solo para sembrar.
        estado: plantilla.estado,
        departamentoId: departamentosPorNombre.get(plantilla.departamento)?.id ?? null,
        presupuestoHoras: plantilla.presupuestoHoras,
      });
      proyectos.push(proyecto);
    }
    await this.ctx.almacen.escribir('contador:proyecto', { valor: correlativoProyecto });

    // --- Asignaciones -----------------------------------------------------
    const asignaciones: AsignacionProyecto[] = [];
    const rolesDisponibles: RolProyecto[] = [
      'LIDER_TECNICO', 'DESARROLLADOR', 'ANALISTA', 'DISENADOR', 'QA', 'CONSULTOR',
    ];
    const proyectosAbiertos = proyectos.filter((p) => p.estaAbierto());

    empleados.forEach((empleado, indice) => {
      // Cada empleado participa en 1 o 2 proyectos, repartiendo su dedicacion
      // para no violar el tope del 100 % que valida ServicioAsignaciones.
      const cantidad = indice % 3 === 0 ? 2 : 1;
      for (let k = 0; k < cantidad; k++) {
        const proyecto = proyectosAbiertos[(indice + k) % proyectosAbiertos.length];
        if (!proyecto) continue;
        if (asignaciones.some((a) => a.empleadoId === empleado.id && a.proyectoId === proyecto.id)) {
          continue;
        }
        const ahora = new Date().toISOString();
        asignaciones.push(
          new AsignacionProyecto({
            id: nuevoId(),
            creadoEn: ahora,
            actualizadoEn: ahora,
            empleadoId: empleado.id,
            proyectoId: proyecto.id,
            rolProyecto: rolesDisponibles[(indice + k) % rolesDisponibles.length] ?? 'DESARROLLADOR',
            porcentajeDedicacion: cantidad === 2 ? 50 : 100,
            fechaAsignacion: proyecto.fechaInicio,
            fechaDesasignacion: null,
          }),
        );
      }
    });

    // --- Registros de tiempo (ultimas 6 semanas) --------------------------
    const registros: RegistroTiempo[] = [];
    const proyectosConCarga = proyectos.filter((p) => p.admiteCargaDeHoras());
    let semilla = 7;
    const pseudoAleatorio = (): number => {
      // Generador determinista: la demo debe verse igual en cada despliegue.
      semilla = (semilla * 1103515245 + 12345) % 2147483648;
      return semilla / 2147483648;
    };

    for (let diasAtras = 42; diasAtras >= 1; diasAtras--) {
      const fecha = new Date(hoy.getTime() - diasAtras * 86_400_000);
      const diaSemana = fecha.getUTCDay();
      if (diaSemana === 0 || diaSemana === 6) continue; // sin fines de semana
      const fechaIso = fecha.toISOString().slice(0, 10);

      for (const asignacion of asignaciones) {
        if (pseudoAleatorio() > 0.55) continue;
        const proyecto = proyectosConCarga.find((p) => p.id === asignacion.proyectoId);
        if (!proyecto) continue;
        if (fechaIso < asignacion.fechaAsignacion) continue;

        const horas = Math.round((3 + pseudoAleatorio() * 5) * 4) / 4;
        const tarea = TAREAS_EJEMPLO[Math.floor(pseudoAleatorio() * TAREAS_EJEMPLO.length)];
        const ahora = new Date().toISOString();
        // Lo antiguo queda aprobado; la ultima semana, pendiente de revision,
        // para que el panel muestre trabajo real esperando aprobacion.
        const aprobado = diasAtras > 7;
        registros.push(
          new RegistroTiempo({
            id: nuevoId(),
            creadoEn: ahora,
            actualizadoEn: ahora,
            empleadoId: asignacion.empleadoId,
            proyectoId: asignacion.proyectoId,
            fecha: fechaIso,
            horas,
            descripcion: tarea ?? TAREAS_EJEMPLO[0] ?? 'Tarea de proyecto',
            estado: aprobado ? 'APROBADO' : 'ENVIADO',
            aprobadoPor: aprobado ? (martin?.id ?? null) : null,
            motivoRechazo: null,
          }),
        );
      }
    }

    // --- Usuarios ---------------------------------------------------------
    const claveAdmin = this.ctx.entorno.CLAVE_ADMIN_INICIAL?.trim() || CLAVE_ADMIN_POR_DEFECTO;
    const usuarios: Usuario[] = [];

    const cuentas: { empleado: Empleado | undefined; rol: Rol; email: string }[] = [
      { empleado: valeria, rol: 'ADMIN_RRHH', email: 'admin@ecotech.com' },
      { empleado: martin, rol: 'GERENTE', email: 'gerente@ecotech.com' },
      {
        empleado: empleados.find((e) => e.apellido === 'Bustos'),
        rol: 'EMPLEADO',
        email: 'empleado@ecotech.com',
      },
      { empleado: undefined, rol: 'AUDITOR', email: 'auditor@ecotech.com' },
    ];

    for (const cuenta of cuentas) {
      const { hash, sal } = await cripto.hashearContrasena(claveAdmin);
      const ahora = new Date().toISOString();
      usuarios.push(
        new Usuario({
          id: nuevoId(),
          creadoEn: ahora,
          actualizadoEn: ahora,
          email: cuenta.email,
          hashContrasena: hash,
          salContrasena: sal,
          rol: cuenta.rol,
          empleadoId: cuenta.empleado?.id ?? null,
          activo: true,
          // Obliga a rotar la clave publicada antes de operar.
          debeCambiarContrasena: true,
          ultimoAcceso: null,
          intentosFallidos: 0,
          bloqueadoHasta: null,
        }),
      );
    }

    // --- Persistencia (una escritura por coleccion) -----------------------
    await this.ctx.departamentos.guardarVarias([...departamentosPorNombre.values()]);
    await this.ctx.empleados.guardarVarias(empleados);
    await this.ctx.proyectos.guardarVarias(proyectos);
    await this.ctx.asignaciones.guardarVarias(asignaciones);
    await this.ctx.registrosTiempo.guardarVarias(registros);
    await this.ctx.usuarios.guardarVarias(usuarios);
  }

  private static quitarAcentos(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036F]/g, '');
  }

  private static emailCorporativo(nombre: string, apellido: string): string {
    const n = Semilla.quitarAcentos(nombre).toLowerCase();
    const a = Semilla.quitarAcentos(apellido).toLowerCase();
    return `${n.charAt(0)}.${a}@ecotech.com`;
  }

  private static emailPersonal(nombre: string, apellido: string): string {
    const n = Semilla.quitarAcentos(nombre).toLowerCase();
    const a = Semilla.quitarAcentos(apellido).toLowerCase();
    return `${n}.${a}@correo-personal.com`;
  }
}
