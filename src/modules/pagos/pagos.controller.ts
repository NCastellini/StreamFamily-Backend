import type { NextFunction, Request, Response } from 'express';
import { ok, created } from '../../utils/response';
import { HttpError } from '../../utils/HttpError';
import * as service from './pagos.service';

const parseId = (raw: string | string[] | undefined): number => {
  const valor = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'El id debe ser un entero positivo');
  return id;
};

export const list = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, meta } = service.listFor(req.user!, req.query);
    ok(res, data, { meta });
  } catch (e) { next(e); }
};

export const getById = (req: Request, res: Response, next: NextFunction) => {
  try { ok(res, service.getByIdFor(req.user!, parseId(req.params.id))); } catch (e) { next(e); }
};

export const create = (req: Request, res: Response, next: NextFunction) => {
  try { created(res, service.createFor(req.user!, req.body)); } catch (e) { next(e); }
};

export const update = (req: Request, res: Response, next: NextFunction) => {
  try { ok(res, service.updateFor(req.user!, parseId(req.params.id), req.body)); } catch (e) { next(e); }
};

export const remove = (req: Request, res: Response, next: NextFunction) => {
  try { service.removeFor(req.user!, parseId(req.params.id)); ok(res, null); } catch (e) { next(e); }
};

export const total = (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.query.suscripcionId;
    const id = raw === undefined ? undefined : parseId(String(raw));
    ok(res, service.totalFor(req.user!, id));
  } catch (e) { next(e); }
};