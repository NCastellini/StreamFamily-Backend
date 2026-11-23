export interface Grupo {
  id: number;
  nombre: string;
  administradorId: number;
  miembros: number[];
  creadoEn: string;
}

export type CreateGrupoDto = Omit<Grupo, 'id' | 'creadoEn'>;
export type UpdateGrupoDto = Partial<CreateGrupoDto>;

export interface ResumenGrupo {
  grupoId: number;
  nombre: string;
  cantidadMiembros: number;
  suscripcionesActivas: number;
  subtotalMensual: {
    ARS: number;
    USD: number;
  };
}
