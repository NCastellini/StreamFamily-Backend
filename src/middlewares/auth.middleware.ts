import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthUser, UserRole } from '../types/api.types';
import { HttpError } from '../utils/HttpError';

function readBearerToken(authorization: string | undefined): string {
  if (!authorization) {
    throw HttpError.unauthorized('Token de acceso requerido');
  }

  const match = /^Bearer\s+(\S+)$/i.exec(authorization);
  if (!match) {
    throw HttpError.unauthorized('Token de acceso inválido');
  }

  return match[1];
}

function toAuthUser(payload: string | jwt.JwtPayload): AuthUser {
  if (
    typeof payload === 'string' ||
    !Number.isSafeInteger(payload.id) ||
    payload.id < 1 ||
    typeof payload.username !== 'string' ||
    payload.username.trim() === '' ||
    (payload.role !== 'admin' && payload.role !== 'cliente')
  ) {
    throw HttpError.unauthorized('Token inválido o vencido');
  }

  return {
    id: payload.id,
    username: payload.username,
    role: payload.role,
  };
}

export const verifyToken: RequestHandler = (req, _res, next) => {
  try {
    const token = readBearerToken(req.get('authorization'));
    req.user = toAuthUser(jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }));
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : HttpError.unauthorized('Token inválido o vencido'));
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  const allowedRoles = new Set(roles);

  return (req, _res, next) => {
    if (!req.user) {
      next(HttpError.unauthorized());
      return;
    }

    if (!allowedRoles.has(req.user.role)) {
      next(HttpError.forbidden());
      return;
    }

    next();
  };
}
