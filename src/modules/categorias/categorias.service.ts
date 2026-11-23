import type { ListResult } from '../../types/api.types';
import { HttpError } from '../../utils/HttpError';
import { listQuery } from '../../utils/listQuery';
import { list as listSuscripciones } from '../suscripciones/suscripciones.service';
import { categoriasMock } from './categorias.mock';
import type { Categoria } from './categorias.types';
import {
  normalizeNombre,
  parseCategoriaId,
  validateCreateCategoria,
  validateUpdateCategoria,
} from './categorias.validation';

const categorias: Categoria[] = categoriasMock.map((categoria) => ({ ...categoria }));
let nextId = Math.max(0, ...categorias.map((categoria) => categoria.id)) + 1;

function find(idParam: unknown): Categoria {
  const id = parseCategoriaId(idParam);
  const categoria = categorias.find((item) => item.id === id);
  if (!categoria) throw HttpError.notFound('Categoría no encontrada');
  return categoria;
}

function assertUnique(nombre: string, ignoreId?: number): void {
  if (
    categorias.some(
      (item) => item.id !== ignoreId && normalizeNombre(item.nombre) === normalizeNombre(nombre),
    )
  ) {
    throw HttpError.conflict('Ya existe una categoría con ese nombre');
  }
}

export function list(query: Record<string, unknown> = {}): ListResult<Categoria> {
  return listQuery(
    categorias.map((categoria) => ({ ...categoria })),
    query,
    {
      searchFields: ['nombre', 'descripcion'],
      filterFields: [],
      sortFields: ['id', 'nombre', 'descripcion'],
      defaultSortBy: 'id',
    },
  );
}

export function getById(id: unknown): Categoria {
  return { ...find(id) };
}

export function create(body: unknown): Categoria {
  const dto = validateCreateCategoria(body);
  assertUnique(dto.nombre);
  const categoria: Categoria = { id: nextId++, ...dto };
  categorias.push(categoria);
  return { ...categoria };
}

export function update(id: unknown, body: unknown, partial = true): Categoria {
  const categoria = find(id);
  const dto = partial ? validateUpdateCategoria(body) : validateCreateCategoria(body);
  assertUnique(dto.nombre ?? categoria.nombre, categoria.id);
  Object.assign(categoria, dto);
  return { ...categoria };
}

export function remove(id: unknown): Categoria {
  const categoria = find(id);
  const asociadas = listSuscripciones({ categoriaId: String(categoria.id), limit: '1' });
  if (asociadas.meta.total > 0) {
    throw HttpError.conflict('No se puede eliminar una categoría con suscripciones asociadas');
  }
  categorias.splice(categorias.indexOf(categoria), 1);
  return { ...categoria };
}
