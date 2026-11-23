import { HttpError } from '../../utils/HttpError';
import type { LoginDto, RecoverDto, RegisterDto } from './auth.types';

type UnknownRecord = Record<string, unknown>;

function record(body: unknown, allowedFields: readonly string[]): UnknownRecord {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw HttpError.badRequest('El cuerpo debe ser un objeto JSON');
  }

  const data = body as UnknownRecord;
  if (Object.keys(data).some((field) => !allowedFields.includes(field))) {
    throw HttpError.badRequest('El cuerpo contiene campos no permitidos');
  }

  return data;
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw HttpError.badRequest(`El campo "${field}" es obligatorio y debe ser texto`);
  }

  return value.trim();
}

function email(value: unknown): string {
  const result = text(value, 'email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) {
    throw HttpError.badRequest('El email no tiene un formato válido');
  }

  return result;
}

function username(value: unknown): string {
  const result = text(value, 'username').toLowerCase();
  if (!/^[a-z0-9._-]{3,50}$/.test(result)) {
    throw HttpError.badRequest(
      'username debe tener 3 a 50 letras, números, puntos, guiones o guiones bajos',
    );
  }

  return result;
}

function registerPassword(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.trim().length < 8 ||
    Buffer.byteLength(value, 'utf8') > 72
  ) {
    throw HttpError.badRequest(
      'password debe tener al menos 8 caracteres y como máximo 72 bytes UTF-8',
    );
  }

  return value;
}

export function validateLogin(body: unknown): LoginDto {
  const data = record(body, ['identifier', 'email', 'username', 'password']);
  const identifierFields = ['identifier', 'email', 'username'].filter((field) =>
    Object.hasOwn(data, field),
  );

  if (identifierFields.length !== 1) {
    throw HttpError.badRequest('Debe enviar uno de estos campos: identifier, email o username');
  }

  if (typeof data.password !== 'string' || data.password.trim() === '') {
    throw HttpError.badRequest('El campo "password" es obligatorio y debe ser texto');
  }

  const identifierField = identifierFields[0];
  const identifier =
    identifierField === 'email'
      ? email(data.email)
      : identifierField === 'username'
        ? username(data.username)
        : text(data.identifier, 'identifier').toLowerCase();

  return { identifier, password: data.password };
}

export function validateRegister(body: unknown): RegisterDto {
  const data = record(body, ['nombre', 'apellido', 'email', 'username', 'password']);

  return {
    nombre: text(data.nombre, 'nombre'),
    apellido: text(data.apellido, 'apellido'),
    email: email(data.email),
    username: username(data.username),
    password: registerPassword(data.password),
  };
}

export function validateRecover(body: unknown): RecoverDto {
  const data = record(body, ['email']);
  return { email: email(data.email) };
}
