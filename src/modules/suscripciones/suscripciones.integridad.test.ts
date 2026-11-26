import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import { app } from '../../app';
import type { ApiResponse } from '../../types/api.types';
import { login } from '../auth/auth.service';
import type { Suscripcion } from './suscripciones.types';

/*
 * Integridad de datos en /suscripciones.
 * - La 1 tiene pagos y alertas en los mocks; la 30 no tiene ninguno.
 * - diego.lopez (id 4) está bloqueado y victoria.castro (id 15) dada de baja.
 */

let server: Server;
let baseUrl: string;
let admin: string;

before(async () => {
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', (error) => (error ? reject(error) : resolve()));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}/api/v1/suscripciones`;
  admin = (await login({ identifier: 'lucia.fernandez', password: 'AdminDemo123!' })).token;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
});

async function request<T = Suscripcion>(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      Authorization: `Bearer ${admin}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as ApiResponse<T> };
}

const nueva = {
  plataforma: 'Paramount+',
  plan: 'Básico',
  costo: 3000,
  moneda: 'ARS',
  frecuencia: 'mensual',
  fechaCobro: '2026-12-05',
  medioPagoId: 3,
  categoriaId: 1,
  usuarioId: 2,
};

test('no se puede borrar una suscripción con pagos o alertas (409)', async () => {
  const { status, body } = await request('/1', 'DELETE');
  assert.equal(status, 409);
  assert.equal((await request('/1')).status, 200);
  assert.ok(body.msg.includes('pagos o alertas'));
});

test('una suscripción sin pagos ni alertas se puede borrar', async () => {
  const alta = await request('', 'POST', nueva);
  assert.equal(alta.status, 201);
  assert.equal((await request(`/${alta.body.data.id}`, 'DELETE')).status, 200);
});

test('no se asigna una suscripción a un usuario bloqueado o dado de baja (400)', async () => {
  for (const usuarioId of [4, 15]) {
    const { status, body } = await request('', 'POST', { ...nueva, usuarioId });
    assert.equal(status, 400);
    assert.equal(body.msg, `El usuario ${usuarioId} no está activo`);
    assert.equal((await request('/1', 'PATCH', { usuarioId })).status, 400);
  }
});

test('editar otros campos de una suscripción de un usuario inactivo sigue funcionando', async () => {
  // La 4 es de diego.lopez (bloqueado): se edita solo el costo, sin cambiar el dueño.
  assert.equal((await request('/4', 'PATCH', { costo: 1234 })).status, 200);
});

test('plataforma y plan tienen un máximo de 100 caracteres', async () => {
  const largo = 'A'.repeat(101);
  assert.equal((await request('', 'POST', { ...nueva, plataforma: largo })).status, 400);
  assert.equal((await request('', 'POST', { ...nueva, plan: largo })).status, 400);
  assert.equal((await request('', 'POST', { ...nueva, plataforma: 'A'.repeat(100) })).status, 201);
});
