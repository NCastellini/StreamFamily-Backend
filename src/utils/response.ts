import type { Response } from 'express';
import type { ApiResponse, PaginationMeta } from '../types/api.types';

interface OkOptions {
  msg?: string;
  meta?: PaginationMeta;
}

function send<T>(res: Response, code: number, msg: string, data: T, meta?: PaginationMeta): void {
  const body: ApiResponse<T> = { msg, code, data };
  if (meta) body.meta = meta;
  res.status(code).json(body);
}

export function ok<T>(res: Response, data: T, options: OkOptions = {}): void {
  send(res, 200, options.msg ?? 'Ok', data, options.meta);
}

export function created<T>(res: Response, data: T, msg = 'Creado'): void {
  send(res, 201, msg, data);
}

export function fail(res: Response, code: number, msg: string, data: unknown = null): void {
  send(res, code, msg, data);
}
