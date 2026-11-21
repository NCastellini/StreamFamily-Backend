import type { Grupo } from './grupos.types';

export const gruposMock: Grupo[] = [
  {
    id: 1,
    nombre: 'Familia Gómez',
    administradorId: 2,
    miembros: [2, 5, 14],
    creadoEn: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 2,
    nombre: 'Familia Rodríguez',
    administradorId: 3,
    miembros: [3, 6, 10],
    creadoEn: '2026-02-05T10:00:00.000Z',
  },
  {
    id: 3,
    nombre: 'Casa Martínez',
    administradorId: 4,
    miembros: [4, 11, 12],
    creadoEn: '2026-03-12T10:00:00.000Z',
  },
  {
    id: 4,
    nombre: 'Familia Fernández',
    administradorId: 7,
    miembros: [7, 8, 13],
    creadoEn: '2026-04-18T10:00:00.000Z',
  },
  {
    id: 5,
    nombre: 'Hogar Sánchez',
    administradorId: 9,
    miembros: [9, 15],
    creadoEn: '2026-05-24T10:00:00.000Z',
  },
];
