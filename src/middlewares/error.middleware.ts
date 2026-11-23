import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { HttpError } from '../utils/HttpError';
import { fail } from '../utils/response';

/** Forma de los errores que lanzan Express y sus librerías (body-parser, etc.) */
interface HttpLikeError {
  status?: number;
  statusCode?: number;
  type?: string;
  expose?: boolean;
  message?: string;
}

interface ResolvedError {
  status: number;
  msg: string;
  data: unknown;
}

const GENERIC_500 = 'Error interno del servidor';

/** Traduce cualquier error a { status, msg, data } */
function resolveError(err: unknown): ResolvedError {
  // 1) Errores propios: throw HttpError.notFound(...)
  if (err instanceof HttpError) {
    return { status: err.status, msg: err.message, data: err.details ?? null };
  }

  if (typeof err === 'object' && err !== null) {
    const e = err as HttpLikeError;

    // 2) JSON mal formado en el body
    if (e.type === 'entity.parse.failed') {
      return { status: 400, msg: 'El cuerpo de la petición no es un JSON válido', data: null };
    }

    // 3) Body demasiado grande
    if (e.type === 'entity.too.large') {
      return { status: 413, msg: 'El cuerpo de la petición es demasiado grande', data: null };
    }

    // 4) Otros errores de librerías que traen su propio código
    const status = e.status ?? e.statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      const msg = e.expose !== false && e.message ? e.message : 'Solicitud inválida';
      return { status, msg, data: null };
    }
  }

  // 5) Cualquier otra cosa: error inesperado
  return { status: 500, msg: GENERIC_500, data: null };
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  // Si ya se empezó a enviar la respuesta, Express debe cerrar la conexión
  if (res.headersSent) {
    next(err);
    return;
  }

  const { status, msg, data } = resolveError(err);

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);

    // En desarrollo se muestra el detalle para depurar. En producción NUNCA.
    if (!env.isProduction) {
      const error = err instanceof Error ? err : new Error(String(err));
      fail(res, status, error.message || msg, { name: error.name, stack: error.stack });
      return;
    }
  }

  fail(res, status, msg, data);
}
