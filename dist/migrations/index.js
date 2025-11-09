"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrations = void 0;
exports.getCurrentVersion = getCurrentVersion;
exports.initSchemaVersion = initSchemaVersion;
exports.migrate = migrate;
exports.rollback = rollback;
const crypto = __importStar(require("crypto"));
/**
 * Helper function to get table suffix (same as PttaDatabase.getTableSuffix)
 */
function getTableSuffix(workspacePath) {
    return crypto.createHash('md5').update(workspacePath).digest('hex').substring(0, 8);
}
/**
 * All migrations in order
 */
exports.migrations = [
    {
        version: 1,
        name: 'add_updated_at_to_subtasks',
        up: (db) => {
            const workspaces = db.listWorkspaces();
            for (const workspace of workspaces) {
                const suffix = getTableSuffix(workspace.path);
                const tableName = `subtasks_${suffix}`;
                // Check if the table exists
                const tableExists = db.db
                    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
                    .get(tableName);
                if (!tableExists) {
                    continue;
                }
                // Check if updated_at column already exists
                const columns = db.db.prepare(`PRAGMA table_info(${tableName})`).all();
                const hasUpdatedAt = columns.some(col => col.name === 'updated_at');
                if (!hasUpdatedAt) {
                    // Add updated_at column (cannot use DEFAULT CURRENT_TIMESTAMP in ALTER TABLE)
                    db.db.exec(`
            ALTER TABLE ${tableName}
            ADD COLUMN updated_at DATETIME
          `);
                    // Update existing rows to have updated_at = created_at
                    // For new rows, this will be set by the application code
                    db.db.exec(`
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
    },
    {
        version: 2,
        name: 'rename_tables_for_new_hierarchy',
        up: (db) => {
            const workspaces = db.listWorkspaces();
            for (const workspace of workspaces) {
                const suffix = getTableSuffix(workspace.path);
                // Step 1: Rename projects → tasks_old (temporary)
                const projectsExists = db.db
                    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
                    .get(`projects_${suffix}`);
                if (projectsExists) {
                    db.db.exec(`ALTER TABLE projects_${suffix} RENAME TO tasks_old_${suffix}`);
                }
                // Step 2: Rename tasks → todos
                const tasksExists = db.db
                    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
                    .get(`tasks_${suffix}`);
                if (tasksExists) {
                    // First, update todos to reference task_id instead of project_id
                    // Create new todos table with correct schema
                    db.db.exec(`
            CREATE TABLE todos_${suffix} (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              task_id INTEGER,
              title TEXT NOT NULL,
              description TEXT,
              status TEXT DEFAULT 'todo',
              priority TEXT DEFAULT 'medium',
              metadata TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              completed_at DATETIME,
              FOREIGN KEY (task_id) REFERENCES tasks_${suffix}(id) ON DELETE CASCADE
            )
          `);
                    // Copy data from tasks to todos (project_id becomes task_id)
                    db.db.exec(`
            INSERT INTO todos_${suffix} (id, task_id, title, description, status, priority, metadata, created_at, updated_at, completed_at)
            SELECT id, project_id, title, description, status, priority, metadata, created_at, updated_at, completed_at
            FROM tasks_${suffix}
          `);
                    // Drop old tasks table
                    db.db.exec(`DROP TABLE tasks_${suffix}`);
                }
                // Step 3: Rename tasks_old → tasks (projects become tasks)
                if (projectsExists) {
                    db.db.exec(`ALTER TABLE tasks_old_${suffix} RENAME TO tasks_${suffix}`);
                }
                // Step 4: Rename subtasks → actions with column rename (task_id → todo_id)
                const subtasksExists = db.db
                    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
                    .get(`subtasks_${suffix}`);
                if (subtasksExists) {
                    // Create new actions table
                    db.db.exec(`
            CREATE TABLE actions_${suffix} (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              todo_id INTEGER NOT NULL,
              title TEXT NOT NULL,
              status TEXT DEFAULT 'todo',
              metadata TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME,
              completed_at DATETIME,
              FOREIGN KEY (todo_id) REFERENCES todos_${suffix}(id) ON DELETE CASCADE
            )
          `);
                    // Copy data (task_id becomes todo_id)
                    db.db.exec(`
            INSERT INTO actions_${suffix} (id, todo_id, title, status, metadata, created_at, updated_at, completed_at)
            SELECT id, task_id, title, status, metadata, created_at, updated_at, completed_at
            FROM subtasks_${suffix}
          `);
                    // Drop old subtasks table
                    db.db.exec(`DROP TABLE subtasks_${suffix}`);
                }
                // Step 5: Update summaries entity_type
                const summariesExists = db.db
                    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
                    .get(`summaries_${suffix}`);
                if (summariesExists) {
                    db.db.exec(`
            UPDATE summaries_${suffix}
            SET entity_type = CASE
              WHEN entity_type = 'project' THEN 'task'
              WHEN entity_type = 'task' THEN 'todo'
              WHEN entity_type = 'subtask' THEN 'action'
              ELSE entity_type
            END
          `);
                }
            }
        },
        down: (db) => {
            // Rollback is complex and risky
            // For safety, we leave this as no-op
            // In production, schema changes like this are typically not rolled back
        }
    }
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