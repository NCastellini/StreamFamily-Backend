import { Router } from 'express';
import * as c from './pagos.controller';
import { validarCreate, validarUpdate } from './pagos.validation';

export const pagosRouter = Router();

pagosRouter.get('/total', c.total);
pagosRouter.get('/', c.list);
pagosRouter.get('/:id', c.getById);
pagosRouter.post('/', validarCreate, c.create);
pagosRouter.put('/:id', validarUpdate, c.update);
pagosRouter.patch('/:id', validarUpdate, c.update);
pagosRouter.delete('/:id', c.remove);