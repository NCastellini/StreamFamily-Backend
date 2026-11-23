import type { RequestHandler } from 'express';
import { created, ok } from '../../utils/response';
import * as service from './categorias.service';

export const listarCategorias: RequestHandler = (req, res) => {
  const { data, meta } = service.list(req.query);
  ok(res, data, { meta });
};

export const obtenerCategoria: RequestHandler = (req, res) => {
  ok(res, service.getById(req.params.id));
};

export const crearCategoria: RequestHandler = (req, res) => {
  created(res, service.create(req.body), 'Categoría creada');
};

export const reemplazarCategoria: RequestHandler = (req, res) => {
  ok(res, service.update(req.params.id, req.body, false), { msg: 'Categoría actualizada' });
};

export const actualizarCategoria: RequestHandler = (req, res) => {
  ok(res, service.update(req.params.id, req.body), { msg: 'Categoría actualizada' });
};

export const eliminarCategoria: RequestHandler = (req, res) => {
  ok(res, service.remove(req.params.id), { msg: 'Categoría eliminada' });
};
