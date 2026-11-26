export interface ResumenDashboard {
  monedaReferencia: 'ARS';
  cotizacionUsdArs: number;
  gastoMensual: number;
  gastoAnual: number;
  suscripcionesActivas: number;
}

export interface GastoCategoria {
  categoriaId: number;
  categoria: string;
  gastoMensual: number;
  porcentaje: number;
}

export interface Renovacion {
  suscripcionId: number;
  plataforma: string;
  plan: string;
  fechaProximoCobro: string;
  costo: number;
  moneda: 'ARS' | 'USD';
  diasRestantes: number;
}