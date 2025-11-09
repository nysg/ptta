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
class PttaDatabase {
    constructor(dbPath) {
        const defaultPath = path.join(os.homedir(), '.ptta', 'ptta.db');
        this.dbPath = dbPath || defaultPath;
        // ディレクトリが存在しない場合は作成
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.db = new better_sqlite3_1.default(this.dbPath);
        this.initDatabase();
    }
    initDatabase() {
        // ワークスペーステーブルの作成
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
    }
    // パスからテーブル名を生成（ハッシュ化）
    getTableSuffix(workspacePath) {
        return crypto.createHash('md5').update(workspacePath).digest('hex').substring(0, 8);
    }
    // ワークスペースの登録または取得
    registerWorkspace(workspacePath, name) {
        const absolutePath = path.resolve(workspacePath);
        const workspaceName = name || path.basename(absolutePath);
        // 既存のワークスペースを確認
        const existing = this.db
            .prepare('SELECT * FROM workspaces WHERE path = ?')
            .get(absolutePath);
        if (existing) {
            return existing;
        }
        // 新規ワークスペースを作成
        const info = this.db
            .prepare('INSERT INTO workspaces (path, name) VALUES (?, ?)')
            .run(absolutePath, workspaceName);
        const suffix = this.getTableSuffix(absolutePath);
        this.createWorkspaceTables(suffix);
        return this.db
            .prepare('SELECT * FROM workspaces WHERE id = ?')
            .get(info.lastInsertRowid);
    }
    // ワークスペース用のテーブルを作成
    createWorkspaceTables(suffix) {
        // プロジェクトテーブル
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects_${suffix} (
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
        // タスクテーブル
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks_${suffix} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (project_id) REFERENCES projects_${suffix}(id) ON DELETE CASCADE
      )
    `);
        // サブタスクテーブル
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS subtasks_${suffix} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        status TEXT DEFAULT 'todo',
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (task_id) REFERENCES tasks_${suffix}(id) ON DELETE CASCADE
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
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_project_${suffix} ON tasks_${suffix}(project_id)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_subtasks_task_${suffix} ON subtasks_${suffix}(task_id)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_summaries_entity_${suffix} ON summaries_${suffix}(entity_type, entity_id)`);
    }
    // プロジェクト操作
    createProject(workspacePath, title, description, priority = 'medium', metadata) {
        const workspace = this.registerWorkspace(workspacePath);
        const suffix = this.getTableSuffix(workspace.path);
        const info = this.db
            .prepare(`INSERT INTO projects_${suffix} (title, description, priority, metadata) VALUES (?, ?, ?, ?)`)
            .run(title, description || null, priority, metadata ? JSON.stringify(metadata) : null);
        return this.getProject(workspacePath, Number(info.lastInsertRowid));
    }
    getProject(workspacePath, id) {
        const workspace = this.registerWorkspace(workspacePath);
        const suffix = this.getTableSuffix(workspace.path);
        const project = this.db
            .prepare(`SELECT * FROM projects_${suffix} WHERE id = ?`)
            .get(id);
        if (!project)
            return null;
        if (project.metadata) {
            project.metadata = JSON.parse(project.metadata);
        }
        return project;
    }
    listProjects(workspacePath, status) {
        const workspace = this.registerWorkspace(workspacePath);
        const suffix = this.getTableSuffix(workspace.path);
        let query = `SELECT * FROM projects_${suffix}`;
        const params = [];
        if (status) {
            query += ' WHERE status = ?';
            params.push(status);
        }
        query += ' ORDER BY created_at DESC';
        const projects = this.db.prepare(query).all(...params);
        return projects.map(p => {
            if (p.metadata && typeof p.metadata === 'string') {
                p.metadata = JSON.parse(p.metadata);
            }
            return p;
        });
    }
    updateProject(workspacePath, id, updates) {
        const workspace = this.registerWorkspace(workspacePath);
        const suffix = this.getTableSuffix(workspace.path);
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(updates)) {
            if (key === 'metadata') {
                fields.push(`${key} = ?`);
                values.push(JSON.stringify(value));
            }
            else if (key !== 'id' && key !== 'created_at') {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        this.db.prepare(`UPDATE projects_${suffix} SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return this.getProject(workspacePath, id);
    }
    // タスク操作
    createTask(workspacePath, projectId, title, description, priority = 'medium', metadata) {
        const workspace = this.registerWorkspace(workspacePath);
        const suffix = this.getTableSuffix(workspace.path);
        const info = this.db
            .prepare(`INSERT INTO tasks_${suffix} (project_id, title, description, priority, metadata) VALUES (?, ?, ?, ?, ?)`)
            .run(projectId, title, description || null, priority, metadata ? JSON.stringify(metadata) : null);
        return this.getTask(workspacePath, Number(info.lastInsertRowid));
    }
    getTask(workspacePath, id) {
        const workspace = this.registerWorkspace(workspacePath);
        const suffix = this.getTableSuffix(workspace.path);
        const task = this.db
            .prepare(`SELECT * FROM tasks_${suffix} WHERE id = ?`)
            .get(id);
        if (!task)
            return null;
        if (task.metadata && typeof task.metadata === 'string') {
            task.metadata = JSON.parse(task.metadata);
        }
        return task;
    }
    listTasks(workspacePath, projectId, status) {
        const workspace = this.registerWorkspace(workspacePath);
        const suffix = this.getTableSuffix(workspace.path);
        let query = `SELECT * FROM tasks_${suffix} WHERE 1=1`;
        const params = [];
        if (projectId) {
            query += ' AND project_id = ?';
            params.push(projectId);
        }
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        query += ' ORDER BY created_at DESC';
        const tasks = this.db.prepare(query).all(...params);
        return tasks.map(t => {
            if (t.metadata && typeof t.metadata === 'string') {
                t.metadata = JSON.parse(t.metadata);
            }
            return t;
        });
    }
    updateTask(workspacePath, id, updates) {
        const workspace = this.registerWorkspace(workspacePath);
        const suffix = this.getTableSuffix(workspace.path);
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(updates)) {
            if (key === 'metadata') {
                fields.push(`${key} = ?`);
                values.push(JSON.stringify(value));
            }
            else if (key !== 'id' && key !== 'created_at' && key !== 'project_id') {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        fields.push('updated_at = CURRENT_TIMESTAMP');
        if (updates.status === 'done' || updates.status === 'completed') {
            fields.push('completed_at = CURRENT_TIMESTAMP');
        }
        values.push(id);
        this.db.prepare(`UPDATE tasks_${suffix} SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return this.getTask(workspacePath, id);
    }
    // サブタスク操作
    createSubtask(workspacePath, taskId, title, metadata) {
        const workspace = this.registerWorkspace(workspacePath);
        const suffix = this.getTableSuffix(workspace.path);
        const info = this.db
            .prepare(`INSERT INTO subtasks_${suffix} (task_id, title, metadata) VALUES (?, ?, ?)`)
            .run(taskId, title, metadata ? JSON.stringify(metadata) : null);
        return this.getSubtask(workspacePath, Number(info.lastInsertRowid));
    }
    getSubtask(workspacePath, id) {
        const workspace = this.registerWorkspace(workspacePath);
        const suffix = this.getTableSuffix(workspace.path);
        const subtask = this.db
            .prepare(`SELECT * FROM subtasks_${suffix} WHERE id = ?`)
            .get(id);
        if (!subtask)
            return null;
        if (subtask.metadata && typeof subtask.metadata === 'string') {
            subtask.metadata = JSON.parse(subtask.metadata);
        }
        return subtask;
    }
    listSubtasks(workspacePath, taskId) {
        const workspace = this.registerWorkspace(workspacePath);
        const suffix = this.getTableSuffix(workspace.path);
        const subtasks = this.db
            .prepare(`SELECT * FROM subtasks_${suffix} WHERE task_id = ? ORDER BY created_at`)
            .all(taskId);
        return subtasks.map(s => {
            if (s.metadata && typeof s.metadata === 'string') {
                s.metadata = JSON.parse(s.metadata);
            }
            return s;
        });
    }
    updateSubtask(workspacePath, id, updates) {
        const workspace = this.registerWorkspace(workspacePath);
        const suffix = this.getTableSuffix(workspace.path);
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(updates)) {
            if (key === 'metadata') {
                fields.push(`${key} = ?`);
                values.push(JSON.stringify(value));
            }
            else if (key !== 'id' && key !== 'created_at' && key !== 'task_id') {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        if (updates.status === 'done' || updates.status === 'completed') {
            fields.push('completed_at = CURRENT_TIMESTAMP');
        }
        values.push(id);
        this.db.prepare(`UPDATE subtasks_${suffix} SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return this.getSubtask(workspacePath, id);
    }
    // サマリー操作
    createSummary(workspacePath, entityType, entityId, summary, metadata) {
        const workspace = this.registerWorkspace(workspacePath);
        const suffix = this.getTableSuffix(workspace.path);
        const info = this.db
            .prepare(`INSERT INTO summaries_${suffix} (entity_type, entity_id, summary, metadata) VALUES (?, ?, ?, ?)`)
            .run(entityType, entityId, summary, metadata ? JSON.stringify(metadata) : null);
        return Number(info.lastInsertRowid);
    }
    getSummaries(workspacePath, entityType, entityId) {
        const workspace = this.registerWorkspace(workspacePath);
        const suffix = this.getTableSuffix(workspace.path);
        const summaries = this.db
            .prepare(`SELECT * FROM summaries_${suffix} WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC`)
            .all(entityType, entityId);
        return summaries.map(s => {
            if (s.metadata && typeof s.metadata === 'string') {
                s.metadata = JSON.parse(s.metadata);
            }
            return s;
        });
    }
    // 階層的な取得
    getProjectHierarchy(workspacePath, projectId) {
        const project = this.getProject(workspacePath, projectId);
        if (!project)
            return null;
        const tasks = this.listTasks(workspacePath, projectId);
        const hierarchy = {
            ...project,
            tasks: tasks.map(task => ({
                ...task,
                subtasks: this.listSubtasks(workspacePath, task.id)
            })),
            summaries: this.getSummaries(workspacePath, 'project', projectId)
        };
        return hierarchy;
    }
    // JSON形式でエクスポート
    exportAsJson(workspacePath, projectId) {
        if (projectId) {
            return this.getProjectHierarchy(workspacePath, projectId);
        }
        const projects = this.listProjects(workspacePath);
        return projects.map(p => this.getProjectHierarchy(workspacePath, p.id));
    }
    // 統計情報
    getStats(workspacePath) {
        const workspace = this.registerWorkspace(workspacePath);
        const suffix = this.getTableSuffix(workspace.path);
        const getCount = (query) => {
            const result = this.db.prepare(query).get();
            return result?.count || 0;
        };
        return {
            projects: {
                total: getCount(`SELECT COUNT(*) as count FROM projects_${suffix}`),
                active: getCount(`SELECT COUNT(*) as count FROM projects_${suffix} WHERE status = 'active'`),
                completed: getCount(`SELECT COUNT(*) as count FROM projects_${suffix} WHERE status = 'completed'`)
            },
            tasks: {
                total: getCount(`SELECT COUNT(*) as count FROM tasks_${suffix}`),
                todo: getCount(`SELECT COUNT(*) as count FROM tasks_${suffix} WHERE status = 'todo'`),
                inProgress: getCount(`SELECT COUNT(*) as count FROM tasks_${suffix} WHERE status = 'in_progress'`),
                done: getCount(`SELECT COUNT(*) as count FROM tasks_${suffix} WHERE status = 'done'`)
            },
            subtasks: {
                total: getCount(`SELECT COUNT(*) as count FROM subtasks_${suffix}`),
                todo: getCount(`SELECT COUNT(*) as count FROM subtasks_${suffix} WHERE status = 'todo'`),
                done: getCount(`SELECT COUNT(*) as count FROM subtasks_${suffix} WHERE status = 'done'`)
            }
        };
    }
    // ワークスペース一覧
    listWorkspaces() {
        return this.db.prepare('SELECT * FROM workspaces ORDER BY updated_at DESC').all();
    }
    close() {
        this.db.close();
    }
}
exports.PttaDatabase = PttaDatabase;
//# sourceMappingURL=database.js.map