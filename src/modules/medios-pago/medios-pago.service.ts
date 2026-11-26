import type { AuthUser, ListResult } from '../../types/api.types';
import { HttpError } from '../../utils/HttpError';
import { listQuery } from '../../utils/listQuery';
import * as suscripcionesService from '../suscripciones/suscripciones.service';
import type { Suscripcion } from '../suscripciones/suscripciones.types';
import { mediosPagoMock } from './medios-pago.mock';
import type { CreateMedioPagoDto, MedioPago, UpdateMedioPagoDto } from './medios-pago.types';

const SORT_FIELDS = ['id', 'nombre', 'tipo'] as const;

let nextId = Math.max(0, ...mediosPagoMock.map((m) => m.id)) + 1;

function findIndexOrThrow(id: number): number {
  const index = mediosPagoMock.findIndex((m) => m.id === id);
  if (index === -1) {
    throw HttpError.notFound('Medio de pago no encontrado');
  }
  return index;
}

export function list(rawQuery: Record<string, unknown>): ListResult<MedioPago> {
  return listQuery(mediosPagoMock, rawQuery, {
    searchFields: ['nombre'],
    filterFields: ['tipo'],
    sortFields: SORT_FIELDS,
    defaultSortBy: 'id',
  });
}

export function getById(id: number): MedioPago {
  return mediosPagoMock[findIndexOrThrow(id)];
}

export function create(dto: CreateMedioPagoDto): MedioPago {
  const medio: MedioPago = { id: nextId, ...dto };
  nextId += 1;
  mediosPagoMock.push(medio);
  return medio;
}

export function update(id: number, dto: UpdateMedioPagoDto): MedioPago {
  const index = findIndexOrThrow(id);
  const updated: MedioPago = { ...mediosPagoMock[index], ...dto };
  mediosPagoMock[index] = updated;
  return updated;
}

/** Suscripciones que se cobran con este medio de pago (paginadas como cualquier listado) */
/** Suscripciones que se cobran con este medio de pago y que el usuario puede ver */
export function listSuscripciones(
  actor: AuthUser,
  id: number,
  rawQuery: Record<string, unknown>,
): ListResult<Suscripcion> {
  getById(id); // 404 si no existe
  return suscripcionesService.listFor(actor, { ...rawQuery, medioPagoId: String(id) });
}

export function remove(id: number): MedioPago {
  const index = findIndexOrThrow(id);

  const enUso = suscripcionesService.getAll().some((s) => s.medioPagoId === id);
  if (enUso) {
    throw HttpError.conflict('No se puede eliminar: hay suscripciones que usan este medio de pago');
  }

  const [removed] = mediosPagoMock.splice(index, 1);
  return removed;
}
