export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  msg: string;
  code: number;
  data: T;
  meta?: PaginationMeta;
}

export type SortOrder = 'asc' | 'desc';

export interface ListQuery<T = Record<string, unknown>> {
  page: number;
  limit: number;
  sortBy?: keyof T & string;
  order: SortOrder;
  q?: string;
  filters: Partial<Record<keyof T & string, string>>;
}

export interface ListResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export type UserRole = 'admin' | 'cliente';

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
}