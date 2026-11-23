import { Router } from 'express';
import {
  addMiembro,
  createGrupo,
  deleteGrupo,
  deleteMiembro,
  getGrupo,
  getResumenGrupo,
  listGrupos,
  replaceGrupo,
  updateGrupo,
} from './grupos.controller';

/**
 * Módulo: Grupos familiares
 * Responsable: Nazareno Negrete
 * Montado en: /api/v1/grupos
 */
export const gruposRouter = Router();

gruposRouter.get('/', listGrupos);
gruposRouter.get('/:id/resumen', getResumenGrupo);
gruposRouter.get('/:id', getGrupo);
gruposRouter.post('/', createGrupo);
gruposRouter.put('/:id', replaceGrupo);
gruposRouter.patch('/:id', updateGrupo);
gruposRouter.delete('/:id', deleteGrupo);
gruposRouter.post('/:id/miembros', addMiembro);
gruposRouter.delete('/:id/miembros/:userId', deleteMiembro);
