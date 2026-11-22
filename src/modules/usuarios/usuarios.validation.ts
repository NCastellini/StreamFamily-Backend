import { HttpError } from '../../utils/HttpError';
import type {
  CreateUsuarioDto,
  ReplaceUsuarioDto,
  RolUsuario,
  UpdateEstadoUsuarioDto,
  UpdateUsuarioDto,
} from './usuarios.types';

const profileFields = ['nombre', 'apellido', 'email', 'username', 'rol'] as const;

function record(body: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw HttpError.badRequest('El cuerpo debe ser un objeto JSON');
  }
  const data = body as Record<string, unknown>;
  if (Object.keys(data).some((key) => !allowed.includes(key))) {
    throw HttpError.badRequest('El cuerpo contiene campos no permitidos');
  }
  return data;
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
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

function role(value: unknown): RolUsuario {
  if (value !== 'admin' && value !== 'cliente') {
    throw HttpError.badRequest('rol debe ser admin o cliente');
  }
  return value;
}

function state(value: unknown): UpdateEstadoUsuarioDto['estado'] {
  if (value !== 'activo' && value !== 'bloqueado') {
    throw HttpError.badRequest('estado debe ser activo o bloqueado');
  }
  return value;
}

export function parseUsuarioId(value: unknown): number {
  if ((typeof value !== 'string' || !/^\d+$/.test(value)) && typeof value !== 'number') {
    throw HttpError.badRequest('El id debe ser un entero positivo');
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw HttpError.badRequest('El id debe ser un entero positivo');
  }
  return id;
}

export function validateCreateUsuario(body: unknown): CreateUsuarioDto {
  const data = record(body, [...profileFields, 'password', 'estado']);
  if (data.estado !== undefined && data.estado !== 'activo') {
    throw HttpError.badRequest('Los usuarios nuevos deben tener estado activo');
  }
  if (
    typeof data.password !== 'string' ||
    data.password.trim().length < 8 ||
    Buffer.byteLength(data.password, 'utf8') > 72
  ) {
    throw HttpError.badRequest(
      'password debe tener al menos 8 caracteres y como máximo 72 bytes UTF-8',
    );
  }
  return {
    nombre: text(data.nombre, 'nombre'),
    apellido: text(data.apellido, 'apellido'),
    email: email(data.email),
    username: username(data.username),
    password: data.password,
    rol: data.rol === undefined ? 'cliente' : role(data.rol),
    estado: 'activo',
  };
}

export function validateReplaceUsuario(body: unknown): ReplaceUsuarioDto {
  const data = record(body, profileFields);
  return {
    nombre: text(data.nombre, 'nombre'),
    apellido: text(data.apellido, 'apellido'),
    email: email(data.email),
    username: username(data.username),
    rol: role(data.rol),
  };
}

export function validateUpdateUsuario(body: unknown): UpdateUsuarioDto {
  const data = record(body, profileFields);
  if (Object.keys(data).length === 0) throw HttpError.badRequest('Debe enviar al menos un campo');
  const dto: UpdateUsuarioDto = {};
  if ('nombre' in data) dto.nombre = text(data.nombre, 'nombre');
  if ('apellido' in data) dto.apellido = text(data.apellido, 'apellido');
  if ('email' in data) dto.email = email(data.email);
  if ('username' in data) dto.username = username(data.username);
  if ('rol' in data) dto.rol = role(data.rol);
  return dto;
}

export function validateEstadoUsuario(body: unknown): UpdateEstadoUsuarioDto {
  const data = record(body, ['estado']);
  return { estado: state(data.estado) };
}
