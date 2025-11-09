/**
 * Parse integer safely with validation
 */
export declare function parseIntSafe(value: string, fieldName?: string): number;
/**
 * Validate required field
 */
export declare function validateRequired(value: unknown, fieldName: string): void;
/**
 * Validate status value
 */
export declare function validateStatus(status: string, allowedStatuses: string[], entityType?: string): void;
/**
 * Validate priority value
 */
export declare function validatePriority(priority: string): void;
/**
 * Validate entity type for summaries
 */
export declare function validateEntityType(entityType: string): void;
//# sourceMappingURL=validation.d.ts.map