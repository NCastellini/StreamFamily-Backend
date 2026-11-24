import { Router } from 'express';
import * as c from './dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.get('/resumen', c.resumen);
dashboardRouter.get('/categorias', c.categorias);
dashboardRouter.get('/renovaciones', c.renovaciones);