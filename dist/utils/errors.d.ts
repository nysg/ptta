/**
 * Custom Error Classes for ptta
 */
export declare class PttaError extends Error {
    code?: string | undefined;
    constructor(message: string, code?: string | undefined);
}
export declare class DatabaseError extends PttaError {
    originalError?: unknown | undefined;
    constructor(message: string, originalError?: unknown | undefined);
}
export declare class ValidationError extends PttaError {
    field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
export declare class NotFoundError extends PttaError {
    constructor(resource: string, id?: number | string);
}
/**
 * Type guard to check if error is instance of Error
 */
export declare function isError(error: unknown): error is Error;
/**
 * Get error message from unknown error type
 */
export declare function getErrorMessage(error: unknown): string;
/**
 * Format error for logging
 */
export declare function formatError(error: unknown): {
    message: string;
    stack?: string;
    code?: string;
};
//# sourceMappingURL=errors.d.ts.map