import type { AuthUser, ListResult } from '../../types/api.types';
import { esAdmin, exigirAcceso, exigirPropio } from '../../utils/acceso';
import { HttpError } from '../../utils/HttpError';
import { listQuery } from '../../utils/listQuery';
import { getAll as getAllSuscripciones } from '../suscripciones/suscripciones.service';
import { gruposMock } from './grupos.mock';
import type { CreateGrupoDto, Grupo, ResumenGrupo, UpdateGrupoDto } from './grupos.types';

const SORT_FIELDS = ['id', 'nombre', 'administradorId', 'creadoEn'] as const;

let nextGrupoId = Math.max(0, ...gruposMock.map((grupo) => grupo.id)) + 1;

function normalizeName(nombre: string): string {
  return nombre.trim().toLocaleLowerCase('es');
}

function ensureUniqueName(nombre: string, excludedId?: number): void {
  const normalizedName = normalizeName(nombre);
  const duplicate = gruposMock.some(
    (grupo) => grupo.id !== excludedId && normalizeName(grupo.nombre) === normalizedName,
  );

  if (duplicate) {
    throw HttpError.conflict('Ya existe un grupo con ese nombre');
  }
}

function ensureValidState(grupo: Grupo): void {
  if (new Set(grupo.miembros).size !== grupo.miembros.length) {
    throw HttpError.badRequest('El grupo no puede contener miembros repetidos');
  }

  if (!grupo.miembros.includes(grupo.administradorId)) {
    throw HttpError.badRequest('El administrador debe pertenecer a miembros');
  }
}

