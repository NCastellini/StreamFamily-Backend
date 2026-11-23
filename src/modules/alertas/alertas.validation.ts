import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../utils/HttpError';
import { CANALES_ALERTA, ESTADOS_ALERTA } from './alertas.types';
import type { CreateAlertaDto } from './alertas.types';

interface ErrorCampo {
  campo: string;
  error: string;
}

type Cuerpo = Record<string, unknown>;
type CampoAlerta = keyof CreateAlertaDto;

const CAMPOS_ALERTA: readonly CampoAlerta[] = [
  'suscripcionId',
  'usuarioId',
  'diasAnticipacion',
  'fechaAviso',
  'canal',
  'estado',
];

function esEnteroPositivo(valor: unknown): boolean {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0;
}

function esEnteroEnRango(valor: unknown, min: number, max: number): boolean {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= min && valor <= max;
}

function esFechaValida(valor: unknown): boolean {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;

  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function esValorPermitido(valor: unknown, permitidos: readonly string[]): boolean {
  return typeof valor === 'string' && permitidos.includes(valor);
}

function esCampoAlerta(campo: string): campo is CampoAlerta {
  return (CAMPOS_ALERTA as readonly string[]).includes(campo);
}

function obtenerCuerpo(body: unknown): Cuerpo {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw HttpError.badRequest('El cuerpo de la petición debe ser un objeto JSON');
  }

  return body as Cuerpo;
}

function validarCampo(campo: CampoAlerta, valor: unknown): string | undefined {
  switch (campo) {
    case 'suscripcionId':
    case 'usuarioId':
      return esEnteroPositivo(valor) ? undefined : 'Debe ser un número entero positivo';
    case 'diasAnticipacion':
      return esEnteroEnRango(valor, 1, 30) ? undefined : 'Debe ser un número entero entre 1 y 30';
    case 'fechaAviso':
      return esFechaValida(valor)
        ? undefined
        : 'Debe tener formato YYYY-MM-DD y ser una fecha válida';
    case 'canal':
      return esValorPermitido(valor, CANALES_ALERTA)
        ? undefined
        : `Debe ser uno de: ${CANALES_ALERTA.join(', ')}`;
    case 'estado':
      return esValorPermitido(valor, ESTADOS_ALERTA)
        ? undefined
        : `Debe ser uno de: ${ESTADOS_ALERTA.join(', ')}`;
  }
}

function validarCampos(cuerpo: Cuerpo, exigirTodos: boolean): ErrorCampo[] {
  const errores: ErrorCampo[] = [];

  for (const campo of Object.keys(cuerpo)) {
    if (!esCampoAlerta(campo)) {
      errores.push({ campo, error: 'Campo no permitido' });
    }
  }

  for (const campo of CAMPOS_ALERTA) {
    if (!Object.hasOwn(cuerpo, campo)) {
      if (exigirTodos) errores.push({ campo, error: 'Campo obligatorio' });
      continue;
    }

    const error = validarCampo(campo, cuerpo[campo]);
    if (error !== undefined) errores.push({ campo, error });
  }

  return errores;
}

function lanzarSiHayErrores(errores: ErrorCampo[]): void {
  if (errores.length > 0) {
    throw HttpError.badRequest('Datos inválidos', errores);
  }
}

export function validarId(req: Request, _res: Response, next: NextFunction): void {
  const id = req.params.id;

  if (typeof id !== 'string' || !/^\d+$/.test(id)) {
    throw HttpError.badRequest('El id debe ser un número entero positivo');
  }

  const numero = Number(id);
  if (!Number.isSafeInteger(numero) || numero < 1) {
    throw HttpError.badRequest('El id debe ser un número entero positivo');
  }

  next();
}

export function validarAlta(req: Request, _res: Response, next: NextFunction): void {
  const cuerpo = obtenerCuerpo(req.body);

  lanzarSiHayErrores(validarCampos(cuerpo, true));
  next();
}

export function validarEdicion(req: Request, _res: Response, next: NextFunction): void {
  const cuerpo = obtenerCuerpo(req.body);

  if (Object.keys(cuerpo).length === 0) {
    throw HttpError.badRequest('Debe enviar al menos un campo para modificar');
  }

  lanzarSiHayErrores(validarCampos(cuerpo, false));
  next();
}
