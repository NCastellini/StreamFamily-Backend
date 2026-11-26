import type { NextFunction, Request, Response } from 'express';
import type { AuthUser } from '../../types/api.types';
import { HttpError } from '../../utils/HttpError';
import { created, ok } from '../../utils/response';
import * as suscripcionesService from './suscripciones.service';
import {
  parsePositiveId,
  validateCreateSuscripcion,
  validateEstadoBody,
  validateReplaceSuscripcion,
  validateUpdateSuscripcion,
} from './suscripciones.validation';

/** Usuario logueado (lo carga verifyToken en routes/index.ts). */
function actor(req: Request): AuthUser {
  if (!req.user) throw HttpError.unauthorized();
  return req.user;
}

export function listSuscripciones(req: Request, res: Response, next: NextFunction): void {
  try {
    const { data, meta } = suscripcionesService.listFor(actor(req), req.query);
    ok(res, data, { meta });
  } catch (error) {
    next(error);
  }
}

export function getSuscripcion(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id);
    ok(res, suscripcionesService.getByIdFor(actor(req), id));
  } catch (error) {
    next(error);
  }
}

export function createSuscripcion(req: Request, res: Response, next: NextFunction): void {
  try {
    const dto = validateCreateSuscripcion(req.body);
    created(res, suscripcionesService.createFor(actor(req), dto), 'Suscripción creada');
  } catch (error) {
    next(error);
  }
}

export function replaceSuscripcion(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id);
    const dto = validateReplaceSuscripcion(req.body);
    ok(res, suscripcionesService.updateFor(actor(req), id, dto), {
      msg: 'Suscripción actualizada',
    });
  } catch (error) {
    next(error);
  }
}

export function updateSuscripcion(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id);
    const dto = validateUpdateSuscripcion(req.body);
    ok(res, suscripcionesService.updateFor(actor(req), id, dto), {
      msg: 'Suscripción actualizada',
    });
  } catch (error) {
    next(error);
  }
}

export function changeEstadoSuscripcion(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id);
    const estado = validateEstadoBody(req.body);
    ok(res, suscripcionesService.changeEstadoFor(actor(req), id, estado), {
      msg: 'Estado actualizado',
    });
  } catch (error) {
    next(error);
  }
}

export function deleteSuscripcion(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id);
    ok(res, suscripcionesService.removeFor(actor(req), id), { msg: 'Suscripción eliminada' });
  } catch (error) {
    next(error);
  }
}
