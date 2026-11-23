import type { ListResult } from '../../types/api.types';
import { HttpError } from '../../utils/HttpError';
import { MAX_LIMIT } from '../../utils/listQuery';
import { list as listGrupos } from '../grupos/grupos.service';
import { list as listSuscripciones } from '../suscripciones/suscripciones.service';
import { list as listUsuarios } from '../usuarios/usuarios.service';
import type {
  GrupoMetricas,
  Metricas,
  MetricasSources,
  SuscripcionMetricas,
  UsuarioMetricas,
} from './metricas.types';

// Cotización ficticia del prototipo; debe compartirse con Dashboard al integrar.
export const COTIZACION_USD_ARS_MOCK = 1200;
let sources: MetricasSources | undefined = { listGrupos, listSuscripciones };

export function configureMetricasSources(value: MetricasSources | undefined): void {
  sources = value;
}

/** Lee todas las páginas: contar solo la primera página daría métricas incorrectas. */
async function readAll<T extends { id: number }>(
  list: (query: Record<string, unknown>) => ListResult<T> | Promise<ListResult<T>>,
): Promise<T[]> {
  const result: T[] = [];
  const ids = new Set<number>();
  let total: number | undefined;
  for (let page = 1; ; page++) {
    const { data, meta } = await list({
      page: String(page),
      limit: String(MAX_LIMIT),
      sortBy: 'id',
      order: 'asc',
    });
    if (
      !Number.isSafeInteger(meta.total) ||
      meta.total < 0 ||
      meta.page !== page ||
      (total !== undefined && meta.total !== total)
    ) {
      throw new HttpError(503, 'No se pudo obtener una vista consistente para las métricas');
    }
    total = meta.total;
    for (const item of data) {
      if (ids.has(item.id)) {
        throw new HttpError(503, 'El servicio de origen devolvió registros duplicados');
      }
      ids.add(item.id);
      result.push(item);
    }
    if (result.length === total) return result;
    if (result.length > total || data.length === 0) {
      throw new HttpError(503, 'El servicio de origen devolvió una paginación inconsistente');
    }
  }
}

export function calculateMetricas(
  usuarios: readonly UsuarioMetricas[],
  grupos: readonly GrupoMetricas[],
  suscripciones: readonly SuscripcionMetricas[],
  cotizacionUsdArs = COTIZACION_USD_ARS_MOCK,
): Metricas {
  const vigentes = usuarios.filter(
    (usuario) => usuario.estado === 'activo' || usuario.estado === 'bloqueado',
  );
  const clientes = new Set(
    vigentes.filter((usuario) => usuario.rol === 'cliente').map((usuario) => usuario.id),
  );
  if (!Number.isFinite(cotizacionUsdArs) || cotizacionUsdArs <= 0) {
    throw HttpError.internal('Cotización inválida para calcular métricas');
  }
  const activas = suscripciones.filter((item) => item.estado === 'activa');
  const plataformas = new Map<string, { nombre: string; cantidad: number }>();
  const meses = { mensual: 1, trimestral: 3, anual: 12 };
  let gastoMensual = 0;
  for (const item of activas) {
    if (
      !Number.isFinite(item.costo) ||
      item.costo < 0 ||
      !Object.hasOwn(meses, item.frecuencia) ||
      (item.moneda !== 'ARS' && item.moneda !== 'USD') ||
      typeof item.plataforma !== 'string' ||
      !item.plataforma.trim()
    ) {
      throw HttpError.internal('Suscripción inválida para calcular métricas');
    }
    const nombre = item.plataforma.trim();
    const key = nombre.toLowerCase();
    const plataforma = plataformas.get(key);
    if (plataforma) plataforma.cantidad++;
    else plataformas.set(key, { nombre, cantidad: 1 });
    if (clientes.has(item.usuarioId)) {
      gastoMensual +=
        (item.costo * (item.moneda === 'USD' ? cotizacionUsdArs : 1)) / meses[item.frecuencia];
    }
  }
  const promedio = clientes.size === 0 ? 0 : gastoMensual / clientes.size;
  if (!Number.isFinite(promedio)) throw HttpError.internal('Gasto fuera de rango');
  return {
    totalUsuarios: vigentes.length,
    totalGrupos: grupos.length,
    suscripcionesActivas: activas.length,
    plataformasMasContratadas: [...plataformas.values()].sort(
      (a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'),
    ),
    gastoPromedioPorUsuario: Math.round((promedio + Number.EPSILON) * 100) / 100,
    monedaReferencia: 'ARS',
    periodo: 'mensual',
    cotizacionUsdArs,
  };
}

export async function getMetricas(): Promise<Metricas> {
  const currentSources = sources;
  if (!currentSources) {
    throw new HttpError(
      503,
      'Métricas pendientes de integrar con los servicios de grupos y suscripciones',
    );
  }
  const [usuarios, grupos, suscripciones] = await Promise.all([
    readAll(listUsuarios),
    readAll(currentSources.listGrupos),
    readAll(currentSources.listSuscripciones),
  ]);
  return calculateMetricas(usuarios, grupos, suscripciones);
}
