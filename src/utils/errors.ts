/**
 * Custom Error Classes for ptta
 */

export class PttaError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'PttaError';
    Object.setPrototypeOf(this, PttaError.prototype);
  }
}

export class DatabaseError extends PttaError {
  constructor(message: string, public originalError?: unknown) {
    super(message, 'DB_ERROR');
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class ValidationError extends PttaError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends PttaError {
  constructor(resource: string, id?: number | string) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, 'NOT_FOUND');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Type guard to check if error is instance of Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Get error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Format error for logging
 */
export function formatError(error: unknown): { message: string; stack?: string; code?: string } {
  if (error instanceof PttaError) {
    return {
      message: error.message,
      stack: error.stack,
      code: error.code
    };
  }
  if (isError(error)) {
    return {
      message: error.message,
      stack: error.stack
    };
  }
  return {
    message: getErrorMessage(error)
  };
}
