import bcrypt from 'bcrypt';
import type { ListResult } from '../../types/api.types';
import { HttpError } from '../../utils/HttpError';
import { listQuery } from '../../utils/listQuery';
import { usuariosMock } from './usuarios.mock';
import type { Usuario, UsuarioPublico } from './usuarios.types';
import {
  parseUsuarioId,
  validateCreateUsuario,
  validateEstadoUsuario,
  validateReplaceUsuario,
  validateUpdateUsuario,
} from './usuarios.validation';

const usuarios: Usuario[] = usuariosMock.map((usuario) => ({ ...usuario }));
let nextId = Math.max(0, ...usuarios.map((usuario) => usuario.id)) + 1;

// Lista explícita: las respuestas nunca incluyen hashes ni credenciales.
function toPublic(usuario: Usuario): UsuarioPublico {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    username: usuario.username,
    rol: usuario.rol,
    estado: usuario.estado,
    creadoEn: usuario.creadoEn,
  };
}

function find(idParam: unknown): Usuario {
  const id = parseUsuarioId(idParam);
  const usuario = usuarios.find((item) => item.id === id);
  if (!usuario) throw HttpError.notFound('Usuario no encontrado');
  return usuario;
}

function assertUnique(email: string, username: string, ignoreId?: number): void {
  if (
    usuarios.some((usuario) => usuario.id !== ignoreId && usuario.email.toLowerCase() === email)
  ) {
    throw HttpError.conflict('Ya existe un usuario con ese email');
  }
  if (
    usuarios.some(
      (usuario) => usuario.id !== ignoreId && usuario.username.toLowerCase() === username,
    )
  ) {
    throw HttpError.conflict('Ya existe un usuario con ese username');
  }
}

export function list(query: Record<string, unknown> = {}): ListResult<UsuarioPublico> {
  return listQuery(usuarios.map(toPublic), query, {
    searchFields: ['nombre', 'apellido', 'email'],
    filterFields: ['rol', 'estado'],
    sortFields: ['id', 'nombre', 'apellido', 'email', 'username', 'rol', 'estado', 'creadoEn'],
    defaultSortBy: 'id',
  });
}

export function getById(id: unknown): UsuarioPublico {
  return toPublic(find(id));
}

export async function create(body: unknown): Promise<UsuarioPublico> {
  const dto = validateCreateUsuario(body);
  assertUnique(dto.email, dto.username);
  const passwordHash = await bcrypt.hash(dto.password, 10);
  // Otra petición podría haber creado el mismo usuario mientras se calculaba el hash.
  assertUnique(dto.email, dto.username);
  const usuario: Usuario = {
    id: nextId++,
    nombre: dto.nombre,
    apellido: dto.apellido,
    email: dto.email,
    username: dto.username,
    passwordHash,
    rol: dto.rol ?? 'cliente',
    estado: 'activo',
    creadoEn: new Date().toISOString(),
  };
  usuarios.push(usuario);
  return toPublic(usuario);
}

/** PUT exige el perfil completo; PATCH acepta los campos que se quieran modificar. */
export function update(id: unknown, body: unknown, partial = true): UsuarioPublico {
  const usuario = find(id);
  const dto = partial ? validateUpdateUsuario(body) : validateReplaceUsuario(body);
  assertUnique(dto.email ?? usuario.email, dto.username ?? usuario.username, usuario.id);
  Object.assign(usuario, dto);
  return toPublic(usuario);
}

export function changeState(id: unknown, body: unknown): UsuarioPublico {
  const usuario = find(id);
  const dto = validateEstadoUsuario(body);
  if (usuario.estado === 'inactivo') {
    throw HttpError.conflict('El usuario está dado de baja');
  }
  usuario.estado = dto.estado;
  return toPublic(usuario);
}

/** Simulado según el plan: no modifica la contraseña ni envía un correo. */
export function resetPassword(id: unknown): void {
  find(id);
}

export function remove(id: unknown): UsuarioPublico {
  const usuario = find(id);
  usuario.estado = 'inactivo';
  return toPublic(usuario);
}

/** Punto de integración para Auth: valida bcrypt sin exponer el hash al consumidor. */
export async function verifyCredentials(
  identifier: string,
  password: string,
): Promise<UsuarioPublico | null> {
  const key = identifier.trim().toLowerCase();
  const usuario = usuarios.find((item) => item.email === key || item.username === key);
  if (!usuario || usuario.estado !== 'activo') return null;
  if (Buffer.byteLength(password, 'utf8') > 72) return null;
  const valid = await bcrypt.compare(password, usuario.passwordHash);
  // Puede haber sido eliminado o bloqueado durante la comparación.
  if (!valid || !usuarios.includes(usuario) || usuario.estado !== 'activo') return null;
  return toPublic(usuario);
}

export function getCounts(): { totalUsuarios: number; totalClientes: number } {
  return {
    totalUsuarios: usuarios.length,
    totalClientes: usuarios.filter((usuario) => usuario.rol === 'cliente').length,
  };
}
