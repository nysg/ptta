"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrations = void 0;
exports.getCurrentVersion = getCurrentVersion;
exports.initSchemaVersion = initSchemaVersion;
exports.migrate = migrate;
exports.rollback = rollback;
/**
 * All migrations in order
 */
exports.migrations = [
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
function getCurrentVersion(db) {
    try {
        const result = db.db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get();
        return result?.version || 0;
    }
    catch {
        // schema_version table doesn't exist yet
        return 0;
    }
}
/**
 * Initialize schema_version table
 */
function initSchemaVersion(db) {
    db.db.exec(`
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
function migrate(db, targetVersion) {
    initSchemaVersion(db);
    const currentVersion = getCurrentVersion(db);
    const target = targetVersion ?? exports.migrations[exports.migrations.length - 1]?.version ?? 0;
    if (currentVersion >= target) {
        return;
    }
    const pendingMigrations = exports.migrations.filter(m => m.version > currentVersion && m.version <= target);
    db.transaction(() => {
        for (const migration of pendingMigrations) {
            migration.up(db);
            db.db.prepare('INSERT INTO schema_version (version, name) VALUES (?, ?)').run(migration.version, migration.name);
        }
    });
}
/**
 * Rollback migrations to target version
 */
function rollback(db, targetVersion = 0) {
    const currentVersion = getCurrentVersion(db);
    if (currentVersion <= targetVersion) {
        return;
    }
    const migrationsToRollback = exports.migrations
        .filter(m => m.version > targetVersion && m.version <= currentVersion)
        .sort((a, b) => b.version - a.version);
    db.transaction(() => {
        for (const migration of migrationsToRollback) {
            migration.down(db);
            db.db.prepare('DELETE FROM schema_version WHERE version = ?').run(migration.version);
        }
    });
}
//# sourceMappingURL=index.js.map