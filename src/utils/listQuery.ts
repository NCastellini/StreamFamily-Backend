import type { ListQuery, ListResult, PaginationMeta, SortOrder } from '../types/api.types';

/*
 * Helper genérico de listados.
 * Toma un array (mock) + req.query y devuelve { data, meta } listo para ok(res, data, { meta }).
 *
 * Query params soportados:
 *   page      → número de página (>= 1)                          default: 1
 *   limit     → registros por página (1..MAX_LIMIT)              default: 10
 *   sortBy    → campo por el que se ordena (lista blanca)        default: sin orden / defaultSortBy
 *   order     → asc | desc                                       default: asc / defaultOrder
 *   q         → búsqueda de texto en searchFields (contiene, sin distinguir mayúsculas ni tildes)
 *   <campo>   → filtro exacto por campo (ej: ?estado=activa&categoriaId=2)
 *
 * Valores inválidos → se reemplazan por el default (nunca devuelve 400 por un query param).
 */

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

/** Nombres que nunca se interpretan como filtro */
const RESERVED_PARAMS = new Set(['page', 'limit', 'sortBy', 'order', 'q']);

type Field<T> = keyof T & string;
type RawQuery = Record<string, unknown>;

export interface ListQueryOptions<T> {
  /** Campos donde busca "q". Si no se indica, "q" se ignora. */
  searchFields?: readonly Field<T>[];
  /** Campos permitidos para filtro exacto. Default: todos los campos del registro. */
  filterFields?: readonly Field<T>[];
  /** Campos permitidos para sortBy. Default: todos los campos del registro. */
  sortFields?: readonly Field<T>[];
  defaultSortBy?: Field<T>;
  defaultOrder?: SortOrder;
  defaultLimit?: number;
}

/* Helpers internos */

/** Primer valor string no vacío (Express entrega string | string[] si el param se repite) */
function firstString(value: unknown): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed === '' ? undefined : trimmed;
}

function toPositiveInt(value: unknown): number | undefined {
  const s = firstString(value);
  if (s === undefined || !/^\d+$/.test(s)) return undefined;
  const n = Number(s);
  return Number.isSafeInteger(n) && n >= 1 ? n : undefined;
}

/** Minúsculas y sin tildes: "Bahía" → "bahia" */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return '';
  return String(value);
}

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

/** Compara dos valores de cualquier tipo. null/undefined siempre al final. */
function compareValues(a: unknown, b: unknown, direction: 1 | -1): number {
  const aEmpty = a === null || a === undefined;
  const bEmpty = b === null || b === undefined;
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (typeof a === 'number' && typeof b === 'number') return (a - b) * direction;
  if (typeof a === 'boolean' && typeof b === 'boolean') return (Number(a) - Number(b)) * direction;
  if (a instanceof Date && b instanceof Date) return (a.getTime() - b.getTime()) * direction;
  return collator.compare(toText(a), toText(b)) * direction;
}

function matchesFilters<T extends object>(item: T, filters: ListQuery<T>['filters']): boolean {
  return (Object.entries(filters) as [Field<T>, string | undefined][]).every(
    ([field, expected]) =>
      expected === undefined || normalize(toText(item[field])) === normalize(expected),
  );
}

function matchesSearch<T extends object>(
  item: T,
  q: string | undefined,
  searchFields: readonly Field<T>[],
): boolean {
  if (!q || searchFields.length === 0) return true;
  const needle = normalize(q);
  return searchFields.some((field) => normalize(toText(item[field])).includes(needle));
}

/* API pública */

export function parseListQuery<T extends object>(
  raw: RawQuery,
  options: ListQueryOptions<T> = {},
): ListQuery<T> {
  const sortFields = options.sortFields ?? [];
  const filterFields = options.filterFields ?? [];
  const defaultLimit = Math.min(options.defaultLimit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const page = toPositiveInt(raw.page) ?? DEFAULT_PAGE;

  const requestedLimit = toPositiveInt(raw.limit);
  const limit = requestedLimit === undefined ? defaultLimit : Math.min(requestedLimit, MAX_LIMIT);

  const requestedSortBy = firstString(raw.sortBy);
  const sortBy = sortFields.find((field) => field === requestedSortBy) ?? options.defaultSortBy;

  const requestedOrder = firstString(raw.order)?.toLowerCase();
  const order: SortOrder =
    requestedOrder === 'asc' || requestedOrder === 'desc'
      ? requestedOrder
      : (options.defaultOrder ?? 'asc');

  const q = firstString(raw.q);

  const filters: ListQuery<T>['filters'] = {};
  for (const field of filterFields) {
    if (RESERVED_PARAMS.has(field)) continue;
    const value = firstString(raw[field]);
    if (value !== undefined) filters[field] = value;
  }

  return { page, limit, sortBy, order, q, filters };
}

/** Aplica un ListQuery ya normalizado sobre un array. No modifica el array original. */
export function applyListQuery<T extends object>(
  items: readonly T[],
  query: ListQuery<T>,
  searchFields: readonly Field<T>[] = [],
): ListResult<T> {
  const result = items.filter(
    (item) => matchesFilters(item, query.filters) && matchesSearch(item, query.q, searchFields),
  );

  const { sortBy } = query;
  if (sortBy) {
    const direction = query.order === 'desc' ? -1 : 1;
    result.sort((a, b) => compareValues(a[sortBy], b[sortBy], direction));
  }

  const total = result.length;
  const start = (query.page - 1) * query.limit;

  const meta: PaginationMeta = {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };

  return { data: result.slice(start, start + query.limit), meta };
}

export function listQuery<T extends object>(
  items: readonly T[],
  rawQuery: RawQuery,
  options: ListQueryOptions<T> = {},
): ListResult<T> {
  const allFields = items.length > 0 ? (Object.keys(items[0] as object) as Field<T>[]) : [];

  const query = parseListQuery(rawQuery, {
    ...options,
    sortFields: options.sortFields ?? allFields,
    filterFields: options.filterFields ?? allFields,
  });

  return applyListQuery(items, query, options.searchFields);
}