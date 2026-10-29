import { Router } from 'express';
import { env } from '../config/env';
import { ok } from '../utils/response';

import { alertasRouter } from '../modules/alertas/alertas.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { categoriasRouter } from '../modules/categorias/categorias.routes';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes';
import { gruposRouter } from '../modules/grupos/grupos.routes';
import { mediosPagoRouter } from '../modules/medios-pago/medios-pago.routes';
import { metricasRouter } from '../modules/metricas/metricas.routes';
import { pagosRouter } from '../modules/pagos/pagos.routes';
import { suscripcionesRouter } from '../modules/suscripciones/suscripciones.routes';
import { usuariosRouter } from '../modules/usuarios/usuarios.routes';

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

/* Módulos, cada responsable trabaja solo dentro de src/modules/<modulo>/. */
apiRouter.use('/auth', authRouter);
apiRouter.use('/suscripciones', suscripcionesRouter);
apiRouter.use('/medios-pago', mediosPagoRouter);
apiRouter.use('/grupos', gruposRouter);
apiRouter.use('/pagos', pagosRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/alertas', alertasRouter);
apiRouter.use('/usuarios', usuariosRouter);
apiRouter.use('/categorias', categoriasRouter);
apiRouter.use('/admin/metricas', metricasRouter);
