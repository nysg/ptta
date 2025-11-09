import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import { DatabaseError, NotFoundError } from './utils/errors';
import { parseMetadata, stringifyMetadata, parseEntityMetadata, buildUpdateQuery } from './utils/json';
import { createLogger } from './utils/logger';
import { initSchemaVersion, migrate } from './migrations';
import type {
  Workspace,
  Metadata,
  Task,
  Todo,
  Action,
  Summary,
  TaskHierarchy,
  Stats,
  TaskCreateInput,
  TodoCreateInput,
  ActionCreateInput,
  TaskUpdate,
  TodoUpdate,
  ActionUpdate
} from './types';

// Re-export types for backward compatibility
export type {
  Workspace,
  Metadata,
  Task,
  Todo,
  Action,
  Summary,
  TaskHierarchy,
  Stats,
  TaskCreateInput,
  TodoCreateInput,
  ActionCreateInput,
  TaskUpdate,
  TodoUpdate,
  ActionUpdate
};

export class PttaDatabase {
  private db: Database.Database;
  private dbPath: string;
  private logger = createLogger({ module: 'PttaDatabase' });

  constructor(dbPath?: string) {
    const defaultPath = path.join(os.homedir(), '.ptta', 'ptta.db');
    this.dbPath = dbPath || defaultPath;

    // ディレクトリが存在しない場合は作成
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      this.logger.info({ dir }, 'Created database directory');
    }

