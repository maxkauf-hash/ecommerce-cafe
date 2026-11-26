import { AppError } from "./app-error";
import type { ErrorDetails } from "./types";

export class BadRequestError extends AppError {
  constructor(message = 'Requête invalide', details?: ErrorDetails, code = 'BAD_REQUEST') {
    super({
      message,
      statusCode: 400,
      code,
      details,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Ressource introuvable', details?: ErrorDetails, code = 'NOT_FOUND') {
    super({
      message,
      statusCode: 404,
      code,
      details,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflit de ressource', details?: ErrorDetails, code = 'CONFLICT') {
    super({
      message,
      statusCode: 409,
      code,
      details,
    });
  }
}

export class InternalServerError extends AppError {
  constructor(
    message = 'Une erreur interne est survenue',
    details?: ErrorDetails,
    code = 'INTERNAL_SERVER_ERROR',
  ) {
    super({
      message,
      statusCode: 500,
      code,
      details,
      isOperational: false,
    });
  }
}
