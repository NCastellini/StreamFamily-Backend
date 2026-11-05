export type TipoMedioPago =
    | 'tarjeta_credito'
    | 'tarjeta_debito'
    | 'billetera'
    | 'transferencia';

export interface MedioPago {
    id: number;
    nombre: string;
    tipo: TipoMedioPago;
    ultimosDigitos: string | null;
}