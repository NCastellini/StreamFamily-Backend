import { Router } from 'express';
import { requireRole, verifyToken } from '../../middlewares/auth.middleware';
import {
  actualizarUsuario,
  cambiarEstadoUsuario,
  crearUsuario,
  eliminarUsuario,
  listarUsuarios,
  obtenerUsuario,
  reemplazarUsuario,
  resetearPasswordUsuario,
} from './usuarios.controller';

/**
 * Módulo: Usuarios (gestión por el administrador)
 * Responsable: Román Strizzi
 * Montado en: /api/v1/usuarios
 */
export const usuariosRouter = Router();
usuariosRouter.use(verifyToken, requireRole('admin'));

usuariosRouter.get('/', listarUsuarios);
usuariosRouter.get('/:id', obtenerUsuario);
usuariosRouter.post('/', crearUsuario);
usuariosRouter.put('/:id', reemplazarUsuario);
usuariosRouter.patch('/:id', actualizarUsuario);
usuariosRouter.patch('/:id/estado', cambiarEstadoUsuario);
usuariosRouter.post('/:id/reset-password', resetearPasswordUsuario);
usuariosRouter.delete('/:id', eliminarUsuario);
