import type { Suscripcion } from '../suscripciones/suscripciones.types';
import * as suscripciones from '../suscripciones/suscripciones.service';
import * as categorias from '../categorias/categorias.service';
import type { GastoCategoria, Renovacion, ResumenDashboard } from './dashboard.types';

const COTIZACION_USD_ARS = 1200; // mockeada
const MONEDA_REF = 'ARS' as const;
const MESES_POR_COBRO: Record<Suscripcion['frecuencia'], number> = {
  mensual: 1,
  trimestral: 3,
  anual: 12,
};

const aArs = (monto: number, moneda: Suscripcion['moneda']) =>
  moneda === 'USD' ? monto * COTIZACION_USD_ARS : monto;

// Normaliza cada suscripción activa a gasto mensual en ARS
const mensualArs = (s: Pick<Suscripcion, 'costo' | 'moneda' | 'frecuencia'>): number =>
  aArs(s.costo, s.moneda) / MESES_POR_COBRO[s.frecuencia];

const redondear = (n: number) => Math.round(n * 100) / 100;

function activas() {
  return suscripciones.list({ page: 1, limit: 1000, estado: 'activa' }).data;
}

export function resumen(): ResumenDashboard {
  const subs = activas();
  const mensual = subs.reduce((acc, s) => acc + mensualArs(s), 0);
  return {
    monedaReferencia: MONEDA_REF,
    cotizacionUsdArs: COTIZACION_USD_ARS,
    gastoMensual: redondear(mensual),
    gastoAnual: redondear(mensual * 12),
    suscripcionesActivas: subs.length,
  };
}

export function porCategoria(): GastoCategoria[] {
  const subs = activas();
  const totalMensual = subs.reduce((acc, s) => acc + mensualArs(s), 0);
  const acumulado = new Map<number, number>();
  subs.forEach((s) => acumulado.set(s.categoriaId, (acumulado.get(s.categoriaId) ?? 0) + mensualArs(s)));

  return [...acumulado.entries()]
    .map(([categoriaId, gasto]) => ({
      categoriaId,
      categoria: categorias.getById(categoriaId).nombre,
      gastoMensual: redondear(gasto),
      porcentaje: totalMensual ? redondear((gasto / totalMensual) * 100) : 0,
    }))
    .sort((a, b) => b.gastoMensual - a.gastoMensual);
}

export function renovaciones(dias = 30): Renovacion[] {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const MS_DIA = 86_400_000;

  return activas()
    .map((s) => ({
      suscripcionId: s.id,
      plataforma: s.plataforma,
      plan: s.plan,
      fechaProximoCobro: s.fechaCobro,
      costo: s.costo,
      moneda: s.moneda,
      diasRestantes: Math.ceil((new Date(s.fechaCobro).getTime() - hoy.getTime()) / MS_DIA),
    }))
    .filter((r) => r.diasRestantes >= 0 && r.diasRestantes <= dias)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}