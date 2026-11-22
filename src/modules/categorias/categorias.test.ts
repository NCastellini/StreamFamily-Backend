import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import { app } from '../../app';
import type { ApiResponse } from '../../types/api.types';
import { getById } from './categorias.service';
import type { Categoria } from './categorias.types';

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
  baseUrl = `http://127.0.0.1:${address.port}/api/v1/categorias`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
});

async function request<T = Categoria>(path = '', method = 'GET', body?: unknown) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json()) as ApiResponse<T>;
  assert.equal(data.code, response.status);
  return { status: response.status, body: data };
}

test('Categorías: contrato, búsqueda, validación y CRUD', async (t) => {
  await t.test('Seis IDs, búsqueda sin tildes y paginación', async () => {
    const all = await request<Categoria[]>();
    assert.equal(all.status, 200);
    assert.deepEqual(
      all.body.data.map((item) => item.id),
      [1, 2, 3, 4, 5, 6],
    );
    assert.equal(all.body.meta?.limit, 10);
    assert.deepEqual(Object.keys(all.body.data[0]).sort(), ['descripcion', 'id', 'nombre']);
    const search = await request<Categoria[]>('?q=MUSICA');
    assert.deepEqual(
      search.body.data.map((item) => item.id),
      [2],
    );
    const page = await request<Categoria[]>('?limit=2&page=2&sortBy=id&order=desc');
    assert.deepEqual(
      page.body.data.map((item) => item.id),
      [4, 3],
    );
    assert.equal(page.body.meta?.total, 6);
    assert.deepEqual((await request<Categoria[]>('?q=sin-coincidencias')).body.data, []);
  });

  let id: number;
  await t.test('Alta y nombre único normalizado', async () => {
    assert.equal(
      (await request('', 'POST', { nombre: ' musica ', descripcion: 'Duplicada' })).status,
      409,
    );
    for (const body of [
      null,
      [],
      {},
      { nombre: 'Nueva' },
      { nombre: ' ', descripcion: '' },
      { nombre: 'Nueva', descripcion: null },
      { nombre: 'Nueva', descripcion: '', activa: true },
    ]) {
      assert.equal((await request('', 'POST', body)).status, 400);
    }
    const created = await request('', 'POST', { nombre: 'Noticias', descripcion: 'Diarios' });
    assert.equal(created.status, 201);
    id = created.body.data.id;
    assert.equal(id, 7);
    const copy = getById(id);
    copy.nombre = 'Modificada externamente';
    assert.equal(getById(id).nombre, 'Noticias');
  });

  await t.test('PUT y PATCH, validación atómica', async () => {
    assert.equal((await request(`/${id}`, 'PUT', { nombre: 'Actualizada' })).status, 400);
    assert.equal((await request(`/${id}`, 'PATCH', {})).status, 400);
    assert.equal(
      (await request(`/${id}`, 'PATCH', { nombre: 'No guardar', descripcion: false })).status,
      400,
    );
    assert.equal((await request(`/${id}`)).body.data.nombre, 'Noticias');
    assert.equal((await request(`/${id}`, 'PATCH', { nombre: 'video' })).status, 409);
    const partial = await request(`/${id}`, 'PATCH', { descripcion: '' });
    assert.equal(partial.status, 200);
    assert.equal(partial.body.data.nombre, 'Noticias');
    assert.equal(partial.body.data.descripcion, '');
    const full = await request(`/${id}`, 'PUT', { nombre: 'Prensa', descripcion: 'Revistas' });
    assert.equal(full.status, 200);
    assert.equal(full.body.data.nombre, 'Prensa');
  });

  await t.test('Baja, IDs monotónicos y errores', async () => {
    assert.equal((await request(`/${id}`, 'DELETE')).status, 200);
    assert.equal((await request(`/${id}`)).status, 404);
    assert.equal((await request(`/${id}`, 'DELETE')).status, 404);
    const another = await request('', 'POST', { nombre: 'Prensa', descripcion: '' });
    assert.ok(another.body.data.id > id);
    await request(`/${another.body.data.id}`, 'DELETE');
    for (const invalid of ['0', '-1', 'abc', '1.5', '9007199254740992']) {
      const result = await request<null>(`/${invalid}`);
      assert.equal(result.status, 400);
      assert.equal(result.body.data, null);
    }
    assert.equal((await request<Categoria[]>()).body.meta?.total, 6);
  });
});
