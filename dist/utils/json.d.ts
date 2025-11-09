import { Metadata } from '../database';
/**
 * Parse metadata from string to object safely
 */
export declare function parseMetadata(metadata: string | Metadata | undefined | null): Metadata | undefined;
/**
 * Stringify metadata to JSON string for database storage
 */
export declare function stringifyMetadata(metadata: Metadata | undefined | null): string | null;
/**
 * Parse metadata in entity object (mutates the object)
 */
export declare function parseEntityMetadata<T extends {
    metadata?: string | Metadata;
}>(entity: T): T;
/**
 * Build UPDATE query fields and values from partial entity updates
 * @param updates Partial entity object with fields to update
 * @param excludeKeys Keys to exclude from update (e.g., 'id', 'created_at')
 * @param autoCompleted Whether to auto-set completed_at for done/completed status
 * @returns Object containing fields array and values array for SQL UPDATE query
 */
export declare function buildUpdateQuery(updates: Partial<Record<string, unknown>>, excludeKeys?: string[], autoCompleted?: boolean): {
    fields: string[];
    values: (string | number | null)[];
};
//# sourceMappingURL=json.d.ts.map