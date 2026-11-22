import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import { app } from '../../app';
import type { ApiResponse } from '../../types/api.types';
import { listQuery } from '../../utils/listQuery';
import * as usuarios from '../usuarios/usuarios.service';
import { calculateMetricas, configureMetricasSources, getMetricas } from './metricas.service';
import type { Metricas, SuscripcionMetricas, UsuarioMetricas } from './metricas.types';

let server: Server;
let baseUrl: string;

before(async () => {
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}/api/v1/admin/metricas`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
});

test('Métricas: cálculos e integración mediante services', async (t) => {
  await t.test('Ruta exacta y 503 explícito hasta conectar dependencias', async () => {
    const response = await fetch(baseUrl);
    assert.equal(response.status, 503);
    const body = (await response.json()) as ApiResponse<null>;
    assert.equal(body.code, 503);
    assert.equal(body.data, null);
    assert.match(body.msg, /pendientes de integrar/);
    assert.equal((await fetch(baseUrl + '/metricas')).status, 404);
  });

  await t.test('Conversión monetaria, frecuencias y exclusión de inactivas', () => {
    const clientes: UsuarioMetricas[] = [1, 2, 3].map((id) => ({
      id,
      rol: 'cliente',
      estado: 'activo',
    }));
    const data: SuscripcionMetricas[] = [
      {
        id: 1,
        usuarioId: 1,
        plataforma: 'Netflix',
        costo: 1200,
        moneda: 'ARS',
        frecuencia: 'mensual',
        estado: 'activa',
      },
      {
        id: 2,
        usuarioId: 2,
        plataforma: ' netflix ',
        costo: 3,
        moneda: 'USD',
        frecuencia: 'trimestral',
        estado: 'activa',
      },
      {
        id: 3,
        usuarioId: 3,
        plataforma: 'Spotify',
        costo: 12,
        moneda: 'USD',
        frecuencia: 'anual',
        estado: 'activa',
      },
      {
        id: 4,
        usuarioId: 1,
        plataforma: 'Pausada',
        costo: 99999,
        moneda: 'ARS',
        frecuencia: 'mensual',
        estado: 'pausada',
      },
      {
        id: 5,
        usuarioId: 2,
        plataforma: 'Cancelada',
        costo: 99999,
        moneda: 'USD',
        frecuencia: 'mensual',
        estado: 'cancelada',
      },
    ];
    const result = calculateMetricas(clientes, [{ id: 1 }], data);
    assert.equal(result.gastoPromedioPorUsuario, 1200);
    assert.equal(result.suscripcionesActivas, 3);
    assert.equal(result.totalGrupos, 1);
    assert.equal(result.monedaReferencia, 'ARS');
    assert.equal(result.periodo, 'mensual');
    assert.deepEqual(result.plataformasMasContratadas, [
      { nombre: 'Netflix', cantidad: 2 },
      { nombre: 'Spotify', cantidad: 1 },
    ]);
    assert.equal(calculateMetricas([], [], data).gastoPromedioPorUsuario, 0);
    assert.deepEqual(calculateMetricas([], [], []).plataformasMasContratadas, []);
    assert.equal(
      calculateMetricas(clientes, [], [{ ...data[0], costo: 100 }]).gastoPromedioPorUsuario,
      33.33,
    );
    assert.throws(() => calculateMetricas(clientes, [], data, 0));
    assert.throws(() => calculateMetricas(clientes, [], [{ ...data[0], costo: -1 }]));
  });

  await t.test('Roles, estados, clientes sin gasto y ranking global con desempate', () => {
    const cuentas: UsuarioMetricas[] = [
      { id: 1, rol: 'admin', estado: 'activo' },
      { id: 2, rol: 'cliente', estado: 'activo' },
      { id: 3, rol: 'cliente', estado: 'bloqueado' },
      { id: 4, rol: 'cliente', estado: 'activo' },
      { id: 5, rol: 'cliente', estado: 'inactivo' },
      { id: 6, rol: 'admin', estado: 'bloqueado' },
      { id: 7, rol: 'admin', estado: 'inactivo' },
    ];
    const suscripciones = [1, 2, 3, 5, 99].map((usuarioId, index): SuscripcionMetricas => ({
      id: index + 1,
      usuarioId,
      plataforma:
        index === 0 ? 'Spotify' : index === 1 ? ' netflix ' : index === 2 ? 'Netflix' : 'Spotify',
      costo: 900,
      moneda: 'ARS',
      frecuencia: 'mensual',
      estado: 'activa',
    }));
    const result = calculateMetricas(cuentas, [], suscripciones);
    assert.equal(result.totalUsuarios, 5);
    assert.equal(result.gastoPromedioPorUsuario, 600);
    assert.equal(result.suscripcionesActivas, 5);
    assert.deepEqual(result.plataformasMasContratadas, [
      { nombre: 'Spotify', cantidad: 3 },
      { nombre: 'netflix', cantidad: 2 },
    ]);
    const tie = calculateMetricas(cuentas, [], suscripciones.slice(0, 2));
    assert.deepEqual(
      tie.plataformasMasContratadas.map((item) => item.nombre),
      ['netflix', 'Spotify'],
    );
    assert.equal(
      calculateMetricas(cuentas.slice(0, 1), [], suscripciones).gastoPromedioPorUsuario,
      0,
    );
    assert.equal(calculateMetricas(cuentas, [], []).gastoPromedioPorUsuario, 0);
    assert.ok(!('usuarioId' in result));
  });

  await t.test('Más de 100 registros y agregados actualizados desde Usuarios', async () => {
    const grupos = Array.from({ length: 103 }, (_, index) => ({ id: index + 1 }));
    const suscripciones: SuscripcionMetricas[] = Array.from({ length: 105 }, (_, index) => ({
      id: index + 1,
      usuarioId: 2,
      plataforma: 'Netflix',
      costo: 1200,
      moneda: 'ARS',
      frecuencia: 'mensual',
      estado: 'activa',
    }));
    const pages: string[] = [];
    configureMetricasSources({
      listGrupos: async (query) => listQuery(grupos, query, { defaultSortBy: 'id' }),
      listSuscripciones: (query) => {
        pages.push(String(query.page));
        return listQuery(suscripciones, query, { defaultSortBy: 'id' });
      },
    });
    const response = await fetch(baseUrl);
    assert.equal(response.status, 200);
    const body = (await response.json()) as ApiResponse<Metricas>;
    assert.equal(body.data.totalUsuarios, 14);
    assert.equal(body.data.totalGrupos, 103);
    assert.equal(body.data.suscripcionesActivas, 105);
    assert.equal(body.data.gastoPromedioPorUsuario, 9692.31);
    assert.deepEqual(pages, ['1', '2']);
    assert.ok(!JSON.stringify(body).includes('email'));
    assert.ok(!JSON.stringify(body).includes('passwordHash'));
    assert.ok(!JSON.stringify(body).includes('usuarioId'));
    assert.ok(!('meta' in body));
    const usuario = await usuarios.create({
      nombre: 'Prueba',
      apellido: 'Métricas',
      username: 'prueba.metricas',
      email: 'metricas@streamfamily.example',
      password: 'PruebaMetricas123!',
    });
    const updated = await getMetricas();
    assert.equal(updated.totalUsuarios, 15);
    assert.equal(updated.gastoPromedioPorUsuario, 9000);
    usuarios.update(usuario.id, { rol: 'admin' });
    assert.equal((await getMetricas()).gastoPromedioPorUsuario, 9692.31);
    usuarios.remove(usuario.id);
    assert.equal((await getMetricas()).totalUsuarios, 14);
    usuarios.changeState(2, { estado: 'bloqueado' });
    assert.equal((await getMetricas()).gastoPromedioPorUsuario, 9692.31);
    usuarios.remove(2);
    const sinTitularVigente = await getMetricas();
    assert.equal(sinTitularVigente.totalUsuarios, 13);
    assert.equal(sinTitularVigente.gastoPromedioPorUsuario, 0);
    assert.equal(sinTitularVigente.suscripcionesActivas, 105);
  });

  await t.test('No publica totales parciales si el proveedor falla o repite páginas', async () => {
    configureMetricasSources({
      listGrupos: () => {
        throw new Error('Origen no disponible');
      },
      listSuscripciones: () => listQuery([], {}),
    });
    await assert.rejects(getMetricas(), /Origen no disponible/);
    configureMetricasSources({
      listGrupos: (query) => ({
        data: [{ id: 1 }],
        meta: { page: Number(query.page), limit: 1, total: 2, totalPages: 2 },
      }),
      listSuscripciones: () => listQuery([], {}),
    });
    await assert.rejects(getMetricas(), /duplicados/);
  });
});
