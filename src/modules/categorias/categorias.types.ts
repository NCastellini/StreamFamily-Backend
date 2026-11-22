export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string;
}

export type CreateCategoriaDto = Omit<Categoria, 'id'>;
export type UpdateCategoriaDto = Partial<CreateCategoriaDto>;
