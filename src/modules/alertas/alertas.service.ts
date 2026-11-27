import type { AuthUser, ListResult } from '../../types/api.types';
import { esAdmin, exigirPropio } from '../../utils/acceso';
import { diasRestantes, hoyArgentina, proximoCobro, sumarDias } from '../../utils/fechas';
import { HttpError } from '../../utils/HttpError';
import { listQuery, type ListQueryOptions } from '../../utils/listQuery';
import * as suscripcionesService from '../suscripciones/suscripciones.service';
import type { Suscripcion } from '../suscripciones/suscripciones.types';
import * as usuariosService from '../usuarios/usuarios.service';
import { alertasMock } from './alertas.mock';
import type {
  Alerta,
  ComprobanteEnvio,
  CreateAlertaDto,
  ProximoVencimiento,
  UpdateAlertaDto,
} from './alertas.types';

const DIAS_PROXIMAS_DEFAULT = 7;
const DIAS_PROXIMAS_MAX = 90;

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

// Nunca falla: si el valor es inválido usa el default y si supera el máximo lo recorta.
function parseDias(value: unknown): number {
  const raw = firstString(value);
  if (raw === undefined || !/^\d+$/.test(raw)) return DIAS_PROXIMAS_DEFAULT;

  const dias = Number(raw);
  if (dias < 1) return DIAS_PROXIMAS_DEFAULT;

  return Math.min(dias, DIAS_PROXIMAS_MAX);
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

// Las opciones van explícitas porque, si no, listQuery toma los campos del primer elemento:
// con el array vacío (por ejemplo, después de filtrar por desde/hasta) los filtros y el orden dejarían de funcionar.
const LIST_OPTIONS: ListQueryOptions<Alerta> = {
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
};

// Aplica desde/hasta y después filtros, orden y paginación sobre la base recibida.
function listarDesde(
  base: readonly Alerta[],
  rawQuery: Record<string, unknown>,
): ListResult<Alerta> {
  const desde = parseFecha(rawQuery.desde);
  const hasta = parseFecha(rawQuery.hasta);

  const filtradas = base.filter(
    (alerta) =>
      (desde === undefined || alerta.fechaAviso >= desde) &&
      (hasta === undefined || alerta.fechaAviso <= hasta),
  );

  return listQuery(filtradas, rawQuery, LIST_OPTIONS);
}

// Se trabaja sobre copias (filter/map): nunca se modifican los arrays recibidos.
function calcularProximas(
  suscripciones: readonly Suscripcion[],
  alertasBase: readonly Alerta[],
  rawQuery: Record<string, unknown>,
): ProximoVencimiento[] {
  const dias = parseDias(rawQuery.dias);
  const hoy = hoyArgentina();
  const hasta = sumarDias(hoy, dias);

  return suscripciones
    .filter((suscripcion) => suscripcion.estado === 'activa')
    .map((suscripcion) => ({
      suscripcion,
      fecha: proximoCobro(suscripcion.fechaCobro, suscripcion.frecuencia, hoy),
    }))
    .filter(({ fecha }) => fecha >= hoy && fecha <= hasta)
    .map(({ suscripcion, fecha }) => ({
      suscripcionId: suscripcion.id,
      plataforma: suscripcion.plataforma,
      plan: suscripcion.plan,
      costo: suscripcion.costo,
      moneda: suscripcion.moneda,
      frecuencia: suscripcion.frecuencia,
      proximoCobro: fecha,
      diasRestantes: diasRestantes(fecha, hoy),
      tieneAlertaActiva: alertasBase.some(
        (alerta) => alerta.suscripcionId === suscripcion.id && alerta.estado === 'activa',
      ),
    }))
    .sort(
      (a, b) => a.proximoCobro.localeCompare(b.proximoCobro) || a.suscripcionId - b.suscripcionId,
    );
}

export function list(rawQuery: Record<string, unknown>): ListResult<Alerta> {
  return listarDesde(alertas, rawQuery);
}

export function proximas(rawQuery: Record<string, unknown>): ProximoVencimiento[] {
  return calcularProximas(suscripcionesService.getAll(), alertas, rawQuery);
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

/* ------------------------------------------------------------------
 * Control de acceso por usuario (issue #64)
 * Las funciones de arriba son acceso interno "de sistema" (las usan otros
 * módulos, como Suscripciones). Las rutas usan las funciones ...For, que
 * reciben el usuario logueado (req.user).
 * Admin: ve y modifica todo. Cliente: solo sus propias alertas.
 * ------------------------------------------------------------------ */

// Ajena → 404 con el mismo mensaje exacto que si no existiera, para no revelar que existe.
function getAccesible(actor: AuthUser, id: number): Alerta {
  const alerta = getById(id);

  if (!esAdmin(actor) && alerta.usuarioId !== actor.id) {
    throw HttpError.notFound('Alerta no encontrada');
  }

  return alerta;
}

export function listFor(actor: AuthUser, rawQuery: Record<string, unknown>): ListResult<Alerta> {
  if (esAdmin(actor)) return list(rawQuery);

  // Un cliente no puede pedir datos de otro con ?usuarioId=. Se filtra antes de paginar
  // para que meta.total y las páginas sean correctos.
  const { usuarioId: _ignorado, ...query } = rawQuery;
  const propias = alertas.filter((alerta) => alerta.usuarioId === actor.id);
  return listarDesde(propias, query);
}

export function proximasFor(
  actor: AuthUser,
  rawQuery: Record<string, unknown>,
): ProximoVencimiento[] {
  if (esAdmin(actor)) return proximas(rawQuery);

  const visibles = suscripcionesService
    .getAll()
    .filter((suscripcion) => suscripcionesService.puedeVer(actor, suscripcion));
  const propias = alertas.filter((alerta) => alerta.usuarioId === actor.id);
  return calcularProximas(visibles, propias, rawQuery);
}

export function getByIdFor(actor: AuthUser, id: number): Alerta {
  return getAccesible(actor, id);
}

export function createFor(actor: AuthUser, dto: CreateAlertaDto): Alerta {
  exigirPropio(actor, dto.usuarioId);
  return create(dto);
}

export function updateFor(actor: AuthUser, id: number, dto: UpdateAlertaDto): Alerta {
  getAccesible(actor, id);
  if (dto.usuarioId !== undefined) exigirPropio(actor, dto.usuarioId);
  return update(id, dto);
}

export function removeFor(actor: AuthUser, id: number): Alerta {
  getAccesible(actor, id);
  return remove(id);
}

// El control va antes de enviar(): si la alerta es ajena no se registra ningún envío.
export function enviarFor(actor: AuthUser, id: number): ComprobanteEnvio {
  getAccesible(actor, id);
  return enviar(id);
}
