import type { AuthUser, ListResult } from '../../types/api.types';
import { esAdmin, exigirPropio } from '../../utils/acceso';
import { HttpError } from '../../utils/HttpError';
import { listQuery } from '../../utils/listQuery';
import * as alertasService from '../alertas/alertas.service';
import * as categoriasService from '../categorias/categorias.service';
import { gruposMock } from '../grupos/grupos.mock';
import { mediosPagoMock } from '../medios-pago/medios-pago.mock';
import * as pagosService from '../pagos/pagos.service';
import * as usuariosService from '../usuarios/usuarios.service';
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

/** true si getById encuentra el registro; false si responde 404 */
function existe(buscar: () => unknown): boolean {
  try {
    buscar();
    return true;
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return false;
    throw error;
  }
}

/** Verifica que los IDs que apuntan a otras entidades existan */
function ensureReferences(s: Suscripcion): void {
  if (!mediosPagoMock.some((m) => m.id === s.medioPagoId)) {
    throw HttpError.badRequest(`No existe el medio de pago ${s.medioPagoId}`);
  }
  if (s.grupoId !== null && !gruposMock.some((g) => g.id === s.grupoId)) {
    throw HttpError.badRequest(`No existe el grupo ${s.grupoId}`);
  }
  if (!existe(() => categoriasService.getById(s.categoriaId))) {
    throw HttpError.badRequest(`No existe la categoría ${s.categoriaId}`);
  }
  if (!existe(() => usuariosService.getById(s.usuarioId))) {
    throw HttpError.badRequest(`No existe el usuario ${s.usuarioId}`);
  }
}

/** Solo se asignan suscripciones a usuarios activos (no bloqueados ni dados de baja). */
function ensureUsuarioActivo(usuarioId: number): void {
  if (!existe(() => usuariosService.getById(usuarioId))) return; // lo informa ensureReferences
  if (usuariosService.getById(usuarioId).estado !== 'activo') {
    throw HttpError.badRequest(`El usuario ${usuarioId} no está activo`);
  }
}

/**
 * Cantidad de pagos y alertas asociados.
 * Pagos y Alertas se consultan dentro de la función (nunca al cargar el archivo)
 * porque Alertas ya importa este service: así la importación circular no falla.
 */
function contarAsociados(id: number): { pagos: number; alertas: number } {
  const query = { suscripcionId: String(id), limit: '1' };
  return {
    pagos: pagosService.list(query).meta.total,
    alertas: alertasService.list(query).meta.total,
  };
}

function findIndexOrThrow(id: number): number {
  const index = suscripcionesMock.findIndex((s) => s.id === id);
  if (index === -1) {
    throw HttpError.notFound('Suscripción no encontrada');
  }
  return index;
}

const LIST_OPTIONS = {
  searchFields: SEARCH_FIELDS,
  filterFields: FILTER_FIELDS,
  sortFields: SORT_FIELDS,
  defaultSortBy: 'id',
} as const;

export function list(rawQuery: Record<string, unknown>): ListResult<Suscripcion> {
  return listQuery(suscripcionesMock, rawQuery, LIST_OPTIONS);
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
  ensureUsuarioActivo(suscripcion.usuarioId);
  nextId += 1;
  suscripcionesMock.push(suscripcion);
  return suscripcion;
}

export function update(id: number, dto: UpdateSuscripcionDto): Suscripcion {
  const index = findIndexOrThrow(id);
  const updated: Suscripcion = { ...suscripcionesMock[index], ...dto };

  ensureReferences(updated);
  if (dto.usuarioId !== undefined) ensureUsuarioActivo(dto.usuarioId);
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
  const asociados = contarAsociados(id);
  if (asociados.pagos > 0 || asociados.alertas > 0) {
    throw HttpError.conflict(
      'No se puede eliminar: la suscripción tiene pagos o alertas asociados. Cancelala en lugar de eliminarla.',
      asociados,
    );
  }
  const [removed] = suscripcionesMock.splice(index, 1);
  return removed;
}

