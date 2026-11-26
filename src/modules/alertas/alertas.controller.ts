import type { Request, Response } from 'express';
import { created, ok } from '../../utils/response';
import * as alertasService from './alertas.service';

export function listar(req: Request, res: Response): void {
  const { data, meta } = alertasService.listFor(req.user!, req.query);
  ok(res, data, { meta });
}

export function proximas(req: Request, res: Response): void {
  ok(res, alertasService.proximasFor(req.user!, req.query));
}

export function obtener(req: Request, res: Response): void {
  const alerta = alertasService.getByIdFor(req.user!, Number(req.params.id));
  ok(res, alerta);
}

export function crear(req: Request, res: Response): void {
  const alerta = alertasService.createFor(req.user!, req.body);
  created(res, alerta, 'Alerta creada');
}

export function reemplazar(req: Request, res: Response): void {
  const alerta = alertasService.updateFor(req.user!, Number(req.params.id), req.body);
  ok(res, alerta, { msg: 'Alerta actualizada' });
}

export function modificar(req: Request, res: Response): void {
  const alerta = alertasService.updateFor(req.user!, Number(req.params.id), req.body);
  ok(res, alerta, { msg: 'Alerta actualizada' });
}

export function eliminar(req: Request, res: Response): void {
  const alerta = alertasService.removeFor(req.user!, Number(req.params.id));
  ok(res, alerta, { msg: 'Alerta eliminada' });
}

export function enviar(req: Request, res: Response): void {
  const comprobante = alertasService.enviarFor(req.user!, Number(req.params.id));
  ok(res, comprobante, { msg: 'Alerta enviada' });
}
