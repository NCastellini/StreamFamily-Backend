import { Router } from 'express';
import {
  crear,
  eliminar,
  enviar,
  listar,
  modificar,
  obtener,
  proximas,
  reemplazar,
} from './alertas.controller';
import { validarAlta, validarEdicion, validarId } from './alertas.validation';

/** Módulo: Alertas de vencimiento */
export const alertasRouter = Router();

alertasRouter.get('/', listar);
// Va antes de /:id para que 'proximas' no se tome como id
alertasRouter.get('/proximas', proximas);
alertasRouter.get('/:id', validarId, obtener);
alertasRouter.post('/', validarAlta, crear);
alertasRouter.put('/:id', validarId, validarAlta, reemplazar);
alertasRouter.patch('/:id', validarId, validarEdicion, modificar);
alertasRouter.delete('/:id', validarId, eliminar);
alertasRouter.post('/:id/enviar', validarId, enviar);
