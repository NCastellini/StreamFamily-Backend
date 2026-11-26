import type { NextFunction, Request, Response } from 'express';
import { created, ok } from '../../utils/response';
import * as gruposService from './grupos.service';
import {
  parsePositiveId,
  validateCreateGrupo,
  validateMiembroBody,
  validateReplaceGrupo,
  validateUpdateGrupo,
} from './grupos.validation';

export function listGrupos(req: Request, res: Response, next: NextFunction): void {
  try {
    const { data, meta } = gruposService.listFor(req.user!, req.query);
    ok(res, data, { meta });
  } catch (error) {
    next(error);
  }
}

export function getGrupo(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id, 'id');
    ok(res, gruposService.getByIdFor(req.user!, id));
  } catch (error) {
    next(error);
  }
}

export function getResumenGrupo(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id, 'id');
    ok(res, gruposService.getSummaryFor(req.user!, id));
  } catch (error) {
    next(error);
  }
}

export function createGrupo(req: Request, res: Response, next: NextFunction): void {
  try {
    const dto = validateCreateGrupo(req.body);
    created(res, gruposService.createFor(req.user!, dto), 'Grupo creado');
  } catch (error) {
    next(error);
  }
}

export function replaceGrupo(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id, 'id');
    const dto = validateReplaceGrupo(req.body);
    ok(res, gruposService.updateFor(req.user!, id, dto), { msg: 'Grupo actualizado' });
  } catch (error) {
    next(error);
  }
}

export function updateGrupo(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id, 'id');
    const dto = validateUpdateGrupo(req.body);
    ok(res, gruposService.updateFor(req.user!, id, dto), { msg: 'Grupo actualizado' });
  } catch (error) {
    next(error);
  }
}

export function deleteGrupo(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id, 'id');
    ok(res, gruposService.removeFor(req.user!, id), { msg: 'Grupo eliminado' });
  } catch (error) {
    next(error);
  }
}

export function addMiembro(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id, 'id');
    const usuarioId = validateMiembroBody(req.body);
    created(res, gruposService.addMemberFor(req.user!, id, usuarioId), 'Miembro agregado');
  } catch (error) {
    next(error);
  }
}

export function deleteMiembro(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parsePositiveId(req.params.id, 'id');
    const usuarioId = parsePositiveId(req.params.userId, 'userId');
    ok(res, gruposService.removeMemberFor(req.user!, id, usuarioId), { msg: 'Miembro eliminado' });
  } catch (error) {
    next(error);
  }
}
