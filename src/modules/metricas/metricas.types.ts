import type { ListResult } from '../../types/api.types';
import type { UsuarioPublico } from '../usuarios/usuarios.types';

export type UsuarioMetricas = Pick<UsuarioPublico, 'id' | 'rol' | 'estado'>;

export interface GrupoMetricas {
  id: number;
}

/** Subconjunto del contrato de Suscripciones necesario para los agregados. */
export interface SuscripcionMetricas {
  id: number;
  usuarioId: number;
  plataforma: string;
  costo: number;
  moneda: 'ARS' | 'USD';
  frecuencia: 'mensual' | 'trimestral' | 'anual';
  estado: 'activa' | 'pausada' | 'cancelada';
}

type ListSource<T> = (query: Record<string, unknown>) => ListResult<T> | Promise<ListResult<T>>;

/** Conectar con los services de los otros módulos, nunca con sus mocks. */
export interface MetricasSources {
  listGrupos: ListSource<GrupoMetricas>;
  listSuscripciones: ListSource<SuscripcionMetricas>;
}

export interface Metricas {
  totalUsuarios: number;
  totalGrupos: number;
  suscripcionesActivas: number;
  plataformasMasContratadas: { nombre: string; cantidad: number }[];
  gastoPromedioPorUsuario: number;
  monedaReferencia: 'ARS';
  periodo: 'mensual';
  cotizacionUsdArs: number;
}
