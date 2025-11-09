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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PttaDatabase = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const crypto = __importStar(require("crypto"));
const errors_1 = require("./utils/errors");
const json_1 = require("./utils/json");
const logger_1 = require("./utils/logger");
const migrations_1 = require("./migrations");
class PttaDatabase {
    constructor(dbPath) {
        this.logger = (0, logger_1.createLogger)({ module: 'PttaDatabase' });
        const defaultPath = path.join(os.homedir(), '.ptta', 'ptta.db');
        this.dbPath = dbPath || defaultPath;
        // ディレクトリが存在しない場合は作成
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            this.logger.info({ dir }, 'Created database directory');
        }
        this.db = new better_sqlite3_1.default(this.dbPath);
        this.logger.info({ dbPath: this.dbPath }, 'Database initialized');
        this.initDatabase();
    }
    initDatabase() {
        // ワークスペーステーブルの作成（マイグレーションより先に実行）
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_workspaces_path ON workspaces(path)');
        // Initialize schema version table for migrations
        (0, migrations_1.initSchemaVersion)(this);
        // Run any pending migrations
        (0, migrations_1.migrate)(this);
    }
    // パスからテーブル名を生成（ハッシュ化）
    getTableSuffix(workspacePath) {
        return crypto.createHash('md5').update(workspacePath).digest('hex').substring(0, 8);
    }
    // ワークスペースの登録または取得
    registerWorkspace(workspacePath, name) {
        try {
            const absolutePath = path.resolve(workspacePath);
            const workspaceName = name || path.basename(absolutePath);
            // 既存のワークスペースを確認
            const existing = this.db
                .prepare('SELECT * FROM workspaces WHERE path = ?')
                .get(absolutePath);
            if (existing) {
                this.logger.debug({ workspaceId: existing.id, path: absolutePath }, 'Using existing workspace');
                return existing;
            }
            // 新規ワークスペースを作成
            const info = this.db
                .prepare('INSERT INTO workspaces (path, name) VALUES (?, ?)')
                .run(absolutePath, workspaceName);
            const suffix = this.getTableSuffix(absolutePath);
            this.createWorkspaceTables(suffix);
            const workspace = this.db
                .prepare('SELECT * FROM workspaces WHERE id = ?')
                .get(info.lastInsertRowid);
            this.logger.info({ workspaceId: workspace.id, name: workspaceName, path: absolutePath }, 'Created new workspace');
            return workspace;
        }
        catch (error) {
            this.logger.error({ workspacePath, error }, 'Failed to register workspace');
            throw new errors_1.DatabaseError('Failed to register workspace', error);
        }
    }
    // ワークスペース用のテーブルを作成
    createWorkspaceTables(suffix) {
        // タスクテーブル
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks_${suffix} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'active',
        priority TEXT DEFAULT 'medium',
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `);
        // TODOテーブル
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS todos_${suffix} (
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
        // アクションテーブル
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS actions_${suffix} (
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
        // サマリーテーブル
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS summaries_${suffix} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        summary TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // インデックス
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_todos_task_${suffix} ON todos_${suffix}(task_id)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_actions_todo_${suffix} ON actions_${suffix}(todo_id)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_summaries_entity_${suffix} ON summaries_${suffix}(entity_type, entity_id)`);
    }
    // Task操作
    createTask(workspacePath, title, description, priority = 'medium', metadata) {
        try {
            const workspace = this.registerWorkspace(workspacePath);
            const suffix = this.getTableSuffix(workspace.path);
            const info = this.db
                .prepare(`INSERT INTO tasks_${suffix} (title, description, priority, metadata) VALUES (?, ?, ?, ?)`)
                .run(title, description || null, priority, (0, json_1.stringifyMetadata)(metadata));
            const task = this.getTask(workspacePath, Number(info.lastInsertRowid));
            if (!task) {
                throw new errors_1.DatabaseError('Failed to retrieve created task');
            }
            this.logger.info({ taskId: task.id, title, workspaceId: workspace.id }, 'Created task');
            return task;
        }
        catch (error) {
            this.logger.error({ title, workspacePath, error }, 'Failed to create task');
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Failed to create task', error);
        }
    }
    getTask(workspacePath, id) {
        try {
            const workspace = this.registerWorkspace(workspacePath);
            const suffix = this.getTableSuffix(workspace.path);
            const task = this.db
                .prepare(`SELECT * FROM tasks_${suffix} WHERE id = ?`)
                .get(id);
            if (!task)
                return null;
            return (0, json_1.parseEntityMetadata)(task);
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Failed to get task with ID ${id}`, error);
        }
    }
    listTasks(workspacePath, status) {
        try {
            const workspace = this.registerWorkspace(workspacePath);
            const suffix = this.getTableSuffix(workspace.path);
            let query = `SELECT * FROM tasks_${suffix}`;
            const params = [];
            if (status) {
                query += ' WHERE status = ?';
                params.push(status);
            }
            query += ' ORDER BY created_at DESC';
            const tasks = this.db.prepare(query).all(...params);
            return tasks.map(t => (0, json_1.parseEntityMetadata)(t));
        }
        catch (error) {
            throw new errors_1.DatabaseError('Failed to list tasks', error);
        }
    }
    updateTask(workspacePath, id, updates) {
        try {
            const workspace = this.registerWorkspace(workspacePath);
            const suffix = this.getTableSuffix(workspace.path);
            const { fields, values } = (0, json_1.buildUpdateQuery)(updates, ['id', 'created_at'], false);
            values.push(id);
            this.db.prepare(`UPDATE tasks_${suffix} SET ${fields.join(', ')} WHERE id = ?`).run(...values);
            return this.getTask(workspacePath, id);
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Failed to update task with ID ${id}`, error);
        }
    }
    // Todo操作
    createTodo(workspacePath, taskId, title, description, priority = 'medium', metadata) {
        try {
            const workspace = this.registerWorkspace(workspacePath);
            const suffix = this.getTableSuffix(workspace.path);
            const info = this.db
                .prepare(`INSERT INTO todos_${suffix} (task_id, title, description, priority, metadata) VALUES (?, ?, ?, ?, ?)`)
                .run(taskId, title, description || null, priority, (0, json_1.stringifyMetadata)(metadata));
            const todo = this.getTodo(workspacePath, Number(info.lastInsertRowid));
            if (!todo) {
                throw new errors_1.DatabaseError('Failed to retrieve created todo');
            }
            return todo;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Failed to create todo', error);
        }
    }
    getTodo(workspacePath, id) {
        try {
            const workspace = this.registerWorkspace(workspacePath);
            const suffix = this.getTableSuffix(workspace.path);
            const todo = this.db
                .prepare(`SELECT * FROM todos_${suffix} WHERE id = ?`)
                .get(id);
            if (!todo)
                return null;
            return (0, json_1.parseEntityMetadata)(todo);
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Failed to get todo with ID ${id}`, error);
        }
    }
    listTodos(workspacePath, taskId, status) {
        try {
            const workspace = this.registerWorkspace(workspacePath);
            const suffix = this.getTableSuffix(workspace.path);
            let query = `SELECT * FROM todos_${suffix} WHERE 1=1`;
            const params = [];
            if (taskId) {
                query += ' AND task_id = ?';
                params.push(taskId);
            }
            if (status) {
                query += ' AND status = ?';
                params.push(status);
            }
            query += ' ORDER BY created_at DESC';
            const todos = this.db.prepare(query).all(...params);
            return todos.map(t => (0, json_1.parseEntityMetadata)(t));
        }
        catch (error) {
            throw new errors_1.DatabaseError('Failed to list todos', error);
        }
    }
    updateTodo(workspacePath, id, updates) {
        try {
            const workspace = this.registerWorkspace(workspacePath);
            const suffix = this.getTableSuffix(workspace.path);
            const { fields, values } = (0, json_1.buildUpdateQuery)(updates, ['id', 'created_at', 'task_id'], true);
            values.push(id);
            this.db.prepare(`UPDATE todos_${suffix} SET ${fields.join(', ')} WHERE id = ?`).run(...values);
            return this.getTodo(workspacePath, id);
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Failed to update todo with ID ${id}`, error);
        }
    }
    // Action操作
    createAction(workspacePath, todoId, title, metadata) {
        try {
            const workspace = this.registerWorkspace(workspacePath);
            const suffix = this.getTableSuffix(workspace.path);
            const info = this.db
                .prepare(`INSERT INTO actions_${suffix} (todo_id, title, metadata) VALUES (?, ?, ?)`)
                .run(todoId, title, (0, json_1.stringifyMetadata)(metadata));
            const action = this.getAction(workspacePath, Number(info.lastInsertRowid));
            if (!action) {
                throw new errors_1.DatabaseError('Failed to retrieve created action');
            }
            return action;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Failed to create action', error);
        }
    }
    getAction(workspacePath, id) {
        try {
            const workspace = this.registerWorkspace(workspacePath);
            const suffix = this.getTableSuffix(workspace.path);
            const action = this.db
                .prepare(`SELECT * FROM actions_${suffix} WHERE id = ?`)
                .get(id);
            if (!action)
                return null;
            return (0, json_1.parseEntityMetadata)(action);
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Failed to get action with ID ${id}`, error);
        }
    }
    listActions(workspacePath, todoId) {
        try {
            const workspace = this.registerWorkspace(workspacePath);
            const suffix = this.getTableSuffix(workspace.path);
            const actions = this.db
                .prepare(`SELECT * FROM actions_${suffix} WHERE todo_id = ? ORDER BY created_at`)
                .all(todoId);
            return actions.map(a => (0, json_1.parseEntityMetadata)(a));
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Failed to list actions for todo ${todoId}`, error);
        }
    }
    updateAction(workspacePath, id, updates) {
        try {
            const workspace = this.registerWorkspace(workspacePath);
            const suffix = this.getTableSuffix(workspace.path);
            const { fields, values } = (0, json_1.buildUpdateQuery)(updates, ['id', 'created_at', 'todo_id'], true);
            values.push(id);
            this.db.prepare(`UPDATE actions_${suffix} SET ${fields.join(', ')} WHERE id = ?`).run(...values);
            return this.getAction(workspacePath, id);
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Failed to update action with ID ${id}`, error);
        }
    }
    // サマリー操作
    createSummary(workspacePath, entityType, entityId, summary, metadata) {
        try {
            const workspace = this.registerWorkspace(workspacePath);
            const suffix = this.getTableSuffix(workspace.path);
            const info = this.db
                .prepare(`INSERT INTO summaries_${suffix} (entity_type, entity_id, summary, metadata) VALUES (?, ?, ?, ?)`)
                .run(entityType, entityId, summary, (0, json_1.stringifyMetadata)(metadata));
            return Number(info.lastInsertRowid);
        }
        catch (error) {
            throw new errors_1.DatabaseError('Failed to create summary', error);
        }
    }
    getSummaries(workspacePath, entityType, entityId) {
        try {
            const workspace = this.registerWorkspace(workspacePath);
            const suffix = this.getTableSuffix(workspace.path);
            const summaries = this.db
                .prepare(`SELECT * FROM summaries_${suffix} WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC`)
                .all(entityType, entityId);
            return summaries.map(s => (0, json_1.parseEntityMetadata)(s));
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Failed to get summaries for ${entityType} ${entityId}`, error);
        }
    }
    // 階層的な取得
    getTaskHierarchy(workspacePath, taskId) {
        try {
            const task = this.getTask(workspacePath, taskId);
            if (!task)
                return null;
            const todos = this.listTodos(workspacePath, taskId);
            const hierarchy = {
                ...task,
                todos: todos.map(todo => ({
                    ...todo,
                    actions: this.listActions(workspacePath, todo.id)
                })),
                summaries: this.getSummaries(workspacePath, 'task', taskId)
            };
            return hierarchy;
        }
        catch (error) {
            throw new errors_1.DatabaseError(`Failed to get task hierarchy for task ${taskId}`, error);
        }
    }
    // JSON形式でエクスポート
    exportAsJson(workspacePath, taskId) {
        try {
            if (taskId) {
                return this.getTaskHierarchy(workspacePath, taskId);
            }
            const tasks = this.listTasks(workspacePath);
            return tasks.map(t => this.getTaskHierarchy(workspacePath, t.id));
        }
        catch (error) {
            throw new errors_1.DatabaseError('Failed to export data as JSON', error);
        }
    }
    // 統計情報
    getStats(workspacePath) {
        try {
            const workspace = this.registerWorkspace(workspacePath);
            const suffix = this.getTableSuffix(workspace.path);
            const getCount = (query) => {
                const result = this.db.prepare(query).get();
                return result?.count || 0;
            };
            return {
                tasks: {
                    total: getCount(`SELECT COUNT(*) as count FROM tasks_${suffix}`),
                    active: getCount(`SELECT COUNT(*) as count FROM tasks_${suffix} WHERE status = 'active'`),
                    completed: getCount(`SELECT COUNT(*) as count FROM tasks_${suffix} WHERE status = 'completed'`)
                },
                todos: {
                    total: getCount(`SELECT COUNT(*) as count FROM todos_${suffix}`),
                    todo: getCount(`SELECT COUNT(*) as count FROM todos_${suffix} WHERE status = 'todo'`),
                    inProgress: getCount(`SELECT COUNT(*) as count FROM todos_${suffix} WHERE status = 'in_progress'`),
                    done: getCount(`SELECT COUNT(*) as count FROM todos_${suffix} WHERE status = 'done'`)
                },
                actions: {
                    total: getCount(`SELECT COUNT(*) as count FROM actions_${suffix}`),
                    todo: getCount(`SELECT COUNT(*) as count FROM actions_${suffix} WHERE status = 'todo'`),
                    done: getCount(`SELECT COUNT(*) as count FROM actions_${suffix} WHERE status = 'done'`)
                }
            };
        }
        catch (error) {
            throw new errors_1.DatabaseError('Failed to get stats', error);
        }
    }
    // ワークスペース一覧
    listWorkspaces() {
        try {
            return this.db.prepare('SELECT * FROM workspaces ORDER BY updated_at DESC').all();
        }
        catch (error) {
            throw new errors_1.DatabaseError('Failed to list workspaces', error);
        }
    }
    /**
     * Execute a function within a transaction
     * Automatically handles commit on success and rollback on error
     */
    transaction(fn) {
        const trx = this.db.transaction(fn);
        return trx();
    }
    /**
     * Begin a transaction manually (for advanced use cases)
     */
    beginTransaction() {
        this.db.exec('BEGIN TRANSACTION');
    }
    /**
     * Commit the current transaction
     */
    commit() {
        this.db.exec('COMMIT');
    }
    /**
     * Rollback the current transaction
     */
    rollback() {
        this.db.exec('ROLLBACK');
    }
    close() {
        this.db.close();
    }
}
exports.PttaDatabase = PttaDatabase;
//# sourceMappingURL=database.js.map