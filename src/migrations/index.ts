import { PttaDatabase } from '../database';
import * as crypto from 'crypto';

/**
 * Migration interface
 */
export interface Migration {
  version: number;
  name: string;
  up: (db: PttaDatabase) => void;
  down: (db: PttaDatabase) => void;
}

/**
 * Helper function to get table suffix (same as PttaDatabase.getTableSuffix)
 */
function getTableSuffix(workspacePath: string): string {
  return crypto.createHash('md5').update(workspacePath).digest('hex').substring(0, 8);
}

/**
 * All migrations in order
 */
export const migrations: Migration[] = [
  {
    version: 1,
    name: 'add_updated_at_to_subtasks',
    up: (db) => {
      const workspaces = db.listWorkspaces();

      for (const workspace of workspaces) {
        const suffix = getTableSuffix(workspace.path);
        const tableName = `subtasks_${suffix}`;

        // Check if the table exists
        const tableExists = (db as any).db
          .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
          .get(tableName);

        if (!tableExists) {
          continue;
        }

        // Check if updated_at column already exists
        const columns = (db as any).db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
        const hasUpdatedAt = columns.some(col => col.name === 'updated_at');

        if (!hasUpdatedAt) {
          // Add updated_at column (cannot use DEFAULT CURRENT_TIMESTAMP in ALTER TABLE)
          (db as any).db.exec(`
            ALTER TABLE ${tableName}
            ADD COLUMN updated_at DATETIME
          `);

          // Update existing rows to have updated_at = created_at
          // For new rows, this will be set by the application code
          (db as any).db.exec(`
            UPDATE ${tableName}
            SET updated_at = created_at
          `);
        }
      }
    },
    down: (db) => {
      // SQLite doesn't support DROP COLUMN directly
      // Would require table recreation, which is risky for production data
      // Leave as no-op for safety
      const workspaces = db.listWorkspaces();

      for (const workspace of workspaces) {
        const suffix = getTableSuffix(workspace.path);
        const tableName = `subtasks_${suffix}`;

        // We could recreate the table without updated_at column here,
        // but it's safer to leave it as-is for rollback
        // In production, you'd typically not rollback schema changes
      }
    }
  }
];

/**
 * Get current schema version from database
 */
export function getCurrentVersion(db: PttaDatabase): number {
  try {
    const result = (db as any).db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined;
    return result?.version || 0;
  } catch {
    // schema_version table doesn't exist yet
    return 0;
  }
}

/**
 * Initialize schema_version table
 */
export function initSchemaVersion(db: PttaDatabase): void {
  (db as any).db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Run migrations up to target version
 */
export function migrate(db: PttaDatabase, targetVersion?: number): void {
  initSchemaVersion(db);

  const currentVersion = getCurrentVersion(db);
  const target = targetVersion ?? migrations[migrations.length - 1]?.version ?? 0;

  if (currentVersion >= target) {
    return;
  }

  const pendingMigrations = migrations.filter(m => m.version > currentVersion && m.version <= target);

  db.transaction(() => {
    for (const migration of pendingMigrations) {
      migration.up(db);
      (db as any).db.prepare('INSERT INTO schema_version (version, name) VALUES (?, ?)').run(migration.version, migration.name);
    }
  });
}

/**
 * Rollback migrations to target version
 */
export function rollback(db: PttaDatabase, targetVersion: number = 0): void {
  const currentVersion = getCurrentVersion(db);

  if (currentVersion <= targetVersion) {
    return;
  }

  const migrationsToRollback = migrations
    .filter(m => m.version > targetVersion && m.version <= currentVersion)
    .sort((a, b) => b.version - a.version);

  db.transaction(() => {
    for (const migration of migrationsToRollback) {
      migration.down(db);
      (db as any).db.prepare('DELETE FROM schema_version WHERE version = ?').run(migration.version);
    }
  });
}
