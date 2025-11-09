"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMetadata = parseMetadata;
exports.stringifyMetadata = stringifyMetadata;
exports.parseEntityMetadata = parseEntityMetadata;
exports.buildUpdateQuery = buildUpdateQuery;
/**
 * Parse metadata from string to object safely
 */
function parseMetadata(metadata) {
    if (!metadata)
        return undefined;
    if (typeof metadata === 'string') {
        try {
            return JSON.parse(metadata);
        }
        catch {
            return undefined;
        }
    }
    return metadata;
}
/**
 * Stringify metadata to JSON string for database storage
 */
function stringifyMetadata(metadata) {
    if (!metadata)
        return null;
    try {
        return JSON.stringify(metadata);
    }
    catch {
        return null;
    }
}
/**
 * Parse metadata in entity object (mutates the object)
 */
function parseEntityMetadata(entity) {
    if (entity.metadata && typeof entity.metadata === 'string') {
        entity.metadata = parseMetadata(entity.metadata);
    }
    return entity;
}
/**
 * Build UPDATE query fields and values from partial entity updates
 * @param updates Partial entity object with fields to update
 * @param excludeKeys Keys to exclude from update (e.g., 'id', 'created_at')
 * @param autoCompleted Whether to auto-set completed_at for done/completed status
 * @returns Object containing fields array and values array for SQL UPDATE query
 */
function buildUpdateQuery(updates, excludeKeys = ['id', 'created_at'], autoCompleted = false) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
        if (excludeKeys.includes(key))
            continue;
        if (key === 'metadata') {
            fields.push(`${key} = ?`);
            values.push(stringifyMetadata(value));
        }
        else {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }
    // Auto-add updated_at
    fields.push('updated_at = CURRENT_TIMESTAMP');
    // Auto-add completed_at for done/completed status
    if (autoCompleted && (updates.status === 'done' || updates.status === 'completed')) {
        fields.push('completed_at = CURRENT_TIMESTAMP');
    }
    return { fields, values };
}
//# sourceMappingURL=json.js.map