    this.db = new Database(this.dbPath);
    this.logger.info({ dbPath: this.dbPath }, 'Database initialized');
    this.initDatabase();
  }

  private initDatabase(): void {
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
    initSchemaVersion(this);

    // Run any pending migrations
    migrate(this);
  }

  // パスからテーブル名を生成（ハッシュ化）
  private getTableSuffix(workspacePath: string): string {
    return crypto.createHash('md5').update(workspacePath).digest('hex').substring(0, 8);
  }

  // ワークスペースの登録または取得
  registerWorkspace(workspacePath: string, name?: string): Workspace {
    try {
      const absolutePath = path.resolve(workspacePath);
      const workspaceName = name || path.basename(absolutePath);

      // 既存のワークスペースを確認
      const existing = this.db
        .prepare('SELECT * FROM workspaces WHERE path = ?')
        .get(absolutePath) as Workspace | undefined;

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
        .get(info.lastInsertRowid) as Workspace;

      this.logger.info({ workspaceId: workspace.id, name: workspaceName, path: absolutePath }, 'Created new workspace');
      return workspace;
    } catch (error) {
      this.logger.error({ workspacePath, error }, 'Failed to register workspace');
      throw new DatabaseError('Failed to register workspace', error);
    }
  }

  // ワークスペース用のテーブルを作成
  private createWorkspaceTables(suffix: string): void {
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
  createTask(workspacePath: string, title: string, description?: string, priority: string = 'medium', metadata?: Metadata): Task {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const info = this.db
        .prepare(`INSERT INTO tasks_${suffix} (title, description, priority, metadata) VALUES (?, ?, ?, ?)`)
        .run(title, description || null, priority, stringifyMetadata(metadata));

      const task = this.getTask(workspacePath, Number(info.lastInsertRowid));
      if (!task) {
        throw new DatabaseError('Failed to retrieve created task');
      }
      this.logger.info({ taskId: task.id, title, workspaceId: workspace.id }, 'Created task');
      return task;
    } catch (error) {
      this.logger.error({ title, workspacePath, error }, 'Failed to create task');
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to create task', error);
    }
  }

  getTask(workspacePath: string, id: number): Task | null {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const task = this.db
        .prepare(`SELECT * FROM tasks_${suffix} WHERE id = ?`)
        .get(id) as Task | undefined;

      if (!task) return null;

      return parseEntityMetadata(task);
    } catch (error) {
      throw new DatabaseError(`Failed to get task with ID ${id}`, error);
    }
  }

  listTasks(workspacePath: string, status?: string): Task[] {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      let query = `SELECT * FROM tasks_${suffix}`;
      const params: (string | number)[] = [];

      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const tasks = this.db.prepare(query).all(...params) as Task[];

      return tasks.map(t => parseEntityMetadata(t));
    } catch (error) {
      throw new DatabaseError('Failed to list tasks', error);
    }
  }

  updateTask(workspacePath: string, id: number, updates: TaskUpdate): Task | null {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const { fields, values } = buildUpdateQuery(updates, ['id', 'created_at'], false);
      values.push(id);

      this.db.prepare(`UPDATE tasks_${suffix} SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      return this.getTask(workspacePath, id);
    } catch (error) {
      throw new DatabaseError(`Failed to update task with ID ${id}`, error);
    }
  }

  // Todo操作
  createTodo(workspacePath: string, taskId: number, title: string, description?: string, priority: string = 'medium', metadata?: Metadata): Todo {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const info = this.db
        .prepare(`INSERT INTO todos_${suffix} (task_id, title, description, priority, metadata) VALUES (?, ?, ?, ?, ?)`)
        .run(taskId, title, description || null, priority, stringifyMetadata(metadata));

      const todo = this.getTodo(workspacePath, Number(info.lastInsertRowid));
      if (!todo) {
        throw new DatabaseError('Failed to retrieve created todo');
      }
      return todo;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to create todo', error);
    }
  }

  getTodo(workspacePath: string, id: number): Todo | null {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const todo = this.db
        .prepare(`SELECT * FROM todos_${suffix} WHERE id = ?`)
        .get(id) as Todo | undefined;

      if (!todo) return null;

      return parseEntityMetadata(todo);
    } catch (error) {
      throw new DatabaseError(`Failed to get todo with ID ${id}`, error);
    }
  }

  listTodos(workspacePath: string, taskId?: number, status?: string): Todo[] {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      let query = `SELECT * FROM todos_${suffix} WHERE 1=1`;
      const params: (string | number)[] = [];

      if (taskId) {
        query += ' AND task_id = ?';
        params.push(taskId);
      }

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const todos = this.db.prepare(query).all(...params) as Todo[];

      return todos.map(t => parseEntityMetadata(t));
    } catch (error) {
      throw new DatabaseError('Failed to list todos', error);
    }
  }

  updateTodo(workspacePath: string, id: number, updates: TodoUpdate): Todo | null {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const { fields, values } = buildUpdateQuery(updates, ['id', 'created_at', 'task_id'], true);
      values.push(id);

      this.db.prepare(`UPDATE todos_${suffix} SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      return this.getTodo(workspacePath, id);
    } catch (error) {
      throw new DatabaseError(`Failed to update todo with ID ${id}`, error);
    }
  }

  // Action操作
  createAction(workspacePath: string, todoId: number, title: string, metadata?: Metadata): Action {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const info = this.db
        .prepare(`INSERT INTO actions_${suffix} (todo_id, title, metadata) VALUES (?, ?, ?)`)
        .run(todoId, title, stringifyMetadata(metadata));

      const action = this.getAction(workspacePath, Number(info.lastInsertRowid));
      if (!action) {
        throw new DatabaseError('Failed to retrieve created action');
      }
      return action;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to create action', error);
    }
  }

  getAction(workspacePath: string, id: number): Action | null {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const action = this.db
        .prepare(`SELECT * FROM actions_${suffix} WHERE id = ?`)
        .get(id) as Action | undefined;

      if (!action) return null;

      return parseEntityMetadata(action);
    } catch (error) {
      throw new DatabaseError(`Failed to get action with ID ${id}`, error);
    }
  }

  listActions(workspacePath: string, todoId: number): Action[] {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const actions = this.db
        .prepare(`SELECT * FROM actions_${suffix} WHERE todo_id = ? ORDER BY created_at`)
        .all(todoId) as Action[];

      return actions.map(a => parseEntityMetadata(a));
    } catch (error) {
      throw new DatabaseError(`Failed to list actions for todo ${todoId}`, error);
    }
  }

  updateAction(workspacePath: string, id: number, updates: ActionUpdate): Action | null {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const { fields, values } = buildUpdateQuery(updates, ['id', 'created_at', 'todo_id'], true);
      values.push(id);

      this.db.prepare(`UPDATE actions_${suffix} SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      return this.getAction(workspacePath, id);
    } catch (error) {
      throw new DatabaseError(`Failed to update action with ID ${id}`, error);
    }
  }

  // サマリー操作
  createSummary(workspacePath: string, entityType: string, entityId: number, summary: string, metadata?: Metadata): number {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const info = this.db
        .prepare(`INSERT INTO summaries_${suffix} (entity_type, entity_id, summary, metadata) VALUES (?, ?, ?, ?)`)
        .run(entityType, entityId, summary, stringifyMetadata(metadata));

      return Number(info.lastInsertRowid);
    } catch (error) {
      throw new DatabaseError('Failed to create summary', error);
    }
  }

  getSummaries(workspacePath: string, entityType: string, entityId: number): Summary[] {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const summaries = this.db
        .prepare(`SELECT * FROM summaries_${suffix} WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC`)
        .all(entityType, entityId) as Summary[];

      return summaries.map(s => parseEntityMetadata(s));
    } catch (error) {
      throw new DatabaseError(`Failed to get summaries for ${entityType} ${entityId}`, error);
    }
  }

  // 階層的な取得
  getTaskHierarchy(workspacePath: string, taskId: number): TaskHierarchy | null {
    try {
      const task = this.getTask(workspacePath, taskId);
      if (!task) return null;

      const todos = this.listTodos(workspacePath, taskId);

      const hierarchy: TaskHierarchy = {
        ...task,
        todos: todos.map(todo => ({
          ...todo,
          actions: this.listActions(workspacePath, todo.id)
        })),
        summaries: this.getSummaries(workspacePath, 'task', taskId)
      };

      return hierarchy;
    } catch (error) {
      throw new DatabaseError(`Failed to get task hierarchy for task ${taskId}`, error);
    }
  }

  // JSON形式でエクスポート
  exportAsJson(workspacePath: string, taskId?: number): TaskHierarchy | null | (TaskHierarchy | null)[] {
    try {
      if (taskId) {
        return this.getTaskHierarchy(workspacePath, taskId);
      }

      const tasks = this.listTasks(workspacePath);
      return tasks.map(t => this.getTaskHierarchy(workspacePath, t.id));
    } catch (error) {
      throw new DatabaseError('Failed to export data as JSON', error);
    }
  }

  // 統計情報
  getStats(workspacePath: string): Stats {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const getCount = (query: string): number => {
        const result = this.db.prepare(query).get() as { count: number } | undefined;
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
    } catch (error) {
      throw new DatabaseError('Failed to get stats', error);
    }
  }

  // ワークスペース一覧
  listWorkspaces(): Workspace[] {
    try {
      return this.db.prepare('SELECT * FROM workspaces ORDER BY updated_at DESC').all() as Workspace[];
    } catch (error) {
      throw new DatabaseError('Failed to list workspaces', error);
    }
  }

  /**
   * Execute a function within a transaction
   * Automatically handles commit on success and rollback on error
   */
  transaction<T>(fn: () => T): T {
    const trx = this.db.transaction(fn);
    return trx();
  }

  /**
   * Begin a transaction manually (for advanced use cases)
   */
  beginTransaction(): void {
    this.db.exec('BEGIN TRANSACTION');
  }

  /**
   * Commit the current transaction
   */
  commit(): void {
    this.db.exec('COMMIT');
  }

  /**
   * Rollback the current transaction
   */
  rollback(): void {
    this.db.exec('ROLLBACK');
  }

  close(): void {
    this.db.close();
  }
}
