import { HttpError } from '../../utils/HttpError';
import type { CreateGrupoDto, UpdateGrupoDto } from './grupos.types';

const GRUPO_FIELDS = new Set(['nombre', 'administradorId', 'miembros']);

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw HttpError.badRequest('El cuerpo de la petición debe ser un objeto JSON');
  }

  return value as UnknownRecord;
}

function rejectUnknownFields(body: UnknownRecord): void {
  const unknownFields = Object.keys(body).filter((field) => !GRUPO_FIELDS.has(field));

  if (unknownFields.length > 0) {
    throw HttpError.badRequest('El cuerpo contiene campos no permitidos', { unknownFields });
  }
}

function requireField(body: UnknownRecord, field: string): void {
  if (!Object.hasOwn(body, field)) {
    throw HttpError.badRequest(`El campo ${field} es obligatorio`);
  }
}

function parseNombre(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw HttpError.badRequest('El nombre es obligatorio');
  }

  return value.trim();
}

function parseBodyId(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw HttpError.badRequest(`El campo ${field} debe ser un entero positivo`);
  }

  return value;
}

function parseMiembros(value: unknown): number[] {
  if (!Array.isArray(value)) {
    throw HttpError.badRequest('El campo miembros debe ser un array');
  }

  const miembros = value.map((usuarioId) => parseBodyId(usuarioId, 'miembros'));

  if (new Set(miembros).size !== miembros.length) {
    throw HttpError.badRequest('El campo miembros no puede contener usuarios repetidos');
  }

  return miembros;
}

function ensureAdministradorIsMember(dto: UpdateGrupoDto): void {
  if (
    dto.administradorId !== undefined &&
    dto.miembros !== undefined &&
    !dto.miembros.includes(dto.administradorId)
  ) {
    throw HttpError.badRequest('El administrador debe pertenecer a miembros');
  }
}

function parseGrupoDto(value: unknown, requireAllFields: boolean): UpdateGrupoDto {
  const body = asRecord(value);
  rejectUnknownFields(body);

  if (requireAllFields) {
    requireField(body, 'nombre');
    requireField(body, 'administradorId');
    requireField(body, 'miembros');
  } else if (Object.keys(body).length === 0) {
    throw HttpError.badRequest('Debe enviar al menos un campo para actualizar');
  }

  const dto: UpdateGrupoDto = {};

  if (Object.hasOwn(body, 'nombre')) dto.nombre = parseNombre(body.nombre);
  if (Object.hasOwn(body, 'administradorId')) {
    dto.administradorId = parseBodyId(body.administradorId, 'administradorId');
  }
  if (Object.hasOwn(body, 'miembros')) dto.miembros = parseMiembros(body.miembros);

  ensureAdministradorIsMember(dto);
  return dto;
}

export function parsePositiveId(value: unknown, field = 'id'): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && /^\d+$/.test(raw.trim())
        ? Number(raw)
        : Number.NaN;

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw HttpError.badRequest(`El campo ${field} debe ser un entero positivo`);
  }

  return parsed;
}

export function validateCreateGrupo(value: unknown): CreateGrupoDto {
  return parseGrupoDto(value, true) as CreateGrupoDto;
}

export function validateReplaceGrupo(value: unknown): CreateGrupoDto {
  return parseGrupoDto(value, true) as CreateGrupoDto;
}

export function validateUpdateGrupo(value: unknown): UpdateGrupoDto {
  return parseGrupoDto(value, false);
}

export function validateMiembroBody(value: unknown): number {
  const body = asRecord(value);
  const fields = Object.keys(body);

  if (fields.length !== 1 || fields[0] !== 'usuarioId') {
    throw HttpError.badRequest('Debe enviar únicamente el campo usuarioId');
  }

  return parseBodyId(body.usuarioId, 'usuarioId');
}
