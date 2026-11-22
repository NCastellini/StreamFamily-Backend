import { Router } from 'express';
import {
  createMedioPago,
  deleteMedioPago,
  getMedioPago,
  listMediosPago,
  listSuscripcionesDeMedio,
  replaceMedioPago,
  updateMedioPago,
} from './medios-pago.controller';

/**
 * Módulo: Medios de pago
 * Responsable: Nicolás Castellini
 * Montado en: /api/v1/medios-pago
 */
export const mediosPagoRouter = Router();

mediosPagoRouter.get('/', listMediosPago);
mediosPagoRouter.get('/:id', getMedioPago);
mediosPagoRouter.get('/:id/suscripciones', listSuscripcionesDeMedio);
mediosPagoRouter.post('/', createMedioPago);
mediosPagoRouter.put('/:id', replaceMedioPago);
mediosPagoRouter.patch('/:id', updateMedioPago);
mediosPagoRouter.delete('/:id', deleteMedioPago);
