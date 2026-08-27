import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { FabricaEmpleados } from '../src/dominio/fabricas/FabricaEmpleados.js';
import { EmpleadoAsalariado } from '../src/dominio/personas/EmpleadoAsalariado.js';
import { EmpleadoPorHoras } from '../src/dominio/personas/EmpleadoPorHoras.js';
import { Contratista } from '../src/dominio/personas/Contratista.js';
import { Empleado, type EstadoEmpleado } from '../src/dominio/personas/Empleado.js';
import { Departamento } from '../src/dominio/organizacion/Departamento.js';
import { Proyecto } from '../src/dominio/organizacion/Proyecto.js';
import { AsignacionProyecto } from '../src/dominio/organizacion/AsignacionProyecto.js';
import { RegistroTiempo } from '../src/dominio/tiempo/RegistroTiempo.js';
import { PoliticaAutorizacion } from '../src/dominio/seguridad/PoliticaAutorizacion.js';
import { ErrorReglaNegocio, ErrorValidacion } from '../src/dominio/base/errores.js';
import type { TipoContrato } from '../src/compartido/tipos.js';

const AHORA = '2026-08-27T00:00:00.000Z';
const SOBRE = { v: 1 as const, iv: 'AAAAAAAAAAAAAAAA', ct: 'AAAA' };

function estadoEmpleado(parcial: Partial<EstadoEmpleado> & { tipoContrato: TipoContrato }): EstadoEmpleado {
  return {
    id: crypto.randomUUID(),
    creadoEn: AHORA,
    actualizadoEn: AHORA,
    legajo: 'ECO-000001',
    nombre: 'Ana',
    apellido: 'Gomez',
    emailCorporativo: 'a.gomez@ecotech.com',
    datosSensibles: SOBRE,
    indiceDocumento: 'idx-doc',
    indiceEmailPersonal: 'idx-mail',
    fechaInicioContrato: '2024-01-15',
    departamentoId: null,
    activo: true,
    salarioMensual: null,
    tarifaHora: null,
    topeMensual: null,
    ...parcial,
  };
}

describe('Polimorfismo de la remuneración', () => {
  it('el asalariado cobra igual trabaje las horas que trabaje', () => {
    const empleado = new EmpleadoAsalariado(
      estadoEmpleado({ tipoContrato: 'ASALARIADO', salarioMensual: 2_000_000 }),
    );
    assert.equal(empleado.calcularRemuneracionMensual(0), 2_000_000);
    assert.equal(empleado.calcularRemuneracionMensual(300), 2_000_000);
  });

  it('el jornalizado paga las horas extra al 1,5x a partir de 160 h', () => {
    const empleado = new EmpleadoPorHoras(
      estadoEmpleado({ tipoContrato: 'POR_HORAS', tarifaHora: 10_000 }),
    );
    assert.equal(empleado.calcularRemuneracionMensual(100), 1_000_000);
    assert.equal(empleado.calcularRemuneracionMensual(160), 1_600_000);
    // 160 ordinarias + 20 extra a 15.000
    assert.equal(empleado.calcularRemuneracionMensual(180), 1_600_000 + 300_000);
  });

  it('el contratista nunca supera su tope mensual', () => {
    const empleado = new Contratista(
      estadoEmpleado({ tipoContrato: 'CONTRATISTA', tarifaHora: 20_000, topeMensual: 2_000_000 }),
    );
    assert.equal(empleado.calcularRemuneracionMensual(50), 1_000_000);
    assert.equal(empleado.calcularRemuneracionMensual(200), 2_000_000);
    assert.equal(empleado.alcanzoTope(200), true);
    assert.equal(empleado.alcanzoTope(50), false);
  });

  it('un mismo bucle liquida las tres modalidades sin preguntar el tipo', () => {
    // Este es el test que justifica la herencia: el "motor de nómina" no tiene
    // ni un `if` sobre el tipo de contrato.
    const plantilla: Empleado[] = [
      new EmpleadoAsalariado(estadoEmpleado({ tipoContrato: 'ASALARIADO', salarioMensual: 1_000_000 })),
      new EmpleadoPorHoras(estadoEmpleado({ tipoContrato: 'POR_HORAS', tarifaHora: 5_000 })),
      new Contratista(
        estadoEmpleado({ tipoContrato: 'CONTRATISTA', tarifaHora: 10_000, topeMensual: 900_000 }),
      ),
    ];
    const total = plantilla.reduce((suma, e) => suma + e.calcularRemuneracionMensual(100), 0);
    assert.equal(total, 1_000_000 + 500_000 + 900_000);
    assert.equal(new Set(plantilla.map((e) => e.descripcionRemuneracion())).size, 3);
  });
});

