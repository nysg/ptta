import { PttaDatabase } from '../database';

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
 * All migrations in order
 */
export const migrations: Migration[] = [
  // Future migrations will be added here
  // Example:
  // {
  //   version: 1,
  //   name: 'add_tags_column',
  //   up: (db) => {
  //     // Add migration logic
  //   },
  //   down: (db) => {
  //     // Add rollback logic
  //   }
  // }
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
