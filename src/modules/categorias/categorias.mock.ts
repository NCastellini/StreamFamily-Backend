import type { Categoria } from './categorias.types';

export const categoriasMock: readonly Categoria[] = [
  { id: 1, nombre: 'Video', descripcion: 'Series, películas y documentales' },
  { id: 2, nombre: 'Música', descripcion: 'Streaming de música y podcasts' },
  { id: 3, nombre: 'Juegos', descripcion: 'Videojuegos y juegos en la nube' },
  { id: 4, nombre: 'Almacenamiento', descripcion: 'Almacenamiento de archivos en la nube' },
  { id: 5, nombre: 'Educación', descripcion: 'Cursos, idiomas y audiolibros' },
  {
    id: 6,
    nombre: 'Productividad',
    descripcion: 'Herramientas de trabajo, diseño e inteligencia artificial',
  },
];
