import { HttpError } from '../../utils/HttpError';
import type { CreateCategoriaDto, UpdateCategoriaDto } from './categorias.types';

export function normalizeNombre(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function parseCategoriaId(value: unknown): number {
  if ((typeof value !== 'string' || !/^\d+$/.test(value)) && typeof value !== 'number') {
    throw HttpError.badRequest('El id debe ser un entero positivo');
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw HttpError.badRequest('El id debe ser un entero positivo');
  }
  return id;
}

function record(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw HttpError.badRequest('El cuerpo debe ser un objeto JSON');
  }
  const data = body as Record<string, unknown>;
  if (Object.keys(data).some((key) => key !== 'nombre' && key !== 'descripcion')) {
    throw HttpError.badRequest('El cuerpo contiene campos no permitidos');
  }
  return data;
}

function nombre(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw HttpError.badRequest('nombre es obligatorio y debe ser texto no vacío');
  }
  return value.trim();
}

function descripcion(value: unknown): string {
  if (typeof value !== 'string') {
    throw HttpError.badRequest('descripcion es obligatoria y debe ser texto');
  }
  return value.trim();
}

export function validateCreateCategoria(body: unknown): CreateCategoriaDto {
  const data = record(body);
  return { nombre: nombre(data.nombre), descripcion: descripcion(data.descripcion) };
}

export function validateUpdateCategoria(body: unknown): UpdateCategoriaDto {
  const data = record(body);
  if (Object.keys(data).length === 0) throw HttpError.badRequest('Debe enviar al menos un campo');
  const dto: UpdateCategoriaDto = {};
  if ('nombre' in data) dto.nombre = nombre(data.nombre);
  if ('descripcion' in data) dto.descripcion = descripcion(data.descripcion);
  return dto;
}
