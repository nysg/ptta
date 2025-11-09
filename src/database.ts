import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';

export interface Workspace {
  id: number;
  path: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  status: string;
  metadata?: string;
  created_at: string;
  completed_at?: string;
}

export interface Summary {
  id: number;
  entity_type: string;
  entity_id: number;
  summary: string;
  metadata?: string;
  created_at: string;
}

export interface ProjectHierarchy extends Project {
  tasks?: (Task & { subtasks?: Subtask[] })[];
  summaries?: Summary[];
}

export interface Stats {
  projects: {
    total: number;
    active: number;
    completed: number;
  };
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
  };
  subtasks: {
    total: number;
    todo: number;
    done: number;
  };
}

export class PttaDatabase {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    const defaultPath = path.join(os.homedir(), '.ptta', 'ptta.db');
    this.dbPath = dbPath || defaultPath;

    // ディレクトリが存在しない場合は作成
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.initDatabase();
  }

  private initDatabase(): void {
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
    const absolutePath = path.resolve(workspacePath);
    const workspaceName = name || path.basename(absolutePath);

    // 既存のワークスペースを確認
    const existing = this.db
      .prepare('SELECT * FROM workspaces WHERE path = ?')
      .get(absolutePath) as Workspace | undefined;

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
      .get(info.lastInsertRowid) as Workspace;
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
  createProject(workspacePath: string, title: string, description?: string, priority: string = 'medium', metadata?: any): Project {
    const workspace = this.registerWorkspace(workspacePath);
    const suffix = this.getTableSuffix(workspace.path);

    const info = this.db
      .prepare(`INSERT INTO projects_${suffix} (title, description, priority, metadata) VALUES (?, ?, ?, ?)`)
      .run(title, description || null, priority, metadata ? JSON.stringify(metadata) : null);

    return this.getProject(workspacePath, Number(info.lastInsertRowid))!;
  }

  getProject(workspacePath: string, id: number): Project | null {
    const workspace = this.registerWorkspace(workspacePath);
    const suffix = this.getTableSuffix(workspace.path);

    const project = this.db
      .prepare(`SELECT * FROM projects_${suffix} WHERE id = ?`)
      .get(id) as Project | undefined;

    if (!project) return null;

    if (project.metadata) {
      project.metadata = JSON.parse(project.metadata as string);
    }

    return project;
  }

  listProjects(workspacePath: string, status?: string): Project[] {
    const workspace = this.registerWorkspace(workspacePath);
    const suffix = this.getTableSuffix(workspace.path);

    let query = `SELECT * FROM projects_${suffix}`;
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const projects = this.db.prepare(query).all(...params) as Project[];

    return projects.map(p => {
      if (p.metadata && typeof p.metadata === 'string') {
        p.metadata = JSON.parse(p.metadata);
      }
      return p;
    });
  }

  updateProject(workspacePath: string, id: number, updates: Partial<Project>): Project | null {
    const workspace = this.registerWorkspace(workspacePath);
    const suffix = this.getTableSuffix(workspace.path);

    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'metadata') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else if (key !== 'id' && key !== 'created_at') {
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
  createTask(workspacePath: string, projectId: number, title: string, description?: string, priority: string = 'medium', metadata?: any): Task {
    const workspace = this.registerWorkspace(workspacePath);
    const suffix = this.getTableSuffix(workspace.path);

    const info = this.db
      .prepare(`INSERT INTO tasks_${suffix} (project_id, title, description, priority, metadata) VALUES (?, ?, ?, ?, ?)`)
      .run(projectId, title, description || null, priority, metadata ? JSON.stringify(metadata) : null);

    return this.getTask(workspacePath, Number(info.lastInsertRowid))!;
  }

  getTask(workspacePath: string, id: number): Task | null {
    const workspace = this.registerWorkspace(workspacePath);
    const suffix = this.getTableSuffix(workspace.path);

    const task = this.db
      .prepare(`SELECT * FROM tasks_${suffix} WHERE id = ?`)
      .get(id) as Task | undefined;

    if (!task) return null;

    if (task.metadata && typeof task.metadata === 'string') {
      task.metadata = JSON.parse(task.metadata);
    }

    return task;
  }

  listTasks(workspacePath: string, projectId?: number, status?: string): Task[] {
    const workspace = this.registerWorkspace(workspacePath);
    const suffix = this.getTableSuffix(workspace.path);

    let query = `SELECT * FROM tasks_${suffix} WHERE 1=1`;
    const params: any[] = [];

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

    return tasks.map(t => {
      if (t.metadata && typeof t.metadata === 'string') {
        t.metadata = JSON.parse(t.metadata);
      }
      return t;
    });
  }

  updateTask(workspacePath: string, id: number, updates: Partial<Task>): Task | null {
    const workspace = this.registerWorkspace(workspacePath);
    const suffix = this.getTableSuffix(workspace.path);

    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'metadata') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else if (key !== 'id' && key !== 'created_at' && key !== 'project_id') {
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
  createSubtask(workspacePath: string, taskId: number, title: string, metadata?: any): Subtask {
    const workspace = this.registerWorkspace(workspacePath);
    const suffix = this.getTableSuffix(workspace.path);

    const info = this.db
      .prepare(`INSERT INTO subtasks_${suffix} (task_id, title, metadata) VALUES (?, ?, ?)`)
      .run(taskId, title, metadata ? JSON.stringify(metadata) : null);

    return this.getSubtask(workspacePath, Number(info.lastInsertRowid))!;
  }

  getSubtask(workspacePath: string, id: number): Subtask | null {
    const workspace = this.registerWorkspace(workspacePath);
    const suffix = this.getTableSuffix(workspace.path);

    const subtask = this.db
      .prepare(`SELECT * FROM subtasks_${suffix} WHERE id = ?`)
      .get(id) as Subtask | undefined;

    if (!subtask) return null;

    if (subtask.metadata && typeof subtask.metadata === 'string') {
      subtask.metadata = JSON.parse(subtask.metadata);
    }

    return subtask;
  }

  listSubtasks(workspacePath: string, taskId: number): Subtask[] {
    const workspace = this.registerWorkspace(workspacePath);
    const suffix = this.getTableSuffix(workspace.path);

    const subtasks = this.db
      .prepare(`SELECT * FROM subtasks_${suffix} WHERE task_id = ? ORDER BY created_at`)
      .all(taskId) as Subtask[];

    return subtasks.map(s => {
      if (s.metadata && typeof s.metadata === 'string') {
        s.metadata = JSON.parse(s.metadata);
      }
      return s;
    });
  }

  updateSubtask(workspacePath: string, id: number, updates: Partial<Subtask>): Subtask | null {
    const workspace = this.registerWorkspace(workspacePath);
    const suffix = this.getTableSuffix(workspace.path);

    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'metadata') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else if (key !== 'id' && key !== 'created_at' && key !== 'task_id') {
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
  createSummary(workspacePath: string, entityType: string, entityId: number, summary: string, metadata?: any): number {
    const workspace = this.registerWorkspace(workspacePath);
    const suffix = this.getTableSuffix(workspace.path);

    const info = this.db
      .prepare(`INSERT INTO summaries_${suffix} (entity_type, entity_id, summary, metadata) VALUES (?, ?, ?, ?)`)
      .run(entityType, entityId, summary, metadata ? JSON.stringify(metadata) : null);

    return Number(info.lastInsertRowid);
  }

  getSummaries(workspacePath: string, entityType: string, entityId: number): Summary[] {
    const workspace = this.registerWorkspace(workspacePath);
    const suffix = this.getTableSuffix(workspace.path);

    const summaries = this.db
      .prepare(`SELECT * FROM summaries_${suffix} WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC`)
      .all(entityType, entityId) as Summary[];

    return summaries.map(s => {
      if (s.metadata && typeof s.metadata === 'string') {
        s.metadata = JSON.parse(s.metadata);
      }
      return s;
    });
  }

  // 階層的な取得
  getProjectHierarchy(workspacePath: string, projectId: number): ProjectHierarchy | null {
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
  }

  // JSON形式でエクスポート
  exportAsJson(workspacePath: string, projectId?: number): any {
    if (projectId) {
      return this.getProjectHierarchy(workspacePath, projectId);
    }

    const projects = this.listProjects(workspacePath);
    return projects.map(p => this.getProjectHierarchy(workspacePath, p.id));
  }

  // 統計情報
  getStats(workspacePath: string): Stats {
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
  }

  // ワークスペース一覧
  listWorkspaces(): Workspace[] {
    return this.db.prepare('SELECT * FROM workspaces ORDER BY updated_at DESC').all() as Workspace[];
  }

  close(): void {
    this.db.close();
  }
}
