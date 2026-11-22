import type { RequestHandler } from 'express';
import { created, ok } from '../../utils/response';
import * as service from './usuarios.service';

// Express 5 envía los errores sincrónicos y los rechazos async al middleware global.
export const listarUsuarios: RequestHandler = (req, res) => {
  const { data, meta } = service.list(req.query);
  ok(res, data, { meta });
};

export const obtenerUsuario: RequestHandler = (req, res) => {
  ok(res, service.getById(req.params.id));
};

export const crearUsuario: RequestHandler = async (req, res) => {
  created(res, await service.create(req.body), 'Usuario creado');
};

export const reemplazarUsuario: RequestHandler = (req, res) => {
  ok(res, service.update(req.params.id, req.body, false), { msg: 'Usuario actualizado' });
};

export const actualizarUsuario: RequestHandler = (req, res) => {
  ok(res, service.update(req.params.id, req.body), { msg: 'Usuario actualizado' });
};

export const cambiarEstadoUsuario: RequestHandler = (req, res) => {
  ok(res, service.changeState(req.params.id, req.body), { msg: 'Estado actualizado' });
};

export const resetearPasswordUsuario: RequestHandler = (req, res) => {
  service.resetPassword(req.params.id);
  ok(res, null, { msg: 'Solicitud de restablecimiento simulada' });
};

export const eliminarUsuario: RequestHandler = (req, res) => {
  ok(res, service.remove(req.params.id), { msg: 'Usuario eliminado' });
};
