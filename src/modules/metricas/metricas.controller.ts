import type { RequestHandler } from 'express';
import { HttpError } from '../../utils/HttpError';
import { fail, ok } from '../../utils/response';
import { getMetricas } from './metricas.service';

export const obtenerMetricas: RequestHandler = async (_req, res) => {
  try {
    ok(res, await getMetricas());
  } catch (error) {
    // La falta de fuentes es un estado esperado de integración, no una traza de depuración.
    if (error instanceof HttpError && error.status === 503) {
      fail(res, 503, error.message);
      return;
    }
    throw error;
  }
};
