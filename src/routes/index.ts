import { Router } from 'express';
import { env } from '../config/env';
import { ok } from '../utils/response';

/** Router principal: todo lo que se registre acá queda bajo /api/v1 */
export const apiRouter = Router();

// GET /api/v1/health → para verificar que la API está viva (lo usa Render)
apiRouter.get('/health', (_req, res) => {
  ok(res, {
    status: 'ok',
    env: env.NODE_ENV,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});