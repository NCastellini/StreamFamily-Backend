import { HttpError } from '../../utils/HttpError';
import { listQuery } from '../../utils/listQuery';
import { pagosMock } from './pagos.mock';
import type { CreatePagoDto, Pago, UpdatePagoDto } from './pagos.types';
import { exigirAcceso } from '../../utils/acceso';
import { esDueno, puedeVer, } from '../suscripciones/suscripciones.service';
import * as suscripcionesService from '../suscripciones/suscripciones.service';
import type { Suscripcion } from '../suscripciones/suscripciones.types';

type Actor = NonNullable<Express.Request['user']>;

let pagos: Pago[] = [...pagosMock];
let nextId = Math.max(...pagos.map((p) => p.id)) + 1;

const esAdmin = (actor: Actor) => actor.role === 'admin';

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

const buscarSuscripcion = (id: number): Suscripcion | undefined =>
  suscripcionesService.getAll().find((s) => s.id === id);

// No lanza si no existe: así un pago huérfano no rompe el listado
const suscripcionDe = (pago: Pago): Suscripcion | undefined =>
  buscarSuscripcion(pago.suscripcionId);

const veSuscripcion = (actor: Actor, sub: Suscripcion) =>
  esAdmin(actor) || puedeVer(actor, sub);

const escribeSuscripcion = (actor: Actor, sub: Suscripcion) =>
  esAdmin(actor) || esDueno(actor, sub);

// Pago sin suscripción: invisible para un cliente, visible para el admin
const puedeVerPago = (actor: Actor, pago: Pago): boolean => {
  const sub = suscripcionDe(pago);
  return sub ? veSuscripcion(actor, sub) : esAdmin(actor);
};

const exigirPagoPropio = (actor: Actor, pago: Pago): void => {
  const sub = suscripcionDe(pago);
  const permitido = sub ? escribeSuscripcion(actor, sub) : esAdmin(actor);
  if (!permitido) throw new HttpError(403, 'No tenés permiso para modificar este pago');
};

const exigirSuscripcionPropia = (actor: Actor, suscripcionId: number): void => {
  const sub = buscarSuscripcion(suscripcionId);
  if (!sub) throw new HttpError(404, `Suscripción ${suscripcionId} no encontrada`);
  if (!escribeSuscripcion(actor, sub)) {
    throw new HttpError(403, 'No podés operar pagos sobre una suscripción ajena');
  }
};

const OPCIONES_LISTADO = {
  searchFields: ['fecha', 'monto', 'estado', 'moneda'],
  filterFields: CAMPOS,
  sortFields: CAMPOS,
  defaultSortBy: 'id',
  defaultOrder: 'asc',
} as const;

export function listFor(actor: Actor, rawQuery: Record<string, unknown>) {
  const desde = fechaParam(rawQuery.desde);
  const hasta = fechaParam(rawQuery.hasta);

  // Se filtra ANTES de listQuery para que meta.total refleje solo lo visible
  const visibles = pagos.filter(
    (p) =>
      puedeVerPago(actor, p) &&
      (!desde || p.fecha >= desde) &&
      (!hasta || p.fecha <= hasta),
  );

  return listQuery<Pago>(visibles, rawQuery, OPCIONES_LISTADO);
}

export function getByIdFor(actor: Actor, id: number): Pago {
  const pago = getById(id); // 404 si no existe
  exigirAcceso(puedeVerPago(actor, pago), 'Pago'); // mismo 404 si no es visible
  return pago;
}

export function createFor(actor: Actor, dto: CreatePagoDto): Pago {
  exigirSuscripcionPropia(actor, dto.suscripcionId);
  return create(dto);
}

export function updateFor(actor: Actor, id: number, dto: UpdatePagoDto): Pago {
  const pago = getById(id);
  exigirAcceso(puedeVerPago(actor, pago), 'Pago'); // no visible → 404
  exigirPagoPropio(actor, pago);                   // visible pero no propio → 403
  if (dto.suscripcionId !== undefined && dto.suscripcionId !== pago.suscripcionId) {
    exigirSuscripcionPropia(actor, dto.suscripcionId); // la nueva también
  }
  return update(id, dto);
}

export function removeFor(actor: Actor, id: number): void {
  const pago = getById(id);
  exigirAcceso(puedeVerPago(actor, pago), 'Pago');
  exigirPagoPropio(actor, pago);
  remove(id);
}

export function totalFor(actor: Actor, suscripcionId?: number) {
  if (suscripcionId !== undefined && !esAdmin(actor)) {
    const sub = buscarSuscripcion(suscripcionId);
    if (!sub || !puedeVer(actor, sub)) {
      throw new HttpError(404, `Suscripción ${suscripcionId} no encontrada`);
    }
  }

  const items = pagos.filter(
    (p) =>
      p.estado === 'pagado' &&
      (suscripcionId === undefined || p.suscripcionId === suscripcionId) &&
      puedeVerPago(actor, p),
  );

  const totalPorMoneda = items.reduce<Record<string, number>>((acc, p) => {
    acc[p.moneda] = Number(((acc[p.moneda] ?? 0) + p.monto).toFixed(2));
    return acc;
  }, {});

  return { suscripcionId: suscripcionId ?? null, cantidad: items.length, totalPorMoneda };
}