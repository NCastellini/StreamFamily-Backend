export type Moneda = 'ARS' | 'USD';
export type EstadoPago = 'pagado' | 'pendiente';

export interface Pago {
    id: number;
    suscripcionId: number;
    fecha: string; // ISO: 'YYYY-MM-DD'
    monto: number;
    moneda: Moneda;
    medioPagoId: number;
    estado: EstadoPago;
}

export type CreatePagoDto = Omit<Pago, 'id'>;
export type UpdatePagoDto = Partial<CreatePagoDto>;

export interface PagosFilters {
    suscripcionId?: number;
    desde?: string;
    hasta?: string;
    estado?: EstadoPago;
}