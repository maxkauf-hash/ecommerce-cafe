import type { ErrorDetails } from './types';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ErrorDetails;
  public readonly isOperational: boolean;

  constructor(options: {
    message: string;
    statusCode: number;
    code: string;
    details?: ErrorDetails | undefined;
    isOperational?: boolean;
  }) {
    super(options.message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = new.target.name;
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.isOperational = options.isOperational ?? true;

    if (options.details !== undefined) {
      this.details = options.details;
    }

    Error.captureStackTrace?.(this, new.target);
  }
}
