import type { AuthUser } from '../types/api.types';
import { HttpError } from './HttpError';

/** Indica si el usuario autenticado tiene rol de administrador. */
export const esAdmin = (actor: AuthUser): boolean => actor.role === 'admin';

/**
 * Exige acceso a un recurso existente. Usar cuando el recurso es ajeno:
 * responde 404 para no revelar que existe.
 */
export function exigirAcceso(permitido: boolean, recurso = 'Recurso'): void {
  if (!permitido) {
    throw HttpError.notFound(`${recurso} no encontrado`);
  }
}

/**
 * Exige que el actor opere sobre sí mismo (salvo admin). Usar al crear o mover
 * algo a nombre de otro usuario: responde 403.
 */
export function exigirPropio(actor: AuthUser, usuarioId: number): void {
  if (!esAdmin(actor) && usuarioId !== actor.id) {
    throw HttpError.forbidden('No puede operar en nombre de otro usuario');
  }
}
