import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import { app } from '../../app';
import type { ApiResponse } from '../../types/api.types';
import { login } from '../auth/auth.service';
import type { Grupo, ResumenGrupo } from './grupos.types';

let server: Server;
let baseUrl: string;
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
  baseUrl = `http://127.0.0.1:${address.port}/api/v1/grupos`;
  clientToken = (await login({ identifier: 'martin.gomez', password: 'ClienteDemo123!' })).token;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
});

async function request<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<{ status: number; body: ApiResponse<T> }> {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      Authorization: `Bearer ${clientToken}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json()) as ApiResponse<T>;
  assert.equal(data.code, response.status);
  return { status: response.status, body: data };
}

test('Resumen de Grupos: monedas, frecuencias y errores', async (t) => {
  await t.test('calcula ARS y frecuencia trimestral para el grupo 1', async () => {
    const result = await request<ResumenGrupo>('/1/resumen');
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.data, {
      grupoId: 1,
      nombre: 'Familia Gómez',
      cantidadMiembros: 3,
      suscripcionesActivas: 3,
      subtotalMensual: { ARS: 21299, USD: 0 },
    });
    assert.equal(result.body.meta, undefined);
  });

  await t.test('calcula USD y frecuencias trimestral/anual para el grupo 4', async () => {
    const result = await request<ResumenGrupo>('/4/resumen');
    assert.equal(result.status, 200);
    assert.equal(result.body.data.suscripcionesActivas, 3);
    assert.deepEqual(result.body.data.subtotalMensual, { ARS: 0, USD: 31.65 });
  });

  await t.test('mantiene ARS y USD separados', async () => {
    const result = await request<ResumenGrupo>('/3/resumen');
    assert.deepEqual(result.body.data.subtotalMensual, { ARS: 6200, USD: 7 });
    assert.equal(result.body.data.suscripcionesActivas, 2);
  });

  await t.test('un grupo sin suscripciones devuelve totales en cero', async () => {
    const created = await request<Grupo>('', 'POST', {
      nombre: 'Grupo sin suscripciones',
      administradorId: 16,
      miembros: [16],
    });
    assert.equal(created.status, 201);

    const result = await request<ResumenGrupo>(`/${created.body.data.id}/resumen`);
    assert.equal(result.status, 200);
    assert.equal(result.body.data.suscripcionesActivas, 0);
    assert.deepEqual(result.body.data.subtotalMensual, { ARS: 0, USD: 0 });
  });

  await t.test('IDs inexistentes o inválidos devuelven 404 y 400', async () => {
    assert.equal((await request<null>('/999/resumen')).status, 404);
    assert.equal((await request<null>('/abc/resumen')).status, 400);
  });
});
