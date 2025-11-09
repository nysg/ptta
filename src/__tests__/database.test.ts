import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PttaDatabase } from '../database';
import { NotFoundError, ValidationError } from '../utils/errors';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('PttaDatabase', () => {
  let db: PttaDatabase;
  let testDbPath: string;
  let testWorkspacePath: string;

  beforeEach(() => {
    // テスト用の一時DBを作成
    testDbPath = path.join(os.tmpdir(), `ptta-test-${Date.now()}.db`);
    testWorkspacePath = path.join(os.tmpdir(), 'test-workspace');

    // テストワークスペースディレクトリを作成
    if (!fs.existsSync(testWorkspacePath)) {
      fs.mkdirSync(testWorkspacePath, { recursive: true });
    }

    db = new PttaDatabase(testDbPath);
  });

  afterEach(() => {
    // テスト後にDBファイルを削除
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('registerWorkspace', () => {
    it('新しいワークスペースを登録できる', () => {
      const workspace = db.registerWorkspace(testWorkspacePath);

      expect(workspace.id).toBeDefined();
      expect(workspace.path).toBe(testWorkspacePath);
      expect(workspace.name).toBeDefined();
    });

    it('同じパスのワークスペースは再登録されない', () => {
      const workspace1 = db.registerWorkspace(testWorkspacePath, 'Test Workspace');
      const workspace2 = db.registerWorkspace(testWorkspacePath, 'Different Name');

      expect(workspace1.id).toBe(workspace2.id);
      expect(workspace1.name).toBe(workspace2.name);
    });

    it('カスタム名でワークスペースを登録できる', () => {
      const workspace = db.registerWorkspace(testWorkspacePath, 'My Custom Workspace');

      expect(workspace.name).toBe('My Custom Workspace');
    });
  });

  describe('listWorkspaces', () => {
    it('登録されたワークスペース一覧を取得できる', () => {
      db.registerWorkspace(testWorkspacePath, 'Test 1');
      const workspacePath2 = path.join(os.tmpdir(), 'test-workspace-2');
      db.registerWorkspace(workspacePath2, 'Test 2');

      const workspaces = db.listWorkspaces();

      expect(workspaces.length).toBeGreaterThanOrEqual(2);
      expect(workspaces.some(w => w.name === 'Test 1')).toBe(true);
      expect(workspaces.some(w => w.name === 'Test 2')).toBe(true);
    });
  });

  describe('Project CRUD', () => {
    beforeEach(() => {
      db.registerWorkspace(testWorkspacePath);
    });

    it('プロジェクトを作成できる', () => {
      const project = db.createProject(
        testWorkspacePath,
        'Test Project',
        'Test Description',
        'high'
      );

      expect(project.id).toBeDefined();
      expect(project.title).toBe('Test Project');
      expect(project.description).toBe('Test Description');
      expect(project.priority).toBe('high');
      expect(project.status).toBe('active');
    });

    it('プロジェクト一覧を取得できる', () => {
      db.createProject(testWorkspacePath, 'Project 1');
      db.createProject(testWorkspacePath, 'Project 2');

      const projects = db.listProjects(testWorkspacePath);

      expect(projects.length).toBe(2);
      expect(projects[0].title).toBe('Project 1');
      expect(projects[1].title).toBe('Project 2');
    });

    it('プロジェクトをステータスでフィルタリングできる', () => {
      const project1 = db.createProject(testWorkspacePath, 'Active Project');
      db.createProject(testWorkspacePath, 'Another Active');

      db.updateProject(testWorkspacePath, project1.id, { status: 'completed' });

      const activeProjects = db.listProjects(testWorkspacePath, 'active');
      const completedProjects = db.listProjects(testWorkspacePath, 'completed');

      expect(activeProjects.length).toBe(1);
      expect(completedProjects.length).toBe(1);
    });

    it('プロジェクトを更新できる', () => {
      const project = db.createProject(testWorkspacePath, 'Original Title');

      const updated = db.updateProject(testWorkspacePath, project.id, {
        title: 'Updated Title',
        description: 'New Description',
        priority: 'low',
      });

      expect(updated?.title).toBe('Updated Title');
      expect(updated?.description).toBe('New Description');
      expect(updated?.priority).toBe('low');
    });

    it('存在しないプロジェクトの更新でnullを返す', () => {
      const result = db.updateProject(testWorkspacePath, 99999, {
        title: 'Should not update',
      });

      expect(result).toBeNull();
    });
  });

  describe('Task CRUD', () => {
    let projectId: number;

    beforeEach(() => {
      db.registerWorkspace(testWorkspacePath);
      const project = db.createProject(testWorkspacePath, 'Test Project');
      projectId = project.id;
    });

    it('タスクを作成できる', () => {
      const task = db.createTask(
        testWorkspacePath,
        projectId,
        'Test Task',
        'Task Description',
        'medium'
      );

      expect(task.id).toBeDefined();
      expect(task.project_id).toBe(projectId);
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Task Description');
      expect(task.priority).toBe('medium');
      expect(task.status).toBe('todo');
    });

    it('タスク一覧を取得できる', () => {
      db.createTask(testWorkspacePath, projectId, 'Task 1');
      db.createTask(testWorkspacePath, projectId, 'Task 2');

      const tasks = db.listTasks(testWorkspacePath, projectId);

      expect(tasks.length).toBe(2);
    });

    it('タスクをステータスでフィルタリングできる', () => {
      const task1 = db.createTask(testWorkspacePath, projectId, 'Task 1');
      db.createTask(testWorkspacePath, projectId, 'Task 2');

      db.updateTask(testWorkspacePath, task1.id, { status: 'done' });

      const todoTasks = db.listTasks(testWorkspacePath, projectId, 'todo');
      const doneTasks = db.listTasks(testWorkspacePath, projectId, 'done');

      expect(todoTasks.length).toBe(1);
      expect(doneTasks.length).toBe(1);
    });

    it('タスクを更新できる', () => {
      const task = db.createTask(testWorkspacePath, projectId, 'Original Task');

      const updated = db.updateTask(testWorkspacePath, task.id, {
        title: 'Updated Task',
        status: 'in_progress',
      });

      expect(updated?.title).toBe('Updated Task');
      expect(updated?.status).toBe('in_progress');
    });
  });

  describe('Subtask CRUD', () => {
    let projectId: number;
    let taskId: number;

    beforeEach(() => {
      db.registerWorkspace(testWorkspacePath);
      const project = db.createProject(testWorkspacePath, 'Test Project');
      projectId = project.id;
      const task = db.createTask(testWorkspacePath, projectId, 'Test Task');
      taskId = task.id;
    });

    it('サブタスクを作成できる', () => {
      const subtask = db.createSubtask(testWorkspacePath, taskId, 'Test Subtask');

      expect(subtask.id).toBeDefined();
      expect(subtask.task_id).toBe(taskId);
      expect(subtask.title).toBe('Test Subtask');
      expect(subtask.status).toBe('todo');
    });

    it('サブタスクを完了にできる', () => {
      const subtask = db.createSubtask(testWorkspacePath, taskId, 'Subtask to complete');

      const completed = db.updateSubtask(testWorkspacePath, subtask.id, { status: 'done' });

      expect(completed?.status).toBe('done');
      expect(completed?.completed_at).toBeDefined();
    });

    it('サブタスクを更新できる', () => {
      const subtask = db.createSubtask(testWorkspacePath, taskId, 'Original Subtask');

      const updated = db.updateSubtask(testWorkspacePath, subtask.id, {
        title: 'Updated Subtask',
        status: 'done',
      });

      expect(updated?.title).toBe('Updated Subtask');
      expect(updated?.status).toBe('done');
    });
  });

  describe('Project Hierarchy', () => {
    it('プロジェクト階層を取得できる', () => {
      db.registerWorkspace(testWorkspacePath);
      const project = db.createProject(testWorkspacePath, 'Project with Tasks');
      const task1 = db.createTask(testWorkspacePath, project.id, 'Task 1');
      const task2 = db.createTask(testWorkspacePath, project.id, 'Task 2');

      db.createSubtask(testWorkspacePath, task1.id, 'Subtask 1-1');
      db.createSubtask(testWorkspacePath, task1.id, 'Subtask 1-2');

      const hierarchy = db.getProjectHierarchy(testWorkspacePath, project.id);

      expect(hierarchy).toBeDefined();
      expect(hierarchy?.title).toBe('Project with Tasks');
      expect(hierarchy?.tasks).toHaveLength(2);
      expect(hierarchy?.tasks?.[0].subtasks).toHaveLength(2);
    });

    it('存在しないプロジェクトでnullを返す', () => {
      db.registerWorkspace(testWorkspacePath);
      const hierarchy = db.getProjectHierarchy(testWorkspacePath, 99999);

      expect(hierarchy).toBeNull();
    });
  });

  describe('Stats', () => {
    it('統計情報を取得できる', () => {
      db.registerWorkspace(testWorkspacePath);
      const project1 = db.createProject(testWorkspacePath, 'Project 1');
      const project2 = db.createProject(testWorkspacePath, 'Project 2');

      const task1 = db.createTask(testWorkspacePath, project1.id, 'Task 1');
      const task2 = db.createTask(testWorkspacePath, project1.id, 'Task 2');

      db.createSubtask(testWorkspacePath, task1.id, 'Subtask 1');
      db.createSubtask(testWorkspacePath, task1.id, 'Subtask 2');

      db.updateProject(testWorkspacePath, project2.id, { status: 'completed' });
      db.updateTask(testWorkspacePath, task2.id, { status: 'done' });

      const stats = db.getStats(testWorkspacePath);

      expect(stats.projects.total).toBe(2);
      expect(stats.projects.active).toBe(1);
      expect(stats.projects.completed).toBe(1);
      expect(stats.tasks.total).toBe(2);
      expect(stats.tasks.todo).toBe(1);
      expect(stats.tasks.done).toBe(1);
      expect(stats.subtasks.total).toBe(2);
    });
  });

  describe('Transaction', () => {
    it('トランザクション内で複数の操作を実行できる', () => {
      db.registerWorkspace(testWorkspacePath);

      const result = db.transaction(() => {
        const project = db.createProject(testWorkspacePath, 'Transactional Project');
        const task = db.createTask(testWorkspacePath, project.id, 'Transactional Task');
        return { project, task };
      });

      expect(result.project.id).toBeDefined();
      expect(result.task.id).toBeDefined();

      const projects = db.listProjects(testWorkspacePath);
      expect(projects.length).toBe(1);
    });

    it('トランザクション内でエラーが発生したらロールバックされる', () => {
      db.registerWorkspace(testWorkspacePath);

      expect(() => {
        db.transaction(() => {
          db.createProject(testWorkspacePath, 'Project 1');
          db.createProject(testWorkspacePath, 'Project 2');
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      // ロールバックされるのでプロジェクトは作成されない
      const projects = db.listProjects(testWorkspacePath);
      expect(projects.length).toBe(0);
    });
  });

  describe('Summary', () => {
    it('プロジェクトのサマリーを作成できる', () => {
      db.registerWorkspace(testWorkspacePath);
      const project = db.createProject(testWorkspacePath, 'Test Project');

      const summaryId = db.createSummary(
        testWorkspacePath,
        'project',
        project.id,
        'This is a summary of the project'
      );

      expect(summaryId).toBeDefined();

      const hierarchy = db.getProjectHierarchy(testWorkspacePath, project.id);
      expect(hierarchy?.summaries).toHaveLength(1);
      expect(hierarchy?.summaries?.[0].summary).toBe('This is a summary of the project');
    });

    it('タスクのサマリーを作成できる', () => {
      db.registerWorkspace(testWorkspacePath);
      const project = db.createProject(testWorkspacePath, 'Test Project');
      const task = db.createTask(testWorkspacePath, project.id, 'Test Task');

      const summaryId = db.createSummary(
        testWorkspacePath,
        'task',
        task.id,
        'This is a summary of the task'
      );

      expect(summaryId).toBeDefined();
    });
  });
});
