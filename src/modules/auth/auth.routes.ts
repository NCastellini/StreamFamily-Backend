import { Router } from 'express';
import { verifyToken } from '../../middlewares/auth.middleware';
import { login, me, recover, register } from './auth.controller';

/**
 * Módulo: Auth (login, registro, recuperar contraseña)
 * Responsable: Nazareno Negrete
 * Montado en: /api/v1/auth
 */
export const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/register', register);
authRouter.post('/recover', recover);
authRouter.get('/me', verifyToken, me);
