import { HttpError } from '../../utils/HttpError';
import type {
  CreateSuscripcionDto,
  EstadoSuscripcion,
  Frecuencia,
  Moneda,
  UpdateSuscripcionDto,
} from './suscripciones.types';

export const MONEDAS: readonly Moneda[] = ['ARS', 'USD'];
export const FRECUENCIAS: readonly Frecuencia[] = ['mensual', 'trimestral', 'anual'];
export const ESTADOS: readonly EstadoSuscripcion[] = ['activa', 'pausada', 'cancelada'];

const SUSCRIPCION_FIELDS = new Set([
  'plataforma',
  'plan',
  'costo',
  'moneda',
  'frecuencia',
  'fechaCobro',
  'medioPagoId',
  'categoriaId',
  'grupoId',
  'usuarioId',
  'estado',
]);

/** Campos obligatorios en POST y PUT. grupoId es opcional (puede ser null). */
const REQUIRED_FIELDS = [
  'plataforma',
  'plan',
  'costo',
  'moneda',
  'frecuencia',
  'fechaCobro',
  'medioPagoId',
  'categoriaId',
  'usuarioId',
] as const;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw HttpError.badRequest('El cuerpo de la petición debe ser un objeto JSON');
  }
  return value as UnknownRecord;
}

function rejectUnknownFields(body: UnknownRecord, allowed: Set<string>): void {
  const unknownFields = Object.keys(body).filter((field) => !allowed.has(field));
  if (unknownFields.length > 0) {
    throw HttpError.badRequest('El cuerpo contiene campos no permitidos', { unknownFields });
  }
}

const MAX_TEXTO = 100;

function parseText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw HttpError.badRequest(`El campo ${field} es obligatorio y debe ser texto`);
  }
  if (value.trim().length > MAX_TEXTO) {
    throw HttpError.badRequest(`El campo ${field} no puede superar los ${MAX_TEXTO} caracteres`);
  }
  return value.trim();
}

function parseCosto(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw HttpError.badRequest('El campo costo debe ser un número mayor a 0');
  }
  return value;
}

function parseEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw HttpError.badRequest(`El campo ${field} debe ser uno de: ${allowed.join(', ')}`);
  }
  return value as T;
}

/** Fecha en formato AAAA-MM-DD y que exista en el calendario */
function parseFecha(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw HttpError.badRequest(`El campo ${field} debe tener el formato AAAA-MM-DD`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw HttpError.badRequest(`El campo ${field} no es una fecha válida`);
  }
  return value;
}

function parseBodyId(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw HttpError.badRequest(`El campo ${field} debe ser un entero positivo`);
  }
  return value;
}

function parseSuscripcionDto(value: unknown, requireAllFields: boolean): UpdateSuscripcionDto {
  const body = asRecord(value);
  rejectUnknownFields(body, SUSCRIPCION_FIELDS);

  if (requireAllFields) {
    for (const field of REQUIRED_FIELDS) {
      if (!Object.hasOwn(body, field)) {
        throw HttpError.badRequest(`El campo ${field} es obligatorio`);
      }
    }
  } else if (Object.keys(body).length === 0) {
    throw HttpError.badRequest('Debe enviar al menos un campo para actualizar');
  }

  const dto: UpdateSuscripcionDto = {};
  const has = (field: string): boolean => Object.hasOwn(body, field);

  if (has('plataforma')) dto.plataforma = parseText(body.plataforma, 'plataforma');
  if (has('plan')) dto.plan = parseText(body.plan, 'plan');
  if (has('costo')) dto.costo = parseCosto(body.costo);
  if (has('moneda')) dto.moneda = parseEnum(body.moneda, 'moneda', MONEDAS);
  if (has('frecuencia')) dto.frecuencia = parseEnum(body.frecuencia, 'frecuencia', FRECUENCIAS);
  if (has('fechaCobro')) dto.fechaCobro = parseFecha(body.fechaCobro, 'fechaCobro');
  if (has('medioPagoId')) dto.medioPagoId = parseBodyId(body.medioPagoId, 'medioPagoId');
  if (has('categoriaId')) dto.categoriaId = parseBodyId(body.categoriaId, 'categoriaId');
  if (has('usuarioId')) dto.usuarioId = parseBodyId(body.usuarioId, 'usuarioId');
  if (has('grupoId')) {
    dto.grupoId = body.grupoId === null ? null : parseBodyId(body.grupoId, 'grupoId');
  }
  if (has('estado')) dto.estado = parseEnum(body.estado, 'estado', ESTADOS);

  return dto;
}

export function parsePositiveId(value: unknown, field = 'id'): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = typeof raw === 'string' && /^\d+$/.test(raw.trim()) ? Number(raw) : Number.NaN;

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw HttpError.badRequest(`El campo ${field} debe ser un entero positivo`);
  }
  return parsed;
}

export function validateCreateSuscripcion(value: unknown): CreateSuscripcionDto {
  const dto = parseSuscripcionDto(value, true);
  return { grupoId: null, estado: 'activa', ...dto } as CreateSuscripcionDto;
}

export function validateReplaceSuscripcion(value: unknown): CreateSuscripcionDto {
  return validateCreateSuscripcion(value);
}

export function validateUpdateSuscripcion(value: unknown): UpdateSuscripcionDto {
  return parseSuscripcionDto(value, false);
}

/** Body de PATCH /:id/estado → { "estado": "pausada" } */
export function validateEstadoBody(value: unknown): EstadoSuscripcion {
  const body = asRecord(value);
  rejectUnknownFields(body, new Set(['estado']));
  if (!Object.hasOwn(body, 'estado')) {
    throw HttpError.badRequest('El campo estado es obligatorio');
  }
  return parseEnum(body.estado, 'estado', ESTADOS);
}
