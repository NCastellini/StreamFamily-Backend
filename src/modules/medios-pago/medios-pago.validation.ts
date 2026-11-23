import { HttpError } from '../../utils/HttpError';
import type { CreateMedioPagoDto, TipoMedioPago, UpdateMedioPagoDto } from './medios-pago.types';

export const TIPOS: readonly TipoMedioPago[] = [
  'tarjeta_credito',
  'tarjeta_debito',
  'billetera',
  'transferencia',
];

const MEDIO_PAGO_FIELDS = new Set(['nombre', 'tipo', 'ultimosDigitos']);

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw HttpError.badRequest('El cuerpo de la petición debe ser un objeto JSON');
  }
  return value as UnknownRecord;
}

function parseNombre(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw HttpError.badRequest('El campo nombre es obligatorio y debe ser texto');
  }
  return value.trim();
}

function parseTipo(value: unknown): TipoMedioPago {
  if (typeof value !== 'string' || !TIPOS.includes(value as TipoMedioPago)) {
    throw HttpError.badRequest(`El campo tipo debe ser uno de: ${TIPOS.join(', ')}`);
  }
  return value as TipoMedioPago;
}

/** Solo se aceptan los últimos 4 dígitos (nunca el número completo) o null */
function parseUltimosDigitos(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}$/.test(value)) {
    throw HttpError.badRequest(
      'El campo ultimosDigitos debe tener exactamente 4 dígitos o ser null',
    );
  }
  return value;
}

function parseMedioPagoDto(value: unknown, requireAllFields: boolean): UpdateMedioPagoDto {
  const body = asRecord(value);

  const unknownFields = Object.keys(body).filter((field) => !MEDIO_PAGO_FIELDS.has(field));
  if (unknownFields.length > 0) {
    throw HttpError.badRequest('El cuerpo contiene campos no permitidos', { unknownFields });
  }

  if (requireAllFields) {
    for (const field of ['nombre', 'tipo']) {
      if (!Object.hasOwn(body, field)) {
        throw HttpError.badRequest(`El campo ${field} es obligatorio`);
      }
    }
  } else if (Object.keys(body).length === 0) {
    throw HttpError.badRequest('Debe enviar al menos un campo para actualizar');
  }

  const dto: UpdateMedioPagoDto = {};
  if (Object.hasOwn(body, 'nombre')) dto.nombre = parseNombre(body.nombre);
  if (Object.hasOwn(body, 'tipo')) dto.tipo = parseTipo(body.tipo);
  if (Object.hasOwn(body, 'ultimosDigitos')) {
    dto.ultimosDigitos = parseUltimosDigitos(body.ultimosDigitos);
  }
  return dto;
}

export function validateCreateMedioPago(value: unknown): CreateMedioPagoDto {
  const dto = parseMedioPagoDto(value, true);
  return { ultimosDigitos: null, ...dto } as CreateMedioPagoDto;
}

export function validateUpdateMedioPago(value: unknown): UpdateMedioPagoDto {
  return parseMedioPagoDto(value, false);
}
