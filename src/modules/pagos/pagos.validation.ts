import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../utils/HttpError';

const MONEDAS = ['ARS', 'USD'];
const ESTADOS = ['pagado', 'pendiente'];
const esFecha = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const esEntero = (v: unknown) => Number.isInteger(v) && (v as number) > 0;

function validar(body: Record<string, unknown>, parcial: boolean): string[] {
  const errores: string[] = [];
  const req = (campo: string) => !parcial || body[campo] !== undefined;

  if (req('suscripcionId') && !esEntero(body.suscripcionId)) errores.push('suscripcionId debe ser un entero positivo');
  if (req('medioPagoId') && !esEntero(body.medioPagoId)) errores.push('medioPagoId debe ser un entero positivo');
  if (req('fecha') && !esFecha(body.fecha)) errores.push('fecha debe ser una fecha válida (YYYY-MM-DD)');
  if (req('monto') && !(typeof body.monto === 'number' && body.monto > 0)) errores.push('monto debe ser un número mayor a 0');
  if (req('moneda') && !MONEDAS.includes(body.moneda as string)) errores.push("moneda debe ser 'ARS' o 'USD'");
  if (req('estado') && !ESTADOS.includes(body.estado as string)) errores.push("estado debe ser 'pagado' o 'pendiente'");
  return errores;
}

// Validación del body de create. Devuelve código 400 en caso de error.
export const validarCreate = (req: Request, _res: Response, next: NextFunction) => {
  const errores = validar(req.body ?? {}, false);
  if (errores.length) throw new HttpError(400, errores.join('; '));
  next();
};

// Validación del body de update/put. Devuelve código 400 en caso de error.
export const validarUpdate = (req: Request, _res: Response, next: NextFunction) => {
  const body = req.body ?? {};
  if (Object.keys(body).length === 0) throw new HttpError(400, 'El body no puede estar vacío');
  const errores = validar(body, req.method === 'PATCH');
  if (errores.length) throw new HttpError(400, errores.join('; '));
  next();
};