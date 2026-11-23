import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { app } from '../../app';
import { env } from '../../config/env';
import { requireRole } from '../../middlewares/auth.middleware';
import type { ApiResponse, AuthUser } from '../../types/api.types';
import { HttpError } from '../../utils/HttpError';
import type { LoginResult, RegisterResult } from './auth.types';

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
  baseUrl = `http://127.0.0.1:${address.port}/api/v1/auth`;
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
  token?: string,
): Promise<{ status: number; body: ApiResponse<T> }> {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json()) as ApiResponse<T>;
  assert.equal(data.code, response.status);
  assert.ok(!JSON.stringify(data).includes('passwordHash'));
  assert.ok(!JSON.stringify(data).includes('"password"'));
  return { status: response.status, body: data };
}

test('Auth: login, sesión, registro, recuperación y roles', async (t) => {
  let adminToken: string;
  let clientToken: string;

  await t.test('login acepta identifier, email y username', async () => {
    const admin = await request<LoginResult>('/login', 'POST', {
      identifier: 'lucia.fernandez',
      password: 'AdminDemo123!',
    });
    assert.equal(admin.status, 200);
    assert.deepEqual(admin.body.data.user, {
      id: 1,
      username: 'lucia.fernandez',
      role: 'admin',
    });
    assert.ok(admin.body.data.token);
    adminToken = admin.body.data.token;

    const client = await request<LoginResult>('/login', 'POST', {
      email: 'MARTIN.GOMEZ@STREAMFAMILY.EXAMPLE',
      password: 'ClienteDemo123!',
    });
    assert.equal(client.status, 200);
    assert.equal(client.body.data.user.role, 'cliente');
    clientToken = client.body.data.token;

    const username = await request<LoginResult>('/login', 'POST', {
      username: 'martin.gomez',
      password: 'ClienteDemo123!',
    });
    assert.equal(username.status, 200);
  });

  await t.test('credenciales inválidas, bloqueadas e inactivas usan el mismo 401', async () => {
    const attempts = [
      { identifier: 'lucia.fernandez', password: 'incorrecta' },
      { identifier: 'diego.lopez', password: 'ClienteDemo123!' },
      { identifier: 'victoria.castro', password: 'ClienteDemo123!' },
      { identifier: 'inexistente', password: 'ClienteDemo123!' },
    ];

    for (const body of attempts) {
      const result = await request<null>('/login', 'POST', body);
      assert.equal(result.status, 401);
      assert.equal(result.body.msg, 'Credenciales inválidas');
      assert.equal(result.body.data, null);
    }
  });

  await t.test('cuerpos inválidos devuelven 400', async () => {
    const invalidBodies = [
      null,
      {},
      { identifier: 'lucia.fernandez' },
      { identifier: 'lucia.fernandez', email: 'lucia@streamfamily.example', password: 'x' },
      { identifier: 'lucia.fernandez', password: '' },
      { identifier: 'lucia.fernandez', password: 'x', extra: true },
    ];

    for (const body of invalidBodies) {
      assert.equal((await request<null>('/login', 'POST', body)).status, 400);
    }
  });

  await t.test('/me exige y valida el Bearer token', async () => {
    assert.equal((await request<null>('/me')).status, 401);
    assert.equal((await request<null>('/me', 'GET', undefined, 'token-invalido')).status, 401);

    const expiredToken = jwt.sign(
      { id: 1, username: 'lucia.fernandez', role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: -1 },
    );
    assert.equal((await request<null>('/me', 'GET', undefined, expiredToken)).status, 401);

    const me = await request<AuthUser>('/me', 'GET', undefined, adminToken);
    assert.equal(me.status, 200);
    assert.deepEqual(me.body.data, {
      id: 1,
      username: 'lucia.fernandez',
      role: 'admin',
    });
  });

  await t.test('registro y recuperación son simulados y no exponen credenciales', async () => {
    const registration = await request<RegisterResult>('/register', 'POST', {
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ANA@streamfamily.example',
      username: 'ANA.PEREZ',
      password: 'PasswordDemo123!',
    });
    assert.equal(registration.status, 201);
    assert.deepEqual(registration.body.data, {
      email: 'ana@streamfamily.example',
      username: 'ana.perez',
    });

    const recoverExisting = await request<null>('/recover', 'POST', {
      email: 'lucia.fernandez@streamfamily.example',
    });
    const recoverMissing = await request<null>('/recover', 'POST', {
      email: 'no-existe@streamfamily.example',
    });
    assert.equal(recoverExisting.status, 200);
    assert.equal(recoverMissing.status, 200);
    assert.equal(recoverExisting.body.msg, recoverMissing.body.msg);
    assert.equal(recoverExisting.body.data, null);
  });

  await t.test('requireRole permite roles válidos y responde 401/403', () => {
    const runMiddleware = (user: AuthUser | undefined, role: 'admin' | 'cliente') => {
      let received: unknown;
      const req = { user } as Request;
      const next: NextFunction = (error?: unknown) => {
        received = error ?? 'next';
      };
      requireRole(role)(req, {} as Response, next);
      return received;
    };

    assert.equal(
      runMiddleware({ id: 1, username: 'lucia.fernandez', role: 'admin' }, 'admin'),
      'next',
    );

    const forbidden = runMiddleware({ id: 2, username: 'martin.gomez', role: 'cliente' }, 'admin');
    assert.ok(forbidden instanceof HttpError);
    assert.equal(forbidden.status, 403);

    const unauthorized = runMiddleware(undefined, 'cliente');
    assert.ok(unauthorized instanceof HttpError);
    assert.equal(unauthorized.status, 401);

    assert.ok(clientToken);
  });
});
