export class HttpError extends Error {
  readonly status: number;
  /** Información extra opcional (ej: errores de validación). */
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }

  static badRequest(message = 'Solicitud inválida', details?: unknown): HttpError {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = 'No autenticado'): HttpError {
    return new HttpError(401, message);
  }

  static forbidden(message = 'No tiene permisos para realizar esta acción'): HttpError {
    return new HttpError(403, message);
  }

  static notFound(message = 'Recurso no encontrado'): HttpError {
    return new HttpError(404, message);
  }

  static conflict(message = 'El recurso ya existe', details?: unknown): HttpError {
    return new HttpError(409, message, details);
  }

  static unprocessable(message = 'Datos inválidos', details?: unknown): HttpError {
    return new HttpError(422, message, details);
  }

  static internal(message = 'Error interno del servidor'): HttpError {
    return new HttpError(500, message);
  }
}