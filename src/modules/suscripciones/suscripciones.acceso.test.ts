import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import { app } from '../../app';
import type { ApiResponse } from '../../types/api.types';
import { login } from '../auth/auth.service';
import type { Suscripcion } from './suscripciones.types';

/*
 * Control de acceso por usuario en /suscripciones y /medios-pago/:id/suscripciones.
 * Datos del mock:
 * - martin.gomez (id 2, cliente): dueño de 1, 3 y 29; miembro del grupo 1 (ve también la 18).
 * - La 2 es de sofia (id 3) y está en el grupo 2, donde martin no es miembro.
 * - La 18 está en el grupo 1 pero su dueño es otro usuario.
 */

let server: Server;
let baseUrl: string;
let martin: string;
let admin: string;

before(async () => {
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', (error) => (error ? reject(error) : resolve()));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
  martin = (await login({ identifier: 'martin.gomez', password: 'ClienteDemo123!' })).token;
  admin = (await login({ identifier: 'lucia.fernandez', password: 'AdminDemo123!' })).token;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
});

async function request<T = Suscripcion>(
  token: string,
  path: string,
  method = 'GET',
  body?: unknown,
) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
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

test('el cliente lista solo lo propio y lo de su grupo, aunque mande ?usuarioId', async () => {
  for (const path of ['/suscripciones?limit=100', '/suscripciones?limit=100&usuarioId=3']) {
    const { status, body } = await request<Suscripcion[]>(martin, path);
    assert.equal(status, 200);
    assert.deepEqual(
      body.data.map((s) => s.id),
      [1, 3, 18, 29],
    );
    assert.equal(body.meta?.total, 4);
  }
});

test('el admin sigue viendo todas', async () => {
  const { status, body } = await request<Suscripcion[]>(admin, '/suscripciones?limit=1');
  assert.equal(status, 200);
  assert.equal(body.meta?.total, 30);
});

test('una suscripción ajena responde 404 igual que una inexistente', async () => {
  const ajena = await request(martin, '/suscripciones/2');
  const inexistente = await request(martin, '/suscripciones/999');
  assert.equal(ajena.status, 404);
  assert.deepEqual(ajena.body, inexistente.body);
  assert.equal((await request(admin, '/suscripciones/2')).status, 200);
});

test('modificar, cambiar estado o borrar una ajena responde 404', async () => {
  assert.equal((await request(martin, '/suscripciones/2', 'PATCH', { plan: 'X' })).status, 404);
  assert.equal(
    (await request(martin, '/suscripciones/2/estado', 'PATCH', { estado: 'pausada' })).status,
    404,
  );
  assert.equal((await request(martin, '/suscripciones/2', 'DELETE')).status, 404);
});

test('una suscripción del grupo se puede ver pero solo la modifica su dueño (403)', async () => {
  assert.equal((await request(martin, '/suscripciones/18')).status, 200);
  assert.equal((await request(martin, '/suscripciones/18', 'PATCH', { plan: 'X' })).status, 403);
});

test('crear a nombre de otro usuario o en un grupo ajeno responde 403', async () => {
  assert.equal(
    (await request(martin, '/suscripciones', 'POST', { ...nueva, usuarioId: 3 })).status,
    403,
  );
  assert.equal(
    (await request(martin, '/suscripciones', 'POST', { ...nueva, grupoId: 4 })).status,
    403,
  );
});

test('mover una propia a otro usuario o a un grupo ajeno responde 403', async () => {
  assert.equal((await request(martin, '/suscripciones/1', 'PATCH', { usuarioId: 3 })).status, 403);
  assert.equal((await request(martin, '/suscripciones/1', 'PATCH', { grupoId: 4 })).status, 403);
});

test('el cliente opera normalmente sobre lo propio', async () => {
  const alta = await request(martin, '/suscripciones', 'POST', { ...nueva, grupoId: 1 });
  assert.equal(alta.status, 201);
  const id = alta.body.data.id;
  assert.equal(
    (await request(martin, `/suscripciones/${id}`, 'PATCH', { costo: 3500 })).status,
    200,
  );
  assert.equal(
    (await request(martin, `/suscripciones/${id}/estado`, 'PATCH', { estado: 'pausada' })).status,
    200,
  );
  assert.equal((await request(martin, `/suscripciones/${id}`, 'DELETE')).status, 200);
});

test('las suscripciones de un medio de pago solo muestran las visibles', async () => {
  const cliente = await request<Suscripcion[]>(martin, '/medios-pago/3/suscripciones');
  assert.equal(cliente.status, 200);
  assert.equal(cliente.body.meta?.total, 0);
  const todas = await request<Suscripcion[]>(admin, '/medios-pago/3/suscripciones');
  assert.equal(todas.body.meta?.total, 6);
});
