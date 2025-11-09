import { ValidationError } from './errors';

/**
 * Parse integer safely with validation
 */
export function parseIntSafe(value: string, fieldName: string = 'value'): number {
  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    throw new ValidationError(`Invalid ${fieldName}: "${value}" is not a valid number`, fieldName);
  }

  if (parsed < 0) {
    throw new ValidationError(`Invalid ${fieldName}: must be a non-negative number`, fieldName);
  }

  return parsed;
}

/**
 * Validate required field
 */
export function validateRequired(value: unknown, fieldName: string): void {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
}

/**
 * Validate status value
 */
export function validateStatus(status: string, allowedStatuses: string[], entityType: string = 'entity'): void {
  if (!allowedStatuses.includes(status)) {
    throw new ValidationError(
      `Invalid status for ${entityType}: "${status}". Allowed values: ${allowedStatuses.join(', ')}`,
      'status'
    );
  }
}

/**
 * Validate priority value
 */
export function validatePriority(priority: string): void {
  const allowedPriorities = ['low', 'medium', 'high'];
  if (!allowedPriorities.includes(priority)) {
    throw new ValidationError(
      `Invalid priority: "${priority}". Allowed values: ${allowedPriorities.join(', ')}`,
      'priority'
    );
  }
}

/**
 * Validate entity type for summaries
 */
export function validateEntityType(entityType: string): void {
  const allowedTypes = ['project', 'task'];
  if (!allowedTypes.includes(entityType)) {
    throw new ValidationError(
      `Invalid entity type: "${entityType}". Allowed values: ${allowedTypes.join(', ')}`,
      'entity_type'
    );
  }
}
