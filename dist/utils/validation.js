"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIntSafe = parseIntSafe;
exports.validateRequired = validateRequired;
exports.validateStatus = validateStatus;
exports.validatePriority = validatePriority;
exports.validateEntityType = validateEntityType;
const errors_1 = require("./errors");
/**
 * Parse integer safely with validation
 */
function parseIntSafe(value, fieldName = 'value') {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new errors_1.ValidationError(`Invalid ${fieldName}: "${value}" is not a valid number`, fieldName);
    }
    if (parsed < 0) {
        throw new errors_1.ValidationError(`Invalid ${fieldName}: must be a non-negative number`, fieldName);
    }
    return parsed;
}
/**
 * Validate required field
 */
function validateRequired(value, fieldName) {
    if (value === null || value === undefined || value === '') {
        throw new errors_1.ValidationError(`${fieldName} is required`, fieldName);
    }
}
/**
 * Validate status value
 */
function validateStatus(status, allowedStatuses, entityType = 'entity') {
    if (!allowedStatuses.includes(status)) {
        throw new errors_1.ValidationError(`Invalid status for ${entityType}: "${status}". Allowed values: ${allowedStatuses.join(', ')}`, 'status');
    }
}
/**
 * Validate priority value
 */
function validatePriority(priority) {
    const allowedPriorities = ['low', 'medium', 'high'];
    if (!allowedPriorities.includes(priority)) {
        throw new errors_1.ValidationError(`Invalid priority: "${priority}". Allowed values: ${allowedPriorities.join(', ')}`, 'priority');
    }
}
/**
 * Validate entity type for summaries
 */
function validateEntityType(entityType) {
    const allowedTypes = ['project', 'task'];
    if (!allowedTypes.includes(entityType)) {
        throw new errors_1.ValidationError(`Invalid entity type: "${entityType}". Allowed values: ${allowedTypes.join(', ')}`, 'entity_type');
    }
}
//# sourceMappingURL=validation.js.map