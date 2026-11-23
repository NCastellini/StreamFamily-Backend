import type { NextFunction, Request, Response } from 'express';
import { created, ok } from '../../utils/response';
import { parsePositiveId } from '../suscripciones/suscripciones.validation';
import * as mediosPagoService from './medios-pago.service';
import { validateCreateMedioPago, validateUpdateMedioPago } from './medios-pago.validation';

export function listMediosPago(req: Request, res: Response, next: NextFunction): void {
  try {
    const { data, meta } = mediosPagoService.list(req.query);
    ok(res, data, { meta });
  } catch (error) {
    next(error);
  }
}

export function getMedioPago(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id);
    ok(res, mediosPagoService.getById(id));
  } catch (error) {
    next(error);
  }
}

export function listSuscripcionesDeMedio(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id);
    const { data, meta } = mediosPagoService.listSuscripciones(id, req.query);
    ok(res, data, { meta });
  } catch (error) {
    next(error);
  }
}

export function createMedioPago(req: Request, res: Response, next: NextFunction): void {
  try {
    const dto = validateCreateMedioPago(req.body);
    created(res, mediosPagoService.create(dto), 'Medio de pago creado');
  } catch (error) {
    next(error);
  }
}

export function replaceMedioPago(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id);
    const dto = validateCreateMedioPago(req.body);
    ok(res, mediosPagoService.update(id, dto), { msg: 'Medio de pago actualizado' });
  } catch (error) {
    next(error);
  }
}

export function updateMedioPago(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id);
    const dto = validateUpdateMedioPago(req.body);
    ok(res, mediosPagoService.update(id, dto), { msg: 'Medio de pago actualizado' });
  } catch (error) {
    next(error);
  }
}

export function deleteMedioPago(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id);
    ok(res, mediosPagoService.remove(id), { msg: 'Medio de pago eliminado' });
  } catch (error) {
    next(error);
  }
}
