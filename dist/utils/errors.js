"use strict";
/**
 * Custom Error Classes for ptta
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFoundError = exports.ValidationError = exports.DatabaseError = exports.PttaError = void 0;
exports.isError = isError;
exports.getErrorMessage = getErrorMessage;
exports.formatError = formatError;
class PttaError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'PttaError';
        Object.setPrototypeOf(this, PttaError.prototype);
    }
}
exports.PttaError = PttaError;
class DatabaseError extends PttaError {
    constructor(message, originalError) {
        super(message, 'DB_ERROR');
        this.originalError = originalError;
        this.name = 'DatabaseError';
        Object.setPrototypeOf(this, DatabaseError.prototype);
    }
}
exports.DatabaseError = DatabaseError;
class ValidationError extends PttaError {
    constructor(message, field) {
        super(message, 'VALIDATION_ERROR');
        this.field = field;
        this.name = 'ValidationError';
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends PttaError {
    constructor(resource, id) {
        const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
        super(message, 'NOT_FOUND');
        this.name = 'NotFoundError';
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Type guard to check if error is instance of Error
 */
function isError(error) {
    return error instanceof Error;
}
/**
 * Get error message from unknown error type
 */
function getErrorMessage(error) {
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
function formatError(error) {
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
//# sourceMappingURL=errors.js.map