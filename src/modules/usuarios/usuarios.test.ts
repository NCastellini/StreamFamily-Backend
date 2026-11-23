import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import { app } from '../../app';
import type { ApiResponse, PaginationMeta } from '../../types/api.types';
import { login } from '../auth/auth.service';
import { verifyCredentials } from './usuarios.service';
import type { UsuarioPublico } from './usuarios.types';

let server: Server;
let baseUrl: string;
let adminToken: string;
let clientToken: string;

before(async () => {
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}/api/v1/usuarios`;
  adminToken = (await login({ identifier: 'lucia.fernandez', password: 'AdminDemo123!' })).token;
  clientToken = (await login({ identifier: 'martin.gomez', password: 'ClienteDemo123!' })).token;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
});

async function request<T = UsuarioPublico>(
  path = '',
  method = 'GET',
  body?: unknown,
): Promise<{ status: number; body: ApiResponse<T> }> {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      Authorization: `Bearer ${adminToken}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json()) as ApiResponse<T>;
  assert.equal(data.code, response.status);
  assert.ok(!JSON.stringify(data).includes('passwordHash'));
  assert.ok(!JSON.stringify(data).includes('"password":'));
  return { status: response.status, body: data };
}

test('Usuarios: contrato, CRUD, filtros y credenciales', async (t) => {
  await t.test('Todas las rutas exigen JWT y rol administrador', async () => {
    const routes = [
      ['', 'GET'],
      ['/1', 'GET'],
      ['', 'POST'],
      ['/1', 'PUT'],
      ['/1', 'PATCH'],
      ['/1/estado', 'PATCH'],
      ['/1/reset-password', 'POST'],
      ['/1', 'DELETE'],
    ];
    for (const [path, method] of routes) {
      assert.equal((await fetch(baseUrl + path, { method })).status, 401);
      const denied = await fetch(baseUrl + path, {
        method,
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      assert.equal(denied.status, 403);
    }
    assert.equal(
      (
        await fetch(baseUrl, {
          headers: { Authorization: 'Bearer token-invalido' },
        })
      ).status,
      401,
    );
  });
  await t.test('15 usuarios completos sin hashes; paginado, orden y límite', async () => {
    const result = await request<UsuarioPublico[]>('?page=2&limit=5&sortBy=id&order=desc');
    assert.equal(result.status, 200);
    assert.deepEqual(
      result.body.data.map((item) => item.id),
      [10, 9, 8, 7, 6],
    );
    assert.deepEqual(result.body.meta, { page: 2, limit: 5, total: 15, totalPages: 3 });
    const all = await request<UsuarioPublico[]>('?limit=1000');
    assert.equal(all.body.data.length, 15);
    assert.equal(all.body.meta?.limit, 100);
    assert.equal(all.body.data[0].rol, 'admin');
    assert.ok(all.body.data.slice(1).every((item) => item.rol === 'cliente'));
    assert.ok(all.body.data.every((item) => item.username && item.creadoEn));
    assert.equal(all.body.data[14].estado, 'inactivo');
    const inactive = await request<UsuarioPublico[]>('?estado=inactivo');
    assert.deepEqual(
      inactive.body.data.map((item) => item.id),
      [15],
    );
    const filtered = await request<UsuarioPublico[]>('?rol=cliente&estado=bloqueado&q=DIEGO');
    assert.deepEqual(
      filtered.body.data.map((item) => item.id),
      [4],
    );
    const accents = await request<UsuarioPublico[]>('?q=fernandez');
    assert.deepEqual(
      accents.body.data.map((item) => item.id),
      [1],
    );
    const empty = await request<UsuarioPublico[]>('?page=500');
    assert.deepEqual(empty.body.data, []);
    assert.equal(empty.body.meta?.total, 15);
    const fallback = await request<UsuarioPublico[]>('?page=bad&limit=-1&sortBy=passwordHash');
    assert.equal(fallback.body.meta?.page, 1);
    assert.equal(fallback.body.meta?.limit, 10);
    assert.equal(fallback.body.data[0].id, 1);
  });

  await t.test('Credenciales bcrypt de demostración y rechazo de bloqueados', async () => {
    const admin = await verifyCredentials('LUCIA.FERNANDEZ', 'AdminDemo123!');
    assert.equal(admin?.id, 1);
    assert.ok(admin && !('passwordHash' in admin));
    assert.equal(
      (await verifyCredentials('martin.gomez@streamfamily.example', 'ClienteDemo123!'))?.id,
      2,
    );
    assert.equal(await verifyCredentials('diego.lopez', 'ClienteDemo123!'), null);
    assert.equal(await verifyCredentials('victoria.castro', 'ClienteDemo123!'), null);
    assert.equal(await verifyCredentials('lucia.fernandez', 'incorrecta'), null);
    assert.equal(await verifyCredentials('inexistente', 'ClienteDemo123!'), null);
  });

  const payload = {
    nombre: 'Ana',
    apellido: 'Pérez',
    email: 'ANA@streamfamily.example',
    username: 'ANA.PEREZ',
    password: 'PruebaPassword123!',
  };
  let id: number;

  await t.test('Alta, duplicados, hash y validación de cuerpos', async () => {
    for (const body of [
      null,
      [],
      {},
      { ...payload, password: 'corta' },
      { ...payload, password: 'á'.repeat(40) },
      { ...payload, passwordHash: 'injected' },
      { ...payload, estado: 'bloqueado' },
      { ...payload, estado: 'inactivo' },
    ]) {
      assert.equal((await request('', 'POST', body)).status, 400);
    }
    const created = await request('', 'POST', payload);
    assert.equal(created.status, 201);
    id = created.body.data.id;
    assert.equal(id, 16);
    assert.equal(created.body.data.email, 'ana@streamfamily.example');
    assert.equal(created.body.data.username, 'ana.perez');
    assert.equal(created.body.data.rol, 'cliente');
    assert.equal(created.body.data.estado, 'activo');
    assert.equal((await verifyCredentials('ana.perez', payload.password))?.id, id);
    assert.equal(
      (await request('', 'POST', { ...payload, username: 'otro.username' })).status,
      409,
    );
    assert.equal(
      (await request('', 'POST', { ...payload, email: 'otra@streamfamily.example' })).status,
      409,
    );
  });

  await t.test('PUT completo, PATCH parcial y errores sin cambios parciales', async () => {
    assert.equal((await request(`/${id}`, 'PUT', { nombre: 'Nueva' })).status, 400);
    assert.equal((await request(`/${id}`, 'PATCH', {})).status, 400);
    assert.equal(
      (await request(`/${id}`, 'PATCH', { nombre: 'No guardar', rol: 'superadmin' })).status,
      400,
    );
    assert.equal((await request(`/${id}`)).body.data.nombre, 'Ana');
    assert.equal(
      (await request(`/${id}`, 'PATCH', { email: 'lucia.fernandez@streamfamily.example' })).status,
      409,
    );
    assert.equal((await request(`/${id}`, 'PATCH', { estado: 'bloqueado' })).status, 400);
    const partial = await request(`/${id}`, 'PATCH', { apellido: 'García' });
    assert.equal(partial.status, 200);
    assert.equal(partial.body.data.nombre, 'Ana');
    assert.equal(partial.body.data.apellido, 'García');
    const full = await request(`/${id}`, 'PUT', {
      nombre: 'Ana María',
      apellido: 'Pérez',
      email: 'ana.nueva@streamfamily.example',
      username: 'ana.nueva',
      rol: 'cliente',
    });
    assert.equal(full.status, 200);
    assert.equal((await verifyCredentials('ana.nueva', payload.password))?.id, id);
  });

  await t.test('Cambio de estado, reset simulado y baja lógica', async () => {
    assert.equal((await request(`/${id}/estado`, 'PATCH', { estado: 'invalido' })).status, 400);
    assert.equal(
      (await request(`/${id}/estado`, 'PATCH', { estado: 'bloqueado' })).body.data.estado,
      'bloqueado',
    );
    assert.equal(await verifyCredentials('ana.nueva', payload.password), null);
    assert.equal((await request(`/${id}/estado`, 'PATCH', { estado: 'activo' })).status, 200);
    const reset = await request<null>(`/${id}/reset-password`, 'POST');
    assert.equal(reset.status, 200);
    assert.equal(reset.body.data, null);
    assert.equal((await verifyCredentials('ana.nueva', payload.password))?.id, id);
    assert.equal((await request(`/${id}/estado`, 'PATCH', { estado: 'inactivo' })).status, 400);
    const deleted = await request(`/${id}`, 'DELETE');
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.data.estado, 'inactivo');
    const detail = await request(`/${id}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.estado, 'inactivo');
    assert.equal(await verifyCredentials('ana.nueva', payload.password), null);
    const inactive = await request<UsuarioPublico[]>('?estado=inactivo');
    assert.ok(inactive.body.data.some((item) => item.id === id));
    for (const estado of ['activo', 'bloqueado']) {
      const result = await request<null>(`/${id}/estado`, 'PATCH', { estado });
      assert.equal(result.status, 409);
      assert.equal(result.body.msg, 'El usuario está dado de baja');
    }
    assert.equal((await request(`/${id}`, 'DELETE')).body.data.estado, 'inactivo');
    assert.equal(
      (await request('', 'POST', { ...payload, email: 'ana.nueva@streamfamily.example' })).status,
      409,
    );
    assert.equal((await request('', 'POST', { ...payload, username: 'ana.nueva' })).status, 409);
  });

  await t.test('Altas concurrentes no duplican credenciales ni reutilizan IDs', async () => {
    const results = await Promise.all([request('', 'POST', payload), request('', 'POST', payload)]);
    assert.deepEqual(results.map((item) => item.status).sort(), [201, 409]);
    const winner = results.find((item) => item.status === 201);
    assert.ok(winner);
    assert.ok(winner.body.data.id > id);
    await request(`/${winner.body.data.id}`, 'DELETE');
  });

  await t.test('IDs inválidos, inexistentes y contrato de errores', async () => {
    for (const invalid of ['0', '-1', 'abc', '1.5', '9007199254740992']) {
      const result = await request<null>(`/${invalid}`);
      assert.equal(result.status, 400);
      assert.equal(result.body.data, null);
    }
    const missing = await request<null>('/9999');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.data, null);
    const final = await request<UsuarioPublico[]>();
    assert.equal((final.body.meta as PaginationMeta).total, 17);
    for (const [path, method, body] of [
      ['/9999', 'DELETE', undefined],
      ['/9999/estado', 'PATCH', { estado: 'activo' }],
    ] as const) {
      assert.equal((await request(path, method, body)).status, 404);
    }
  });
});
