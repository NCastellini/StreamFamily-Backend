import { Router } from 'express';
import {
  changeEstadoSuscripcion,
  createSuscripcion,
  deleteSuscripcion,
  getSuscripcion,
  listSuscripciones,
  replaceSuscripcion,
  updateSuscripcion,
} from './suscripciones.controller';

/**
 * Módulo: Suscripciones
 * Responsable: Nicolás Castellini
 * Montado en: /api/v1/suscripciones
 */
export const suscripcionesRouter = Router();

suscripcionesRouter.get('/', listSuscripciones);
suscripcionesRouter.get('/:id', getSuscripcion);
suscripcionesRouter.post('/', createSuscripcion);
suscripcionesRouter.put('/:id', replaceSuscripcion);
suscripcionesRouter.patch('/:id/estado', changeEstadoSuscripcion);
suscripcionesRouter.patch('/:id', updateSuscripcion);
suscripcionesRouter.delete('/:id', deleteSuscripcion);