describe('FabricaEmpleados', () => {
  it('reconstruye la subclase correcta desde el estado persistido', () => {
    assert.ok(
      FabricaEmpleados.rehidratar(
        estadoEmpleado({ tipoContrato: 'ASALARIADO', salarioMensual: 1 }),
      ) instanceof EmpleadoAsalariado,
    );
    assert.ok(
      FabricaEmpleados.rehidratar(
        estadoEmpleado({ tipoContrato: 'POR_HORAS', tarifaHora: 1 }),
      ) instanceof EmpleadoPorHoras,
    );
    assert.ok(
      FabricaEmpleados.rehidratar(
        estadoEmpleado({ tipoContrato: 'CONTRATISTA', tarifaHora: 1, topeMensual: 2 }),
      ) instanceof Contratista,
    );
  });

  it('rechaza un tipo de contrato desconocido en vez de devolver algo a medias', () => {
    assert.throws(
      () =>
        FabricaEmpleados.rehidratar(
          estadoEmpleado({ tipoContrato: 'INVENTADO' as TipoContrato }),
        ),
      ErrorValidacion,
    );
  });

  it('un asalariado sin salario no llega a existir', () => {
    assert.throws(
      () => FabricaEmpleados.crear(estadoEmpleado({ tipoContrato: 'ASALARIADO' })),
      ErrorValidacion,
    );
  });
});

describe('Empleado: un solo departamento a la vez', () => {
  it('reasignar reemplaza, nunca acumula', () => {
    const empleado = FabricaEmpleados.crear(
      estadoEmpleado({ tipoContrato: 'ASALARIADO', salarioMensual: 100 }),
    );
    empleado.asignarADepartamento('dep-1');
    assert.equal(empleado.departamentoId, 'dep-1');
    empleado.asignarADepartamento('dep-2');
    assert.equal(empleado.departamentoId, 'dep-2');
  });

  it('la baja es lógica y desvincula del departamento', () => {
    const empleado = FabricaEmpleados.crear(
      estadoEmpleado({ tipoContrato: 'ASALARIADO', salarioMensual: 100, departamentoId: 'dep-1' }),
    );
    empleado.desactivar();
    assert.equal(empleado.activo, false);
    assert.equal(empleado.departamentoId, null);
    assert.throws(() => empleado.asignarADepartamento('dep-2'), ErrorReglaNegocio);
  });

  it('el DTO enmascara los datos sensibles cuando no llegan descifrados', () => {
    const empleado = FabricaEmpleados.crear(
      estadoEmpleado({ tipoContrato: 'ASALARIADO', salarioMensual: 999 }),
    );
    const oculto = empleado.aDTO(null);
    assert.equal(oculto.sensiblesEnmascarados, true);
    assert.equal(oculto.datosSensibles.documento, '********');
    // La remuneración también se oculta: es un dato sensible más.
    assert.equal(oculto.salarioMensual, null);

    const visible = empleado.aDTO({
      documento: '12345678',
      telefono: '+54 11 5555',
      direccion: 'Calle 1',
      emailPersonal: 'a@b.com',
    });
    assert.equal(visible.sensiblesEnmascarados, false);
    assert.equal(visible.salarioMensual, 999);
  });
});

describe('Departamento', () => {
  const nuevo = (nombre: string): Departamento =>
    new Departamento({
      id: crypto.randomUUID(),
      creadoEn: AHORA,
      actualizadoEn: AHORA,
      nombre,
      nombreNormalizado: Departamento.normalizarNombre(nombre),
      descripcion: '',
      gerenteId: null,
      activo: true,
    });

  it('normaliza el nombre para detectar duplicados', () => {
    assert.equal(Departamento.normalizarNombre('  Recursos   Humanos '), 'recursos humanos');
    assert.equal(nuevo('Recursos Humanos').nombreNormalizado, nuevo('recursos humanos').nombreNormalizado);
  });

  it('libera la gerencia solo si el empleado indicado era el gerente', () => {
    const departamento = nuevo('Ventas');
    departamento.designarGerente('emp-1');
    assert.equal(departamento.liberarSiEsGerente('emp-2'), false);
    assert.equal(departamento.gerenteId, 'emp-1');
    assert.equal(departamento.liberarSiEsGerente('emp-1'), true);
    assert.equal(departamento.gerenteId, null);
  });

  it('rechaza nombres demasiado cortos', () => {
    assert.throws(() => nuevo('RH').validar(), ErrorValidacion);
  });
});

