import { Pago } from './pagos.types';

const montos = [4500, 8900, 12000, 15, 9.99, 2300, 6700, 18, 3400, 21000]; // Posibles montos

export const pagosMock: Pago[] = Array.from({ length: 48 }, (_, i) => { // Crea un arreglo de 48 elementos
  const id = i + 1;
  const monto = montos[i % montos.length];
  const mes = String((i % 12) + 1).padStart(2, '0');
  const dia = String((i % 27) + 1).padStart(2, '0');
  return {
    id,
    suscripcionId: (i % 30) + 1, // 1..30, cubre todas
    fecha: `2026-${mes}-${dia}`,
    monto,
    moneda: monto < 30 ? 'USD' : 'ARS',
    medioPagoId: (i % 5) + 1, // 1..5
    estado: i % 7 === 0 ? 'pendiente' : 'pagado',
  };
});