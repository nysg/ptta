import { Metadata } from '../database';

/**
 * Parse metadata from string to object safely
 */
export function parseMetadata(metadata: string | Metadata | undefined | null): Metadata | undefined {
  if (!metadata) return undefined;
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata) as Metadata;
    } catch {
      return undefined;
    }
  }
  return metadata;
}

/**
 * Stringify metadata to JSON string for database storage
 */
export function stringifyMetadata(metadata: Metadata | undefined | null): string | null {
  if (!metadata) return null;
  try {
    return JSON.stringify(metadata);
  } catch {
    return null;
  }
}

/**
 * Parse metadata in entity object (mutates the object)
 */
export function parseEntityMetadata<T extends { metadata?: string | Metadata }>(entity: T): T {
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
export function buildUpdateQuery<T extends Record<string, unknown>>(
  updates: Partial<T>,
  excludeKeys: string[] = ['id', 'created_at'],
  autoCompleted: boolean = false
): { fields: string[]; values: (string | number | null)[] } {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (excludeKeys.includes(key)) continue;

    if (key === 'metadata') {
      fields.push(`${key} = ?`);
      values.push(stringifyMetadata(value as Metadata));
    } else {
      fields.push(`${key} = ?`);
      values.push(value as string | number | null);
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
