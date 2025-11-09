import pino from 'pino';
export declare const logger: pino.Logger<never, boolean>;
/**
 * Create a child logger with additional context
 */
export declare function createLogger(context: Record<string, unknown>): pino.Logger<never, boolean>;
//# sourceMappingURL=logger.d.ts.map