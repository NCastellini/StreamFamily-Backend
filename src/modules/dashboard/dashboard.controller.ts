import type { NextFunction, Request, Response } from 'express';
import { ok } from '../../utils/response';
import * as service from './dashboard.service';

export const resumen = (_req: Request, res: Response, next: NextFunction) => {
  try { ok(res, service.resumen()); } catch (e) { next(e); }
};
export const categorias = (_req: Request, res: Response, next: NextFunction) => {
  try { ok(res, service.porCategoria()); } catch (e) { next(e); }
};
export const renovaciones = (req: Request, res: Response, next: NextFunction) => {
  try {
    const dias = req.query.dias ? Number(req.query.dias) : 30;
    ok(res, service.renovaciones(Number.isFinite(dias) ? dias : 30));
  } catch (e) { next(e); }
};