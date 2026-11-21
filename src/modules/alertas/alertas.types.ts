export const CANALES_ALERTA = ['email'] as const;
export type CanalAlerta = (typeof CANALES_ALERTA)[number];

export const ESTADOS_ALERTA = ['activa', 'descartada'] as const;
export type EstadoAlerta = (typeof ESTADOS_ALERTA)[number];

export interface Alerta {
  id: number;
  suscripcionId: number;
  usuarioId: number;
  diasAnticipacion: number;
  fechaAviso: string;
  canal: CanalAlerta;
  estado: EstadoAlerta;
  creadaEn: string;
}

export type CreateAlertaDto = Omit<Alerta, 'id' | 'creadaEn'>;
export type UpdateAlertaDto = Partial<CreateAlertaDto>;
