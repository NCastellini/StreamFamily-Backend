import type { RequestHandler } from 'express';
import { HttpError } from '../../utils/HttpError';
import { created, ok } from '../../utils/response';
import * as authService from './auth.service';

export const login: RequestHandler = async (req, res) => {
  ok(res, await authService.login(req.body), { msg: 'Sesión iniciada' });
};

export const register: RequestHandler = (req, res) => {
  created(res, authService.register(req.body), 'Registro simulado');
};

export const recover: RequestHandler = (req, res) => {
  authService.recover(req.body);
  ok(res, null, {
    msg: 'Si el email está registrado, recibirá instrucciones para recuperar su cuenta',
  });
};

export const me: RequestHandler = (req, res) => {
  if (!req.user) {
    throw HttpError.unauthorized();
  }

  ok(res, req.user);
};
