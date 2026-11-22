export type Frecuencia = 'mensual' | 'trimestral' | 'anual';

const MILISEGUNDOS_POR_DIA = 86_400_000;
const ZONA_HORARIA_ARGENTINA = 'America/Argentina/Buenos_Aires';

const MESES_POR_FRECUENCIA: Record<Frecuencia, number> = {
  mensual: 1,
  trimestral: 3,
  anual: 12,
};

const formateadorFechaArgentina = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA_ARGENTINA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

interface PartesFecha {
  anio: number;
  indiceMes: number;
  dia: number;
}

function parsearFecha(fecha: string): PartesFecha {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return { anio, indiceMes: mes - 1, dia };
}

function aMilisegundosUTC(fecha: string): number {
  const { anio, indiceMes, dia } = parsearFecha(fecha);
  return Date.UTC(anio, indiceMes, dia);
}

function completarConCero(numero: number): string {
  return String(numero).padStart(2, '0');
}

function formatearMilisegundosUTC(milisegundos: number): string {
  const fecha = new Date(milisegundos);
  const anio = fecha.getUTCFullYear();
  const mes = completarConCero(fecha.getUTCMonth() + 1);
  const dia = completarConCero(fecha.getUTCDate());
  return `${anio}-${mes}-${dia}`;
}

function diasDelMes(anio: number, indiceMes: number): number {
  return new Date(Date.UTC(anio, indiceMes + 1, 0)).getUTCDate();
}

function sumarMeses(fecha: string, meses: number): string {
  const { anio, indiceMes, dia } = parsearFecha(fecha);
  const totalMeses = anio * 12 + indiceMes + meses;
  const anioDestino = Math.floor(totalMeses / 12);
  const indiceMesDestino = totalMeses - anioDestino * 12;
  const diaDestino = Math.min(dia, diasDelMes(anioDestino, indiceMesDestino));
  return formatearMilisegundosUTC(Date.UTC(anioDestino, indiceMesDestino, diaDestino));
}

function mesesEntre(desde: string, hasta: string): number {
  const inicio = parsearFecha(desde);
  const fin = parsearFecha(hasta);
  return (fin.anio - inicio.anio) * 12 + (fin.indiceMes - inicio.indiceMes);
}

export function hoyArgentina(): string {
  const partes = formateadorFechaArgentina.formatToParts(new Date());
  const valorDe = (tipo: Intl.DateTimeFormatPartTypes): string =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';
  return `${valorDe('year')}-${valorDe('month')}-${valorDe('day')}`;
}

export function sumarDias(fecha: string, dias: number): string {
  return formatearMilisegundosUTC(aMilisegundosUTC(fecha) + dias * MILISEGUNDOS_POR_DIA);
}

export function proximoCobro(
  fechaCobro: string,
  frecuencia: Frecuencia,
  hoy: string = hoyArgentina(),
): string {
  if (fechaCobro >= hoy) return fechaCobro;

  const mesesPorPeriodo = MESES_POR_FRECUENCIA[frecuencia];
  let periodos = Math.max(1, Math.floor(mesesEntre(fechaCobro, hoy) / mesesPorPeriodo));
  let candidato = sumarMeses(fechaCobro, periodos * mesesPorPeriodo);

  while (candidato < hoy) {
    periodos += 1;
    candidato = sumarMeses(fechaCobro, periodos * mesesPorPeriodo);
  }

  return candidato;
}

export function diasRestantes(fecha: string, hoy: string = hoyArgentina()): number {
  return Math.round((aMilisegundosUTC(fecha) - aMilisegundosUTC(hoy)) / MILISEGUNDOS_POR_DIA);
}
