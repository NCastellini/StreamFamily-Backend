export type Moneda = 'ARS' | 'USD';
export type Frecuencia = 'mensual' | 'trimestral' | 'anual';
export type EstadoSuscripcion = 'activa' | 'pausada' | 'cancelada';

export interface Suscripcion {
    id: number;
    plataforma: string;
    plan: string;
    costo: number;
    moneda: Moneda;
    frecuencia: Frecuencia;
    fechaCobro: string;
    medioPagoId: number;
    categoriaId: number;
    grupoId: number | null;
    usuarioId: number;
    estado: EstadoSuscripcion;
    creadaEn: string;
}

export type CreateSuscripcionDto = Omit<Suscripcion, 'id' | 'creadaEn'>;
export type UpdateSuscripcionDto = Partial<CreateSuscripcionDto>;