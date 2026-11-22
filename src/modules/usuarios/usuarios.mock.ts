import type { Usuario } from './usuarios.types';

// Credenciales de demostración documentadas en README.md de este módulo.
const adminHash = '$2b$10$qZip6IwPNdXJ3wDlipvBrOGALKjYXGHnlUD9EGrn5VR3kQ1y0Ah2m';
const clienteHash = '$2b$10$X7rymI.snTaxTBGu4RIHMuZuYmRvamYc6jcfsVyq3iO/f9.8nUNdm';

const personas: ReadonlyArray<readonly [string, string, string]> = [
  ['Lucía', 'Fernández', 'lucia.fernandez'],
  ['Martín', 'Gómez', 'martin.gomez'],
  ['Sofía', 'Rodríguez', 'sofia.rodriguez'],
  ['Diego', 'López', 'diego.lopez'],
  ['Valentina', 'Martínez', 'valentina.martinez'],
  ['Mateo', 'Pérez', 'mateo.perez'],
  ['Camila', 'García', 'camila.garcia'],
  ['Nicolás', 'Romero', 'nicolas.romero'],
  ['Julieta', 'Sosa', 'julieta.sosa'],
  ['Tomás', 'Torres', 'tomas.torres'],
  ['Agustina', 'Ruiz', 'agustina.ruiz'],
  ['Santiago', 'Díaz', 'santiago.diaz'],
  ['Florencia', 'Acosta', 'florencia.acosta'],
  ['Joaquín', 'Medina', 'joaquin.medina'],
  ['Victoria', 'Castro', 'victoria.castro'],
];

export const usuariosMock: readonly Usuario[] = personas.map(([nombre, apellido, username], i) => ({
  id: i + 1,
  nombre,
  apellido,
  email: `${username}@streamfamily.example`,
  username,
  passwordHash: i === 0 ? adminHash : clienteHash,
  rol: i === 0 ? 'admin' : 'cliente',
  estado: i === 3 ? 'bloqueado' : i === 14 ? 'inactivo' : 'activo',
  creadoEn: '2026-01-05T09:00:00.000Z',
}));
