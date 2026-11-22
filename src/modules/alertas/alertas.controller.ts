import type { Request, Response } from 'express';
import { created, ok } from '../../utils/response';
import * as alertasService from './alertas.service';

export function listar(req: Request, res: Response): void {
  const { data, meta } = alertasService.list(req.query);
  ok(res, data, { meta });
}

export function obtener(req: Request, res: Response): void {
  const alerta = alertasService.getById(Number(req.params.id));
  ok(res, alerta);
}

export function crear(req: Request, res: Response): void {
  const alerta = alertasService.create(req.body);
  created(res, alerta, 'Alerta creada');
}

export function reemplazar(req: Request, res: Response): void {
  const alerta = alertasService.update(Number(req.params.id), req.body);
  ok(res, alerta, { msg: 'Alerta actualizada' });
}

export function modificar(req: Request, res: Response): void {
  const alerta = alertasService.update(Number(req.params.id), req.body);
  ok(res, alerta, { msg: 'Alerta actualizada' });
}

export function eliminar(req: Request, res: Response): void {
  const alerta = alertasService.remove(Number(req.params.id));
  ok(res, alerta, { msg: 'Alerta eliminada' });
}
