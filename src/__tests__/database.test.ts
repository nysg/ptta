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

  describe('Task CRUD', () => {
    beforeEach(() => {
      db.registerWorkspace(testWorkspacePath);
    });

    it('タスクを作成できる', () => {
      const task = db.createTask(
        testWorkspacePath,
        'Test Task',
        'Test Description',
        'high'
      );

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test Description');
      expect(task.priority).toBe('high');
      expect(task.status).toBe('active');
    });

    it('タスク一覧を取得できる', () => {
      db.createTask(testWorkspacePath, 'Task 1');
      db.createTask(testWorkspacePath, 'Task 2');

      const tasks = db.listTasks(testWorkspacePath);

      expect(tasks.length).toBe(2);
      // ORDER BY created_at DESC なので、後に作成された方が先
      expect(tasks.some(t => t.title === 'Task 1')).toBe(true);
      expect(tasks.some(t => t.title === 'Task 2')).toBe(true);
    });

    it('タスクをステータスでフィルタリングできる', () => {
      const task1 = db.createTask(testWorkspacePath, 'Active Task');
      db.createTask(testWorkspacePath, 'Another Active');

      db.updateTask(testWorkspacePath, task1.id, { status: 'completed' });

      const activeTasks = db.listTasks(testWorkspacePath, 'active');
      const completedTasks = db.listTasks(testWorkspacePath, 'completed');

      expect(activeTasks.length).toBe(1);
      expect(completedTasks.length).toBe(1);
    });

    it('タスクを更新できる', () => {
      const task = db.createTask(testWorkspacePath, 'Original Title');

      const updated = db.updateTask(testWorkspacePath, task.id, {
        title: 'Updated Title',
        description: 'New Description',
        priority: 'low',
      });

      expect(updated?.title).toBe('Updated Title');
      expect(updated?.description).toBe('New Description');
      expect(updated?.priority).toBe('low');
    });

    it('存在しないタスクの更新でnullを返す', () => {
      const result = db.updateTask(testWorkspacePath, 99999, {
        title: 'Should not update',
      });

      expect(result).toBeNull();
    });
  });

  describe('Todo CRUD', () => {
    let taskId: number;

    beforeEach(() => {
      db.registerWorkspace(testWorkspacePath);
      const task = db.createTask(testWorkspacePath, 'Test Task');
      taskId = task.id;
    });

    it('Todoを作成できる', () => {
      const todo = db.createTodo(
        testWorkspacePath,
        taskId,
        'Test Todo',
        'Todo Description',
        'medium'
      );

      expect(todo.id).toBeDefined();
      expect(todo.task_id).toBe(taskId);
      expect(todo.title).toBe('Test Todo');
      expect(todo.description).toBe('Todo Description');
      expect(todo.priority).toBe('medium');
      expect(todo.status).toBe('todo');
    });

    it('Todo一覧を取得できる', () => {
      db.createTodo(testWorkspacePath, taskId, 'Todo 1');
      db.createTodo(testWorkspacePath, taskId, 'Todo 2');

      const todos = db.listTodos(testWorkspacePath, taskId);

      expect(todos.length).toBe(2);
    });

    it('Todoをステータスでフィルタリングできる', () => {
      const todo1 = db.createTodo(testWorkspacePath, taskId, 'Todo 1');
      db.createTodo(testWorkspacePath, taskId, 'Todo 2');

      db.updateTodo(testWorkspacePath, todo1.id, { status: 'done' });

      const todoTodos = db.listTodos(testWorkspacePath, taskId, 'todo');
      const doneTodos = db.listTodos(testWorkspacePath, taskId, 'done');

      expect(todoTodos.length).toBe(1);
      expect(doneTodos.length).toBe(1);
    });

    it('Todoを更新できる', () => {
      const todo = db.createTodo(testWorkspacePath, taskId, 'Original Todo');

      const updated = db.updateTodo(testWorkspacePath, todo.id, {
        title: 'Updated Todo',
        status: 'in_progress',
      });

      expect(updated?.title).toBe('Updated Todo');
      expect(updated?.status).toBe('in_progress');
    });
  });

  describe('Action CRUD', () => {
    let taskId: number;
    let todoId: number;

    beforeEach(() => {
      db.registerWorkspace(testWorkspacePath);
      const task = db.createTask(testWorkspacePath, 'Test Task');
      taskId = task.id;
      const todo = db.createTodo(testWorkspacePath, taskId, 'Test Todo');
      todoId = todo.id;
    });

    it('Actionを作成できる', () => {
      const action = db.createAction(testWorkspacePath, todoId, 'Test Action');

      expect(action.id).toBeDefined();
      expect(action.todo_id).toBe(todoId);
      expect(action.title).toBe('Test Action');
      expect(action.status).toBe('todo');
    });

    it('Actionを完了にできる', () => {
      const action = db.createAction(testWorkspacePath, todoId, 'Action to complete');

      const completed = db.updateAction(testWorkspacePath, action.id, { status: 'done' });

      expect(completed?.status).toBe('done');
      expect(completed?.completed_at).toBeDefined();
    });

    it('Actionを更新できる', () => {
      const action = db.createAction(testWorkspacePath, todoId, 'Original Action');

      const updated = db.updateAction(testWorkspacePath, action.id, {
        title: 'Updated Action',
        status: 'done',
      });

      expect(updated?.title).toBe('Updated Action');
      expect(updated?.status).toBe('done');
    });
  });

  describe('Task Hierarchy', () => {
    it('タスク階層を取得できる', () => {
      db.registerWorkspace(testWorkspacePath);
      const task = db.createTask(testWorkspacePath, 'Task with Todos');
      const todo1 = db.createTodo(testWorkspacePath, task.id, 'Todo 1');
      const todo2 = db.createTodo(testWorkspacePath, task.id, 'Todo 2');

      db.createAction(testWorkspacePath, todo1.id, 'Action 1-1');
      db.createAction(testWorkspacePath, todo1.id, 'Action 1-2');

      const hierarchy = db.getTaskHierarchy(testWorkspacePath, task.id);

      expect(hierarchy).toBeDefined();
      expect(hierarchy?.title).toBe('Task with Todos');
      expect(hierarchy?.todos).toHaveLength(2);
      expect(hierarchy?.todos?.[0].actions).toHaveLength(2);
    });

    it('存在しないタスクでnullを返す', () => {
      db.registerWorkspace(testWorkspacePath);
      const hierarchy = db.getTaskHierarchy(testWorkspacePath, 99999);

      expect(hierarchy).toBeNull();
    });
  });

  describe('Stats', () => {
    it('統計情報を取得できる', () => {
      db.registerWorkspace(testWorkspacePath);
      const task1 = db.createTask(testWorkspacePath, 'Task 1');
      const task2 = db.createTask(testWorkspacePath, 'Task 2');

      const todo1 = db.createTodo(testWorkspacePath, task1.id, 'Todo 1');
      const todo2 = db.createTodo(testWorkspacePath, task1.id, 'Todo 2');

      db.createAction(testWorkspacePath, todo1.id, 'Action 1');
      db.createAction(testWorkspacePath, todo1.id, 'Action 2');

      db.updateTask(testWorkspacePath, task2.id, { status: 'completed' });
      db.updateTodo(testWorkspacePath, todo2.id, { status: 'done' });

      const stats = db.getStats(testWorkspacePath);

      expect(stats.tasks.total).toBe(2);
      expect(stats.tasks.active).toBe(1);
      expect(stats.tasks.completed).toBe(1);
      expect(stats.todos.total).toBe(2);
      expect(stats.todos.todo).toBe(1);
      expect(stats.todos.done).toBe(1);
      expect(stats.actions.total).toBe(2);
    });
  });

  describe('Transaction', () => {
    it('トランザクション内で複数の操作を実行できる', () => {
      db.registerWorkspace(testWorkspacePath);

      const result = db.transaction(() => {
        const task = db.createTask(testWorkspacePath, 'Transactional Task');
        const todo = db.createTodo(testWorkspacePath, task.id, 'Transactional Todo');
        return { task, todo };
      });

      expect(result.task.id).toBeDefined();
      expect(result.todo.id).toBeDefined();

      const tasks = db.listTasks(testWorkspacePath);
      expect(tasks.length).toBe(1);
    });

    it('トランザクション内でエラーが発生したらロールバックされる', () => {
      db.registerWorkspace(testWorkspacePath);

      expect(() => {
        db.transaction(() => {
          db.createTask(testWorkspacePath, 'Task 1');
          db.createTask(testWorkspacePath, 'Task 2');
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      // ロールバックされるのでタスクは作成されない
      const tasks = db.listTasks(testWorkspacePath);
      expect(tasks.length).toBe(0);
    });
  });

  describe('Summary', () => {
    it('タスクのサマリーを作成できる', () => {
      db.registerWorkspace(testWorkspacePath);
      const task = db.createTask(testWorkspacePath, 'Test Task');

      const summaryId = db.createSummary(
        testWorkspacePath,
        'task',
        task.id,
        'This is a summary of the task'
      );

      expect(summaryId).toBeDefined();

      const hierarchy = db.getTaskHierarchy(testWorkspacePath, task.id);
      expect(hierarchy?.summaries).toHaveLength(1);
      expect(hierarchy?.summaries?.[0].summary).toBe('This is a summary of the task');
    });

    it('Todoのサマリーを作成できる', () => {
      db.registerWorkspace(testWorkspacePath);
      const task = db.createTask(testWorkspacePath, 'Test Task');
      const todo = db.createTodo(testWorkspacePath, task.id, 'Test Todo');

      const summaryId = db.createSummary(
        testWorkspacePath,
        'todo',
        todo.id,
        'This is a summary of the todo'
      );

      expect(summaryId).toBeDefined();
    });
  });
});
