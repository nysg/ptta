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
  Project,
  Task,
  Subtask,
  Summary,
  ProjectHierarchy,
  Stats,
  ProjectCreateInput,
  TaskCreateInput,
  SubtaskCreateInput,
  ProjectUpdate,
  TaskUpdate,
  SubtaskUpdate
} from './types';

// Re-export types for backward compatibility
export type {
  Workspace,
  Metadata,
  Project,
  Task,
  Subtask,
  Summary,
  ProjectHierarchy,
  Stats,
  ProjectCreateInput,
  TaskCreateInput,
  SubtaskCreateInput,
  ProjectUpdate,
  TaskUpdate,
  SubtaskUpdate
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
    // Initialize schema version table for migrations
    initSchemaVersion(this);

    // Run any pending migrations
    migrate(this);

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
  createProject(workspacePath: string, title: string, description?: string, priority: string = 'medium', metadata?: Metadata): Project {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const info = this.db
        .prepare(`INSERT INTO projects_${suffix} (title, description, priority, metadata) VALUES (?, ?, ?, ?)`)
        .run(title, description || null, priority, stringifyMetadata(metadata));

      const project = this.getProject(workspacePath, Number(info.lastInsertRowid));
      if (!project) {
        throw new DatabaseError('Failed to retrieve created project');
      }
      this.logger.info({ projectId: project.id, title, workspaceId: workspace.id }, 'Created project');
      return project;
    } catch (error) {
      this.logger.error({ title, workspacePath, error }, 'Failed to create project');
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to create project', error);
    }
  }

  getProject(workspacePath: string, id: number): Project | null {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const project = this.db
        .prepare(`SELECT * FROM projects_${suffix} WHERE id = ?`)
        .get(id) as Project | undefined;

      if (!project) return null;

      return parseEntityMetadata(project);
    } catch (error) {
      throw new DatabaseError(`Failed to get project with ID ${id}`, error);
    }
  }

  listProjects(workspacePath: string, status?: string): Project[] {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      let query = `SELECT * FROM projects_${suffix}`;
      const params: (string | number)[] = [];

      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const projects = this.db.prepare(query).all(...params) as Project[];

      return projects.map(p => parseEntityMetadata(p));
    } catch (error) {
      throw new DatabaseError('Failed to list projects', error);
    }
  }

  updateProject(workspacePath: string, id: number, updates: ProjectUpdate): Project | null {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const { fields, values } = buildUpdateQuery(updates, ['id', 'created_at'], false);
      values.push(id);

      this.db.prepare(`UPDATE projects_${suffix} SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      return this.getProject(workspacePath, id);
    } catch (error) {
      throw new DatabaseError(`Failed to update project with ID ${id}`, error);
    }
  }

  // タスク操作
  createTask(workspacePath: string, projectId: number, title: string, description?: string, priority: string = 'medium', metadata?: Metadata): Task {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const info = this.db
        .prepare(`INSERT INTO tasks_${suffix} (project_id, title, description, priority, metadata) VALUES (?, ?, ?, ?, ?)`)
        .run(projectId, title, description || null, priority, stringifyMetadata(metadata));

      const task = this.getTask(workspacePath, Number(info.lastInsertRowid));
      if (!task) {
        throw new DatabaseError('Failed to retrieve created task');
      }
      return task;
    } catch (error) {
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

  listTasks(workspacePath: string, projectId?: number, status?: string): Task[] {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      let query = `SELECT * FROM tasks_${suffix} WHERE 1=1`;
      const params: (string | number)[] = [];

      if (projectId) {
        query += ' AND project_id = ?';
        params.push(projectId);
      }

      if (status) {
        query += ' AND status = ?';
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

      const { fields, values } = buildUpdateQuery(updates, ['id', 'created_at', 'project_id'], true);
      values.push(id);

      this.db.prepare(`UPDATE tasks_${suffix} SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      return this.getTask(workspacePath, id);
    } catch (error) {
      throw new DatabaseError(`Failed to update task with ID ${id}`, error);
    }
  }

  // サブタスク操作
  createSubtask(workspacePath: string, taskId: number, title: string, metadata?: Metadata): Subtask {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const info = this.db
        .prepare(`INSERT INTO subtasks_${suffix} (task_id, title, metadata) VALUES (?, ?, ?)`)
        .run(taskId, title, stringifyMetadata(metadata));

      const subtask = this.getSubtask(workspacePath, Number(info.lastInsertRowid));
      if (!subtask) {
        throw new DatabaseError('Failed to retrieve created subtask');
      }
      return subtask;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to create subtask', error);
    }
  }

  getSubtask(workspacePath: string, id: number): Subtask | null {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const subtask = this.db
        .prepare(`SELECT * FROM subtasks_${suffix} WHERE id = ?`)
        .get(id) as Subtask | undefined;

      if (!subtask) return null;

      return parseEntityMetadata(subtask);
    } catch (error) {
      throw new DatabaseError(`Failed to get subtask with ID ${id}`, error);
    }
  }

  listSubtasks(workspacePath: string, taskId: number): Subtask[] {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const subtasks = this.db
        .prepare(`SELECT * FROM subtasks_${suffix} WHERE task_id = ? ORDER BY created_at`)
        .all(taskId) as Subtask[];

      return subtasks.map(s => parseEntityMetadata(s));
    } catch (error) {
      throw new DatabaseError(`Failed to list subtasks for task ${taskId}`, error);
    }
  }

  updateSubtask(workspacePath: string, id: number, updates: SubtaskUpdate): Subtask | null {
    try {
      const workspace = this.registerWorkspace(workspacePath);
      const suffix = this.getTableSuffix(workspace.path);

      const { fields, values } = buildUpdateQuery(updates, ['id', 'created_at', 'task_id'], true);
      values.push(id);

      this.db.prepare(`UPDATE subtasks_${suffix} SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      return this.getSubtask(workspacePath, id);
    } catch (error) {
      throw new DatabaseError(`Failed to update subtask with ID ${id}`, error);
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
  getProjectHierarchy(workspacePath: string, projectId: number): ProjectHierarchy | null {
    try {
      const project = this.getProject(workspacePath, projectId);
      if (!project) return null;

      const tasks = this.listTasks(workspacePath, projectId);

      const hierarchy: ProjectHierarchy = {
        ...project,
        tasks: tasks.map(task => ({
          ...task,
          subtasks: this.listSubtasks(workspacePath, task.id)
        })),
        summaries: this.getSummaries(workspacePath, 'project', projectId)
      };

      return hierarchy;
    } catch (error) {
      throw new DatabaseError(`Failed to get project hierarchy for project ${projectId}`, error);
    }
  }

  // JSON形式でエクスポート
  exportAsJson(workspacePath: string, projectId?: number): ProjectHierarchy | null | (ProjectHierarchy | null)[] {
    try {
      if (projectId) {
        return this.getProjectHierarchy(workspacePath, projectId);
      }

      const projects = this.listProjects(workspacePath);
      return projects.map(p => this.getProjectHierarchy(workspacePath, p.id));
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
