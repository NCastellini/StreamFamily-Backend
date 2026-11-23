import type { AuthUser } from '../../types/api.types';

export interface LoginDto {
  identifier: string;
  password: string;
}

export interface RegisterDto {
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  password: string;
}

export interface RecoverDto {
  email: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface RegisterResult {
  email: string;
  username: string;
}
