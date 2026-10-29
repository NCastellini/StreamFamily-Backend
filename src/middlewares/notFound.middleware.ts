import type { Request, Response } from 'express';
import { fail } from '../utils/response';

/** Se monta DESPUÉS de todas las rutas: si ninguna respondió, la ruta no existe. */
export function notFoundHandler(req: Request, res: Response): void {
  fail(res, 404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`);
}