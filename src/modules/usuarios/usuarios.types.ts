export type RolUsuario = 'admin' | 'cliente';
export type EstadoUsuario = 'activo' | 'bloqueado' | 'inactivo';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  passwordHash: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  creadoEn: string;
}

export type UsuarioPublico = Omit<Usuario, 'passwordHash'>;

export interface CreateUsuarioDto {
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  password: string;
  rol?: RolUsuario;
  estado?: 'activo';
}

export type ReplaceUsuarioDto = Pick<Usuario, 'nombre' | 'apellido' | 'email' | 'username' | 'rol'>;
export type UpdateUsuarioDto = Partial<ReplaceUsuarioDto>;
export interface UpdateEstadoUsuarioDto {
  estado: Exclude<EstadoUsuario, 'inactivo'>;
}
