import { Router } from 'express';
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

categoriasRouter.get('/', listarCategorias);
categoriasRouter.get('/:id', obtenerCategoria);
categoriasRouter.post('/', crearCategoria);
categoriasRouter.put('/:id', reemplazarCategoria);
categoriasRouter.patch('/:id', actualizarCategoria);
categoriasRouter.delete('/:id', eliminarCategoria);
