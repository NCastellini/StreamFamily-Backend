import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import type { AuthUser } from '../../types/api.types';
import { HttpError } from '../../utils/HttpError';
import { verifyCredentials } from '../usuarios/usuarios.service';
import type { LoginResult, RegisterResult } from './auth.types';
import { validateLogin, validateRecover, validateRegister } from './auth.validation';

const TOKEN_EXPIRES_IN = '8h';

export async function login(body: unknown): Promise<LoginResult> {
  const dto = validateLogin(body);
  const usuario = await verifyCredentials(dto.identifier, dto.password);

  if (!usuario) {
    throw HttpError.unauthorized('Credenciales inválidas');
  }

  const user: AuthUser = {
    id: usuario.id,
    username: usuario.username,
    role: usuario.rol,
  };
  const token = jwt.sign(user, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: TOKEN_EXPIRES_IN,
  });

  return { token, user };
}

export function register(body: unknown): RegisterResult {
  const dto = validateRegister(body);

  return {
    email: dto.email,
    username: dto.username,
  };
}

export function recover(body: unknown): void {
  validateRecover(body);
}
