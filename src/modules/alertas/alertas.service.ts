import type { ListResult } from '../../types/api.types';
import { HttpError } from '../../utils/HttpError';
import { listQuery } from '../../utils/listQuery';
import { alertasMock } from './alertas.mock';
import type { Alerta, CreateAlertaDto, UpdateAlertaDto } from './alertas.types';

const alertas: Alerta[] = alertasMock.map((alerta) => ({ ...alerta }));

function firstString(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return undefined;

  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

function parseFecha(value: unknown): string | undefined {
  const raw = firstString(value);
  if (raw === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;

  const fecha = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime())) return undefined;

  return fecha.toISOString().slice(0, 10) === raw ? raw : undefined;
}

export function list(rawQuery: Record<string, unknown>): ListResult<Alerta> {
  const desde = parseFecha(rawQuery.desde);
  const hasta = parseFecha(rawQuery.hasta);

  const filtradas = alertas.filter(
    (alerta) =>
      (desde === undefined || alerta.fechaAviso >= desde) &&
      (hasta === undefined || alerta.fechaAviso <= hasta),
  );

  // Las opciones van explícitas porque, si no, listQuery toma los campos del primer elemento:
  // con el array vacío (por ejemplo, después de filtrar por desde/hasta) los filtros y el orden dejarían de funcionar.
  return listQuery(filtradas, rawQuery, {
    filterFields: ['estado', 'suscripcionId', 'usuarioId'],
    sortFields: [
      'id',
      'suscripcionId',
      'usuarioId',
      'diasAnticipacion',
      'fechaAviso',
      'estado',
      'creadaEn',
    ],
    searchFields: ['estado', 'canal'],
    defaultSortBy: 'id',
  });
}

export function getById(id: number): Alerta {
  const alerta = alertas.find((item) => item.id === id);

  if (!alerta) {
    throw HttpError.notFound('Alerta no encontrada');
  }

  return alerta;
}

export function create(dto: CreateAlertaDto): Alerta {
  // TODO: validar que suscripcionId exista usando el service de Suscripciones cuando esté disponible.
  const alerta: Alerta = {
    id: Math.max(0, ...alertas.map((item) => item.id)) + 1,
    suscripcionId: dto.suscripcionId,
    usuarioId: dto.usuarioId,
    diasAnticipacion: dto.diasAnticipacion,
    fechaAviso: dto.fechaAviso,
    canal: dto.canal,
    estado: dto.estado,
    creadaEn: new Date().toISOString(),
  };

  alertas.push(alerta);
  return alerta;
}

export function update(id: number, dto: UpdateAlertaDto): Alerta {
  // TODO: validar que suscripcionId exista usando el service de Suscripciones cuando esté disponible.
  const actual = getById(id);

  const cambios = Object.fromEntries(
    Object.entries(dto).filter(([, valor]) => valor !== undefined),
  ) as UpdateAlertaDto;

  Object.assign(actual, cambios, { id: actual.id, creadaEn: actual.creadaEn });
  return actual;
}

export function remove(id: number): Alerta {
  const alerta = getById(id);

  alertas.splice(alertas.indexOf(alerta), 1);
  return alerta;
}
