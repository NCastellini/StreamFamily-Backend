import { MedioPago } from './medios-pago.types';

export const mediosPagoMock: MedioPago[] = [
    { id: 1, nombre: 'Visa Crédito', tipo: 'tarjeta_credito', ultimosDigitos: '4417' },
    { id: 2, nombre: 'Mastercard Débito', tipo: 'tarjeta_debito', ultimosDigitos: '2201' },
    { id: 3, nombre: 'Mercado Pago', tipo: 'billetera', ultimosDigitos: null },
    { id: 4, nombre: 'Ualá', tipo: 'billetera', ultimosDigitos: null },
    { id: 5, nombre: 'Transferencia bancaria', tipo: 'transferencia', ultimosDigitos: null },
];