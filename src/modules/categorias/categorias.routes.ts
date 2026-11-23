import { Router } from 'express';
import { requireRole, verifyToken } from '../../middlewares/auth.middleware';
import {
  actualizarCategoria,
  crearCategoria,
  eliminarCategoria,
  listarCategorias,
  obtenerCategoria,
  reemplazarCategoria,
} from './categorias.controller';

/**
 * Módulo: Categorías de suscripciones
 * Responsable: Román Strizzi
 * Montado en: /api/v1/categorias
 */
export const categoriasRouter = Router();
categoriasRouter.use(verifyToken);

categoriasRouter.get('/', listarCategorias);
categoriasRouter.get('/:id', obtenerCategoria);
categoriasRouter.use(requireRole('admin'));
categoriasRouter.post('/', crearCategoria);
categoriasRouter.put('/:id', reemplazarCategoria);
categoriasRouter.patch('/:id', actualizarCategoria);
categoriasRouter.delete('/:id', eliminarCategoria);
