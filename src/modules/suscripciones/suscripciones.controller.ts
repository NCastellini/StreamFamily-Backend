import type { NextFunction, Request, Response } from 'express';
import { created, ok } from '../../utils/response';
import * as suscripcionesService from './suscripciones.service';
import {
  parsePositiveId,
  validateCreateSuscripcion,
  validateEstadoBody,
  validateReplaceSuscripcion,
  validateUpdateSuscripcion,
} from './suscripciones.validation';

export function listSuscripciones(req: Request, res: Response, next: NextFunction): void {
  try {
    const { data, meta } = suscripcionesService.list(req.query);
    ok(res, data, { meta });
  } catch (error) {
    next(error);
  }
}

export function getSuscripcion(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id);
    ok(res, suscripcionesService.getById(id));
  } catch (error) {
    next(error);
  }
}

export function createSuscripcion(req: Request, res: Response, next: NextFunction): void {
  try {
    const dto = validateCreateSuscripcion(req.body);
    created(res, suscripcionesService.create(dto), 'Suscripción creada');
  } catch (error) {
    next(error);
  }
}

export function replaceSuscripcion(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id);
    const dto = validateReplaceSuscripcion(req.body);
    ok(res, suscripcionesService.update(id, dto), { msg: 'Suscripción actualizada' });
  } catch (error) {
    next(error);
  }
}

export function updateSuscripcion(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id);
    const dto = validateUpdateSuscripcion(req.body);
    ok(res, suscripcionesService.update(id, dto), { msg: 'Suscripción actualizada' });
  } catch (error) {
    next(error);
  }
}

export function changeEstadoSuscripcion(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id);
    const estado = validateEstadoBody(req.body);
    ok(res, suscripcionesService.changeEstado(id, estado), { msg: 'Estado actualizado' });
  } catch (error) {
    next(error);
  }
}

export function deleteSuscripcion(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id);
    ok(res, suscripcionesService.remove(id), { msg: 'Suscripción eliminada' });
  } catch (error) {
    next(error);
  }
}