describe('Proyecto: máquina de estados', () => {
  const nuevo = (estado: Proyecto['estado'] = 'PLANIFICADO'): Proyecto =>
    new Proyecto({
      id: crypto.randomUUID(),
      creadoEn: AHORA,
      actualizadoEn: AHORA,
      codigo: 'PRY-0001',
      nombre: 'Parque solar',
      descripcion: '',
      fechaInicio: '2026-01-01',
      fechaFinEstimada: '2026-12-31',
      estado,
      departamentoId: null,
      presupuestoHoras: 1000,
    });

  it('permite las transiciones legitimas', () => {
    const proyecto = nuevo('PLANIFICADO');
    proyecto.cambiarEstado('EN_CURSO');
    proyecto.cambiarEstado('PAUSADO');
    proyecto.cambiarEstado('EN_CURSO');
    proyecto.cambiarEstado('FINALIZADO');
    assert.equal(proyecto.estado, 'FINALIZADO');
  });

  it('bloquea los saltos ilegitimos', () => {
    assert.throws(() => nuevo('PLANIFICADO').cambiarEstado('FINALIZADO'), ErrorReglaNegocio);
    assert.throws(() => nuevo('FINALIZADO').cambiarEstado('EN_CURSO'), ErrorReglaNegocio);
    assert.throws(() => nuevo('CANCELADO').cambiarEstado('EN_CURSO'), ErrorReglaNegocio);
  });

  it('solo admite carga de horas mientras esta EN_CURSO', () => {
    assert.equal(nuevo('EN_CURSO').admiteCargaDeHoras(), true);
    assert.equal(nuevo('PAUSADO').admiteCargaDeHoras(), false);
    assert.equal(nuevo('PLANIFICADO').admiteCargaDeHoras(), false);
  });

  it('detecta el exceso de presupuesto', () => {
    const proyecto = nuevo('EN_CURSO');
    assert.equal(proyecto.porcentajeConsumido(500), 50);
    assert.equal(proyecto.excedePresupuesto(1001), true);
    assert.equal(proyecto.excedePresupuesto(999), false);
  });

  it('rechaza una fecha de fin anterior al inicio', () => {
    const proyecto = nuevo();
    assert.throws(() => proyecto.actualizarDatos({ fechaFinEstimada: '2025-01-01' }), ErrorValidacion);
  });
});

describe('AsignacionProyecto como clase de asociación', () => {
  const nueva = (desde = '2026-01-01', hasta: string | null = null): AsignacionProyecto =>
    new AsignacionProyecto({
      id: crypto.randomUUID(),
      creadoEn: AHORA,
      actualizadoEn: AHORA,
      empleadoId: 'emp-1',
      proyectoId: 'pry-1',
      rolProyecto: 'DESARROLLADOR',
      porcentajeDedicacion: 50,
      fechaAsignacion: desde,
      fechaDesasignacion: hasta,
    });

  it('la vigencia depende del rango, no de un booleano suelto', () => {
    const asignacion = nueva('2026-03-01');
    assert.equal(asignacion.estabaVigenteEn('2026-02-28'), false);
    assert.equal(asignacion.estabaVigenteEn('2026-03-01'), true);
    assert.equal(asignacion.estabaVigenteEn('2030-01-01'), true);

    asignacion.desasignar('2026-06-30');
    assert.equal(asignacion.activa, false);
    assert.equal(asignacion.estabaVigenteEn('2026-06-30'), true);
    assert.equal(asignacion.estabaVigenteEn('2026-07-01'), false);
  });

  it('desasignar preserva el histórico en vez de borrar', () => {
    const asignacion = nueva();
    asignacion.desasignar('2026-05-01');
    assert.equal(asignacion.fechaDesasignacion, '2026-05-01');
    assert.throws(() => asignacion.desasignar('2026-06-01'), ErrorReglaNegocio);
  });

  it('no se puede cerrar antes de haber empezado', () => {
    assert.throws(() => nueva('2026-05-01').desasignar('2026-01-01'), ErrorReglaNegocio);
  });

  it('una asignación cerrada ya no se modifica', () => {
    const asignacion = nueva();
    asignacion.desasignar('2026-05-01');
    assert.throws(() => asignacion.cambiarRol('QA'), ErrorReglaNegocio);
  });
});

