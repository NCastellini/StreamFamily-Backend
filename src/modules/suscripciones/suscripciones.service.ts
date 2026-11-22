import type { ListResult } from '../../types/api.types';
import { HttpError } from '../../utils/HttpError';
import { listQuery } from '../../utils/listQuery';
import { gruposMock } from '../grupos/grupos.mock';
import { mediosPagoMock } from '../medios-pago/medios-pago.mock';
import { suscripcionesMock } from './suscripciones.mock';
import type {
  CreateSuscripcionDto,
  EstadoSuscripcion,
  Suscripcion,
  UpdateSuscripcionDto,
} from './suscripciones.types';

/*
 * Service de Suscripciones.
 * Es el único archivo que cambia cuando se pase de mock a Sequelize.
 * Lo usan también Alertas, Dashboard, Grupos y Métricas: no cambiar las firmas.
 */

const SEARCH_FIELDS = ['plataforma', 'plan'] as const;

const FILTER_FIELDS = [
  'categoriaId',
  'grupoId',
  'usuarioId',
  'moneda',
  'frecuencia',
  'estado',
  'medioPagoId',
] as const;

const SORT_FIELDS = [
  'id',
  'plataforma',
  'plan',
  'costo',
  'moneda',
  'frecuencia',
  'fechaCobro',
  'estado',
  'creadaEn',
] as const;

let nextId = Math.max(0, ...suscripcionesMock.map((s) => s.id)) + 1;

/** Verifica que los IDs que apuntan a otras entidades existan */
function ensureReferences(s: Suscripcion): void {
  if (!mediosPagoMock.some((m) => m.id === s.medioPagoId)) {
    throw HttpError.badRequest(`No existe el medio de pago ${s.medioPagoId}`);
  }
  if (s.grupoId !== null && !gruposMock.some((g) => g.id === s.grupoId)) {
    throw HttpError.badRequest(`No existe el grupo ${s.grupoId}`);
  }
  // TODO: validar categoriaId y usuarioId cuando estén los mocks de Román en dev
}

function findIndexOrThrow(id: number): number {
  const index = suscripcionesMock.findIndex((s) => s.id === id);
  if (index === -1) {
    throw HttpError.notFound('Suscripción no encontrada');
  }
  return index;
}

export function list(rawQuery: Record<string, unknown>): ListResult<Suscripcion> {
  return listQuery(suscripcionesMock, rawQuery, {
    searchFields: SEARCH_FIELDS,
    filterFields: FILTER_FIELDS,
    sortFields: SORT_FIELDS,
    defaultSortBy: 'id',
  });
}

/** Devuelve todas (sin paginar). Útil para Dashboard, Alertas y Métricas. */
export function getAll(): readonly Suscripcion[] {
  return suscripcionesMock;
}

export function getById(id: number): Suscripcion {
  return suscripcionesMock[findIndexOrThrow(id)];
}

export function create(dto: CreateSuscripcionDto): Suscripcion {
  const suscripcion: Suscripcion = {
    id: nextId,
    ...dto,
    creadaEn: new Date().toISOString(),
  };

  ensureReferences(suscripcion);
  nextId += 1;
  suscripcionesMock.push(suscripcion);
  return suscripcion;
}

export function update(id: number, dto: UpdateSuscripcionDto): Suscripcion {
  const index = findIndexOrThrow(id);
  const updated: Suscripcion = { ...suscripcionesMock[index], ...dto };

  ensureReferences(updated);
  suscripcionesMock[index] = updated;
  return updated;
}

export function changeEstado(id: number, estado: EstadoSuscripcion): Suscripcion {
  const index = findIndexOrThrow(id);
  const current = suscripcionesMock[index];

  if (current.estado === estado) {
    throw HttpError.conflict(`La suscripción ya está ${estado}`);
  }

  const updated: Suscripcion = { ...current, estado };
  suscripcionesMock[index] = updated;
  return updated;
}

export function remove(id: number): Suscripcion {
  const index = findIndexOrThrow(id);
  const [removed] = suscripcionesMock.splice(index, 1);
  return removed;
}
