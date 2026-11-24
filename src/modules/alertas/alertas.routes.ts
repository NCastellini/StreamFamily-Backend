import { Router } from 'express';
import {
  crear,
  eliminar,
  enviar,
  listar,
  modificar,
  obtener,
  reemplazar,
} from './alertas.controller';
import { validarAlta, validarEdicion, validarId } from './alertas.validation';

/** Módulo: Alertas de vencimiento */
export const alertasRouter = Router();

// GET /proximas → se agrega en la Etapa 2. Tiene que ir ANTES de /:id
alertasRouter.get('/', listar);
alertasRouter.get('/:id', validarId, obtener);
alertasRouter.post('/', validarAlta, crear);
alertasRouter.put('/:id', validarId, validarAlta, reemplazar);
alertasRouter.patch('/:id', validarId, validarEdicion, modificar);
alertasRouter.delete('/:id', validarId, eliminar);
alertasRouter.post('/:id/enviar', validarId, enviar);
