import { HttpError } from '../../utils/HttpError';
import { listQuery } from '../../utils/listQuery';
import { pagosMock } from './pagos.mock';
import { CreatePagoDto, Pago, UpdatePagoDto } from './pagos.types';

let pagos: Pago[] = [...pagosMock];
let nextId = Math.max(...pagos.map((p) => p.id)) + 1;

const fechaParam = (v: unknown): string | undefined => {
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' && s.trim() !== '' ? s.trim() : undefined;
};

const CAMPOS: (keyof Pago)[] = [
  'id', 'suscripcionId', 'fecha', 'monto', 'moneda', 'medioPagoId', 'estado',
];
export function list(rawQuery: Record<string, unknown>) {
  const desde = fechaParam(rawQuery.desde);
  const hasta = fechaParam(rawQuery.hasta);

  const enRango = pagos.filter(
    (p) => (!desde || p.fecha >= desde) && (!hasta || p.fecha <= hasta),
  );

  return listQuery<Pago>(enRango, rawQuery, {
    searchFields: ['fecha', 'monto', 'estado', 'moneda'],
    filterFields: CAMPOS,
    sortFields: CAMPOS,
    defaultSortBy: 'id',
    defaultOrder: 'asc',
  });
}

export function getById(id: number): Pago {
  const pago = pagos.find((p) => p.id === id);
  if (!pago) throw new HttpError(404, `Pago ${id} no encontrado`);
  return pago;
}

// Simulado en memoria: cambia mientras corre el server, no toca ninguna DB
export function create(dto: CreatePagoDto): Pago {
  const nuevo: Pago = { id: nextId++, ...dto };
  pagos.push(nuevo);
  return nuevo;
}

export function update(id: number, dto: UpdatePagoDto): Pago {
  const actual = getById(id);
  const actualizado = { ...actual, ...dto, id };
  pagos = pagos.map((p) => (p.id === id ? actualizado : p));
  return actualizado;
}

export function remove(id: number): void {
  getById(id);
  pagos = pagos.filter((p) => p.id !== id);
}

// Total acumulado pagado (opcionalmente por suscripción)
export function total(suscripcionId?: number) {
  const items = pagos.filter(
    (p) => p.estado === 'pagado' && (suscripcionId === undefined || p.suscripcionId === suscripcionId),
  );
  const porMoneda = items.reduce<Record<string, number>>((acc, p) => {
    acc[p.moneda] = Number(((acc[p.moneda] ?? 0) + p.monto).toFixed(2));
    return acc;
  }, {});
  return { suscripcionId: suscripcionId ?? null, cantidad: items.length, totalPorMoneda: porMoneda };
}