function firstQueryString(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return undefined;

  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

function parseUsuarioIdFilter(value: unknown): number | undefined {
  const raw = firstQueryString(value);
  if (raw === undefined || !/^\d+$/.test(raw)) return undefined;

  const usuarioId = Number(raw);
  return Number.isSafeInteger(usuarioId) && usuarioId >= 1 ? usuarioId : undefined;
}

function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function monthlyCost(cost: number, frequency: 'mensual' | 'trimestral' | 'anual'): number {
  if (frequency === 'trimestral') return cost / 3;
  if (frequency === 'anual') return cost / 12;
  return cost;
}

export function list(rawQuery: Record<string, unknown>): ListResult<Grupo> {
  const usuarioId = parseUsuarioIdFilter(rawQuery.usuarioId);
  const grupos =
    usuarioId === undefined
      ? gruposMock
      : gruposMock.filter((grupo) => grupo.miembros.includes(usuarioId));

  return listQuery(grupos, rawQuery, {
    searchFields: ['nombre'],
    filterFields: [],
    sortFields: SORT_FIELDS,
    defaultSortBy: 'id',
  });
}

export function getById(id: number): Grupo {
  const grupo = gruposMock.find((item) => item.id === id);

  if (!grupo) {
    throw HttpError.notFound('Grupo no encontrado');
  }

  return grupo;
}

export function getSummary(id: number): ResumenGrupo {
  const grupo = getById(id);
  const subscriptions = getAllSuscripciones().filter(
    (subscription) => subscription.grupoId === id && subscription.estado === 'activa',
  );
  const subtotal = { ARS: 0, USD: 0 };

  for (const subscription of subscriptions) {
    subtotal[subscription.moneda] += monthlyCost(subscription.costo, subscription.frecuencia);
  }

  return {
    grupoId: grupo.id,
    nombre: grupo.nombre,
    cantidadMiembros: grupo.miembros.length,
    suscripcionesActivas: subscriptions.length,
    subtotalMensual: {
      ARS: roundToTwoDecimals(subtotal.ARS),
      USD: roundToTwoDecimals(subtotal.USD),
    },
  };
}

export function create(dto: CreateGrupoDto): Grupo {
  ensureUniqueName(dto.nombre);

  const grupo: Grupo = {
    ...dto,
    id: nextGrupoId,
    nombre: dto.nombre.trim(),
    miembros: [...dto.miembros],
    creadoEn: new Date().toISOString(),
  };

  ensureValidState(grupo);
  nextGrupoId += 1;
  gruposMock.push(grupo);
  return grupo;
}

export function update(id: number, dto: UpdateGrupoDto): Grupo {
  const index = gruposMock.findIndex((grupo) => grupo.id === id);

  if (index === -1) {
    throw HttpError.notFound('Grupo no encontrado');
  }

  const current = gruposMock[index];
  const updated: Grupo = {
    ...current,
    ...dto,
    nombre: dto.nombre?.trim() ?? current.nombre,
    miembros: dto.miembros ? [...dto.miembros] : [...current.miembros],
  };

  ensureUniqueName(updated.nombre, id);
  ensureValidState(updated);
  gruposMock[index] = updated;
  return updated;
}

export function remove(id: number): Grupo {
  const index = gruposMock.findIndex((grupo) => grupo.id === id);

  if (index === -1) {
    throw HttpError.notFound('Grupo no encontrado');
  }

  const [removed] = gruposMock.splice(index, 1);
  return removed;
}

export function addMember(id: number, usuarioId: number): Grupo {
  const grupo = getById(id);

  if (grupo.miembros.includes(usuarioId)) {
    throw HttpError.conflict('El usuario ya pertenece al grupo');
  }

  grupo.miembros.push(usuarioId);
  return grupo;
}

export function removeMember(id: number, usuarioId: number): Grupo {
  const grupo = getById(id);

  if (!grupo.miembros.includes(usuarioId)) {
    throw HttpError.notFound('Miembro no encontrado en el grupo');
  }

  if (grupo.administradorId === usuarioId) {
    throw HttpError.conflict('Debe cambiar el administrador antes de quitarlo del grupo');
  }

  grupo.miembros = grupo.miembros.filter((miembroId) => miembroId !== usuarioId);
  return grupo;
}

export function esMiembro(grupoId: number, usuarioId: number): boolean {
  return gruposMock.some((grupo) => grupo.id === grupoId && grupo.miembros.includes(usuarioId));
}

export function listFor(actor: AuthUser, query: Record<string, unknown>): ListResult<Grupo> {
  return list(esAdmin(actor) ? query : { ...query, usuarioId: String(actor.id) });
}

export function getByIdFor(actor: AuthUser, id: number): Grupo {
  const grupo = getById(id);
  exigirAcceso(esAdmin(actor) || grupo.miembros.includes(actor.id), 'Grupo');
  return grupo;
}

export function getSummaryFor(actor: AuthUser, id: number): ResumenGrupo {
  getByIdFor(actor, id);
  return getSummary(id);
}

export function createFor(actor: AuthUser, dto: CreateGrupoDto): Grupo {
  exigirPropio(actor, dto.administradorId);
  return create(dto);
}

function exigirAdministrador(actor: AuthUser, id: number): void {
  const grupo = getByIdFor(actor, id);
  if (!esAdmin(actor) && grupo.administradorId !== actor.id) {
    throw HttpError.forbidden('Solo el administrador del grupo puede realizar esta acción');
  }
}

export function updateFor(actor: AuthUser, id: number, dto: UpdateGrupoDto): Grupo {
  exigirAdministrador(actor, id);
  return update(id, dto);
}

export function removeFor(actor: AuthUser, id: number): Grupo {
  exigirAdministrador(actor, id);
  return remove(id);
}

export function addMemberFor(actor: AuthUser, id: number, usuarioId: number): Grupo {
  exigirAdministrador(actor, id);
  return addMember(id, usuarioId);
}

export function removeMemberFor(actor: AuthUser, id: number, usuarioId: number): Grupo {
  if (usuarioId === actor.id) {
    getByIdFor(actor, id);
  } else {
    exigirAdministrador(actor, id);
  }
  return removeMember(id, usuarioId);
}