/* ------------------------------------------------------------------
 * Control de acceso por usuario
 * Las funciones de arriba son de "sistema" (las usan Dashboard, Alertas,
 * Grupos, Categorías y Métricas) y no cambian. Las rutas usan las
 * funciones ...For, que reciben el usuario logueado (req.user).
 * Admin: ve y modifica todo. Cliente: ve lo propio y lo de sus grupos;
 * solo modifica lo propio.
 * ------------------------------------------------------------------ */

/** Se usa gruposMock (no grupos.service) para no formar una importación circular. */
function esMiembroGrupo(grupoId: number, usuarioId: number): boolean {
  return gruposMock.some((g) => g.id === grupoId && g.miembros.includes(usuarioId));
}

/** Dueño, admin, o miembro del grupo al que está asociada la suscripción. */
export function puedeVer(actor: AuthUser, s: Suscripcion): boolean {
  if (esAdmin(actor) || s.usuarioId === actor.id) return true;
  return s.grupoId !== null && esMiembroGrupo(s.grupoId, actor.id);
}

/** Solo el dueño (o un admin) puede modificarla o borrarla. */
export function esDueno(actor: AuthUser, s: Suscripcion): boolean {
  return esAdmin(actor) || s.usuarioId === actor.id;
}

/** Ajena e invisible → 404 con el mismo mensaje que si no existiera. */
function getVisible(actor: AuthUser, id: number): Suscripcion {
  const suscripcion = getById(id);
  if (!puedeVer(actor, suscripcion)) {
    throw HttpError.notFound('Suscripción no encontrada');
  }
  return suscripcion;
}

/** Visible pero de otro usuario (por ejemplo, compartida en el grupo) → 403. */
function getPropia(actor: AuthUser, id: number): Suscripcion {
  const suscripcion = getVisible(actor, id);
  if (!esDueno(actor, suscripcion)) {
    throw HttpError.forbidden('Solo el dueño puede modificar esta suscripción');
  }
  return suscripcion;
}

/** No se puede asociar una suscripción a un grupo del que no se es miembro. */
function exigirGrupoPropio(actor: AuthUser, grupoId: number | null | undefined): void {
  if (grupoId === undefined || grupoId === null || esAdmin(actor)) return;
  const existe = gruposMock.some((g) => g.id === grupoId);
  // Si el grupo no existe, lo informa ensureReferences con un 400.
  if (existe && !esMiembroGrupo(grupoId, actor.id)) {
    throw HttpError.forbidden('No es miembro del grupo indicado');
  }
}

export function listFor(
  actor: AuthUser,
  rawQuery: Record<string, unknown>,
): ListResult<Suscripcion> {
  if (esAdmin(actor)) return list(rawQuery);
  // Un cliente no puede pedir datos de otro con ?usuarioId=
  const { usuarioId: _ignorado, ...query } = rawQuery;
  const visibles = suscripcionesMock.filter((s) => puedeVer(actor, s));
  return listQuery(visibles, query, LIST_OPTIONS);
}

export function getByIdFor(actor: AuthUser, id: number): Suscripcion {
  return getVisible(actor, id);
}

export function createFor(actor: AuthUser, dto: CreateSuscripcionDto): Suscripcion {
  exigirPropio(actor, dto.usuarioId);
  exigirGrupoPropio(actor, dto.grupoId);
  return create(dto);
}

export function updateFor(actor: AuthUser, id: number, dto: UpdateSuscripcionDto): Suscripcion {
  getPropia(actor, id);
  if (dto.usuarioId !== undefined) exigirPropio(actor, dto.usuarioId);
  exigirGrupoPropio(actor, dto.grupoId);
  return update(id, dto);
}

export function changeEstadoFor(
  actor: AuthUser,
  id: number,
  estado: EstadoSuscripcion,
): Suscripcion {
  getPropia(actor, id);
  return changeEstado(id, estado);
}

export function removeFor(actor: AuthUser, id: number): Suscripcion {
  getPropia(actor, id);
  return remove(id);
}