describe('RegistroTiempo: circuito de aprobación', () => {
  const ayer = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  const nuevo = (estado: RegistroTiempo['estado'] = 'BORRADOR'): RegistroTiempo =>
    new RegistroTiempo({
      id: crypto.randomUUID(),
      creadoEn: AHORA,
      actualizadoEn: AHORA,
      empleadoId: 'emp-1',
      proyectoId: 'pry-1',
      fecha: ayer,
      horas: 8,
      descripcion: 'Relevamiento en sitio y mediciones',
      estado,
      aprobadoPor: null,
      motivoRechazo: null,
    });

  it('recorre borrador -> enviado -> aprobado', () => {
    const registro = nuevo();
    registro.enviar();
    assert.equal(registro.estado, 'ENVIADO');
    registro.aprobar('jefe-1');
    assert.equal(registro.estado, 'APROBADO');
    assert.equal(registro.computaParaNomina(), true);
  });

  it('nadie aprueba sus propias horas', () => {
    const registro = nuevo('ENVIADO');
    assert.throws(() => registro.aprobar('emp-1'), ErrorReglaNegocio);
  });

  it('el rechazo exige un motivo y devuelve el registro al empleado', () => {
    const registro = nuevo('ENVIADO');
    assert.throws(() => registro.rechazar('jefe-1', 'no'), ErrorValidacion);
    registro.rechazar('jefe-1', 'La descripción no identifica la tarea');
    assert.equal(registro.estado, 'RECHAZADO');
    assert.equal(registro.puedeEditarlo(), true);

    registro.editar({ horas: 6 });
    assert.equal(registro.estado, 'BORRADOR');
    assert.equal(registro.motivoRechazo, null);
  });

  it('un registro aprobado no se edita sin rechazarlo antes', () => {
    const registro = nuevo('APROBADO');
    assert.equal(registro.puedeEditarlo(), false);
    assert.throws(() => registro.editar({ horas: 1 }), ErrorReglaNegocio);
  });

  it('no se cargan horas en el futuro', () => {
    const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const registro = nuevo();
    assert.throws(() => registro.editar({ fecha: manana }), ErrorValidacion);
  });

  it('acota las horas de un mismo parte', () => {
    const registro = nuevo();
    assert.throws(() => registro.editar({ horas: 24 }), ErrorValidacion);
    assert.throws(() => registro.editar({ horas: 0 }), ErrorValidacion);
  });

  it('exige una descripción útil de la tarea', () => {
    const registro = nuevo();
    assert.throws(() => registro.editar({ descripcion: 'varios' }), ErrorValidacion);
  });
});

describe('Politicaautorización (RBAC)', () => {
  it('deniega por defecto: el empleado no gestiona personas', () => {
    assert.equal(PoliticaAutorizacion.puede('EMPLEADO', 'empleado:crear'), false);
    assert.equal(PoliticaAutorizacion.puede('EMPLEADO', 'empleado:leer_sensible'), false);
    assert.equal(PoliticaAutorizacion.puede('EMPLEADO', 'tiempo:leer_todos'), false);
    assert.equal(PoliticaAutorizacion.puede('EMPLEADO', 'tiempo:registrar'), true);
  });

  it('el auditor lo ve todo y no escribe nada', () => {
    const permisos = PoliticaAutorizacion.permisosDe('AUDITOR');
    assert.ok(permisos.includes('auditoria:leer'));
    assert.equal(permisos.some((p) => /:(crear|editar|eliminar|gestionar|registrar|aprobar)$/.test(p)), false);
  });

  it('la gerencia aprueba horas pero no ve datos personales ni nómina', () => {
    assert.equal(PoliticaAutorizacion.puede('GERENTE', 'tiempo:aprobar'), true);
    assert.equal(PoliticaAutorizacion.puede('GERENTE', 'empleado:leer_sensible'), false);
    assert.equal(PoliticaAutorizacion.puede('GERENTE', 'reporte:nomina'), false);
  });

  it('RRHH no aprueba horas de proyectos ajenos', () => {
    assert.equal(PoliticaAutorizacion.puede('ADMIN_RRHH', 'empleado:leer_sensible'), true);
    assert.equal(PoliticaAutorizacion.puede('ADMIN_RRHH', 'tiempo:aprobar'), false);
  });

  it('exigir corta el flujo con 403', () => {
    assert.throws(() => PoliticaAutorizacion.exigir('EMPLEADO', 'usuario:gestionar'), {
      name: 'ErrorAutorizacion',
    });
  });

  it('la matriz devuelta es una copia: no se puede mutar la política', () => {
    const permisos = PoliticaAutorizacion.permisosDe('EMPLEADO');
    permisos.push('usuario:gestionar');
    assert.equal(PoliticaAutorizacion.puede('EMPLEADO', 'usuario:gestionar'), false);
  });
});
