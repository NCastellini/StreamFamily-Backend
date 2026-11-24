import type { ListResult } from '../../types/api.types';
import { HttpError } from '../../utils/HttpError';
import { listQuery } from '../../utils/listQuery';
import * as suscripcionesService from '../suscripciones/suscripciones.service';
import type { Suscripcion } from '../suscripciones/suscripciones.types';
import * as usuariosService from '../usuarios/usuarios.service';
import { alertasMock } from './alertas.mock';
import type { Alerta, ComprobanteEnvio, CreateAlertaDto, UpdateAlertaDto } from './alertas.types';

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

// El 404 de Suscripciones se traduce a 422: acá el 404 indicaría que la alerta no existe.
function obtenerSuscripcion(suscripcionId: number): Suscripcion {
  try {
    return suscripcionesService.getById(suscripcionId);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      throw HttpError.unprocessable('La suscripción indicada no existe');
    }
    throw error;
  }
}

function validarReferencias(suscripcionId: number, usuarioId: number): void {
  const suscripcion = obtenerSuscripcion(suscripcionId);

  if (suscripcion.usuarioId !== usuarioId) {
    throw HttpError.unprocessable('El usuario indicado no es el dueño de la suscripción');
  }
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
  validarReferencias(dto.suscripcionId, dto.usuarioId);

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
  const actual = getById(id);

  if (dto.suscripcionId !== undefined || dto.usuarioId !== undefined) {
    validarReferencias(
      dto.suscripcionId ?? actual.suscripcionId,
      dto.usuarioId ?? actual.usuarioId,
    );
  }

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

// Simula el envío del aviso: no envía nada real ni modifica la alerta.
export function enviar(id: number): ComprobanteEnvio {
  const alerta = getById(id);

  if (alerta.estado === 'descartada') {
    throw HttpError.conflict('La alerta está descartada y no se puede enviar');
  }

  const destinatario = usuariosService.getById(alerta.usuarioId).email;

  console.log(
    `[Alertas] Envío simulado → destinatario: ${destinatario} | alerta: ${alerta.id} | suscripción: ${alerta.suscripcionId} | fecha de aviso: ${alerta.fechaAviso}`,
  );

  return {
    alertaId: alerta.id,
    canal: alerta.canal,
    destinatario,
    suscripcionId: alerta.suscripcionId,
    fechaAviso: alerta.fechaAviso,
    enviadoEn: new Date().toISOString(),
  };
}
