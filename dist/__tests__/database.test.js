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
const vitest_1 = require("vitest");
const database_1 = require("../database");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
(0, vitest_1.describe)('PttaDatabase', () => {
    let db;
    let testDbPath;
    let testWorkspacePath;
    (0, vitest_1.beforeEach)(() => {
        // テスト用の一時DBを作成
        testDbPath = path.join(os.tmpdir(), `ptta-test-${Date.now()}.db`);
        testWorkspacePath = path.join(os.tmpdir(), 'test-workspace');
        // テストワークスペースディレクトリを作成
        if (!fs.existsSync(testWorkspacePath)) {
            fs.mkdirSync(testWorkspacePath, { recursive: true });
        }
        db = new database_1.PttaDatabase(testDbPath);
    });
    (0, vitest_1.afterEach)(() => {
        // テスト後にDBファイルを削除
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });
    (0, vitest_1.describe)('registerWorkspace', () => {
        (0, vitest_1.it)('新しいワークスペースを登録できる', () => {
            const workspace = db.registerWorkspace(testWorkspacePath);
            (0, vitest_1.expect)(workspace.id).toBeDefined();
            (0, vitest_1.expect)(workspace.path).toBe(testWorkspacePath);
            (0, vitest_1.expect)(workspace.name).toBeDefined();
        });
        (0, vitest_1.it)('同じパスのワークスペースは再登録されない', () => {
            const workspace1 = db.registerWorkspace(testWorkspacePath, 'Test Workspace');
            const workspace2 = db.registerWorkspace(testWorkspacePath, 'Different Name');
            (0, vitest_1.expect)(workspace1.id).toBe(workspace2.id);
            (0, vitest_1.expect)(workspace1.name).toBe(workspace2.name);
        });
        (0, vitest_1.it)('カスタム名でワークスペースを登録できる', () => {
            const workspace = db.registerWorkspace(testWorkspacePath, 'My Custom Workspace');
            (0, vitest_1.expect)(workspace.name).toBe('My Custom Workspace');
        });
    });
    (0, vitest_1.describe)('listWorkspaces', () => {
        (0, vitest_1.it)('登録されたワークスペース一覧を取得できる', () => {
            db.registerWorkspace(testWorkspacePath, 'Test 1');
            const workspacePath2 = path.join(os.tmpdir(), 'test-workspace-2');
            db.registerWorkspace(workspacePath2, 'Test 2');
            const workspaces = db.listWorkspaces();
            (0, vitest_1.expect)(workspaces.length).toBeGreaterThanOrEqual(2);
            (0, vitest_1.expect)(workspaces.some(w => w.name === 'Test 1')).toBe(true);
            (0, vitest_1.expect)(workspaces.some(w => w.name === 'Test 2')).toBe(true);
        });
    });
    (0, vitest_1.describe)('Project CRUD', () => {
        (0, vitest_1.beforeEach)(() => {
            db.registerWorkspace(testWorkspacePath);
        });
        (0, vitest_1.it)('プロジェクトを作成できる', () => {
            const project = db.createProject(testWorkspacePath, 'Test Project', 'Test Description', 'high');
            (0, vitest_1.expect)(project.id).toBeDefined();
            (0, vitest_1.expect)(project.title).toBe('Test Project');
            (0, vitest_1.expect)(project.description).toBe('Test Description');
            (0, vitest_1.expect)(project.priority).toBe('high');
            (0, vitest_1.expect)(project.status).toBe('active');
        });
        (0, vitest_1.it)('プロジェクト一覧を取得できる', () => {
            db.createProject(testWorkspacePath, 'Project 1');
            db.createProject(testWorkspacePath, 'Project 2');
            const projects = db.listProjects(testWorkspacePath);
            (0, vitest_1.expect)(projects.length).toBe(2);
            (0, vitest_1.expect)(projects[0].title).toBe('Project 1');
            (0, vitest_1.expect)(projects[1].title).toBe('Project 2');
        });
        (0, vitest_1.it)('プロジェクトをステータスでフィルタリングできる', () => {
            const project1 = db.createProject(testWorkspacePath, 'Active Project');
            db.createProject(testWorkspacePath, 'Another Active');
            db.updateProject(testWorkspacePath, project1.id, { status: 'completed' });
            const activeProjects = db.listProjects(testWorkspacePath, 'active');
            const completedProjects = db.listProjects(testWorkspacePath, 'completed');
            (0, vitest_1.expect)(activeProjects.length).toBe(1);
            (0, vitest_1.expect)(completedProjects.length).toBe(1);
        });
        (0, vitest_1.it)('プロジェクトを更新できる', () => {
            const project = db.createProject(testWorkspacePath, 'Original Title');
            const updated = db.updateProject(testWorkspacePath, project.id, {
                title: 'Updated Title',
                description: 'New Description',
                priority: 'low',
            });
            (0, vitest_1.expect)(updated?.title).toBe('Updated Title');
            (0, vitest_1.expect)(updated?.description).toBe('New Description');
            (0, vitest_1.expect)(updated?.priority).toBe('low');
        });
        (0, vitest_1.it)('存在しないプロジェクトの更新でnullを返す', () => {
            const result = db.updateProject(testWorkspacePath, 99999, {
                title: 'Should not update',
            });
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
    (0, vitest_1.describe)('Task CRUD', () => {
        let projectId;
        (0, vitest_1.beforeEach)(() => {
            db.registerWorkspace(testWorkspacePath);
            const project = db.createProject(testWorkspacePath, 'Test Project');
            projectId = project.id;
        });
        (0, vitest_1.it)('タスクを作成できる', () => {
            const task = db.createTask(testWorkspacePath, projectId, 'Test Task', 'Task Description', 'medium');
            (0, vitest_1.expect)(task.id).toBeDefined();
            (0, vitest_1.expect)(task.project_id).toBe(projectId);
            (0, vitest_1.expect)(task.title).toBe('Test Task');
            (0, vitest_1.expect)(task.description).toBe('Task Description');
            (0, vitest_1.expect)(task.priority).toBe('medium');
            (0, vitest_1.expect)(task.status).toBe('todo');
        });
        (0, vitest_1.it)('タスク一覧を取得できる', () => {
            db.createTask(testWorkspacePath, projectId, 'Task 1');
            db.createTask(testWorkspacePath, projectId, 'Task 2');
            const tasks = db.listTasks(testWorkspacePath, projectId);
            (0, vitest_1.expect)(tasks.length).toBe(2);
        });
        (0, vitest_1.it)('タスクをステータスでフィルタリングできる', () => {
            const task1 = db.createTask(testWorkspacePath, projectId, 'Task 1');
            db.createTask(testWorkspacePath, projectId, 'Task 2');
            db.updateTask(testWorkspacePath, task1.id, { status: 'done' });
            const todoTasks = db.listTasks(testWorkspacePath, projectId, 'todo');
            const doneTasks = db.listTasks(testWorkspacePath, projectId, 'done');
            (0, vitest_1.expect)(todoTasks.length).toBe(1);
            (0, vitest_1.expect)(doneTasks.length).toBe(1);
        });
        (0, vitest_1.it)('タスクを更新できる', () => {
            const task = db.createTask(testWorkspacePath, projectId, 'Original Task');
            const updated = db.updateTask(testWorkspacePath, task.id, {
                title: 'Updated Task',
                status: 'in_progress',
            });
            (0, vitest_1.expect)(updated?.title).toBe('Updated Task');
            (0, vitest_1.expect)(updated?.status).toBe('in_progress');
        });
    });
    (0, vitest_1.describe)('Subtask CRUD', () => {
        let projectId;
        let taskId;
        (0, vitest_1.beforeEach)(() => {
            db.registerWorkspace(testWorkspacePath);
            const project = db.createProject(testWorkspacePath, 'Test Project');
            projectId = project.id;
            const task = db.createTask(testWorkspacePath, projectId, 'Test Task');
            taskId = task.id;
        });
        (0, vitest_1.it)('サブタスクを作成できる', () => {
            const subtask = db.createSubtask(testWorkspacePath, taskId, 'Test Subtask');
            (0, vitest_1.expect)(subtask.id).toBeDefined();
            (0, vitest_1.expect)(subtask.task_id).toBe(taskId);
            (0, vitest_1.expect)(subtask.title).toBe('Test Subtask');
            (0, vitest_1.expect)(subtask.status).toBe('todo');
        });
        (0, vitest_1.it)('サブタスクを完了にできる', () => {
            const subtask = db.createSubtask(testWorkspacePath, taskId, 'Subtask to complete');
            const completed = db.updateSubtask(testWorkspacePath, subtask.id, { status: 'done' });
            (0, vitest_1.expect)(completed?.status).toBe('done');
            (0, vitest_1.expect)(completed?.completed_at).toBeDefined();
        });
        (0, vitest_1.it)('サブタスクを更新できる', () => {
            const subtask = db.createSubtask(testWorkspacePath, taskId, 'Original Subtask');
            const updated = db.updateSubtask(testWorkspacePath, subtask.id, {
                title: 'Updated Subtask',
                status: 'done',
            });
            (0, vitest_1.expect)(updated?.title).toBe('Updated Subtask');
            (0, vitest_1.expect)(updated?.status).toBe('done');
        });
    });
    (0, vitest_1.describe)('Project Hierarchy', () => {
        (0, vitest_1.it)('プロジェクト階層を取得できる', () => {
            db.registerWorkspace(testWorkspacePath);
            const project = db.createProject(testWorkspacePath, 'Project with Tasks');
            const task1 = db.createTask(testWorkspacePath, project.id, 'Task 1');
            const task2 = db.createTask(testWorkspacePath, project.id, 'Task 2');
            db.createSubtask(testWorkspacePath, task1.id, 'Subtask 1-1');
            db.createSubtask(testWorkspacePath, task1.id, 'Subtask 1-2');
            const hierarchy = db.getProjectHierarchy(testWorkspacePath, project.id);
            (0, vitest_1.expect)(hierarchy).toBeDefined();
            (0, vitest_1.expect)(hierarchy?.title).toBe('Project with Tasks');
            (0, vitest_1.expect)(hierarchy?.tasks).toHaveLength(2);
            (0, vitest_1.expect)(hierarchy?.tasks?.[0].subtasks).toHaveLength(2);
        });
        (0, vitest_1.it)('存在しないプロジェクトでnullを返す', () => {
            db.registerWorkspace(testWorkspacePath);
            const hierarchy = db.getProjectHierarchy(testWorkspacePath, 99999);
            (0, vitest_1.expect)(hierarchy).toBeNull();
        });
    });
    (0, vitest_1.describe)('Stats', () => {
        (0, vitest_1.it)('統計情報を取得できる', () => {
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
            (0, vitest_1.expect)(stats.projects.total).toBe(2);
            (0, vitest_1.expect)(stats.projects.active).toBe(1);
            (0, vitest_1.expect)(stats.projects.completed).toBe(1);
            (0, vitest_1.expect)(stats.tasks.total).toBe(2);
            (0, vitest_1.expect)(stats.tasks.todo).toBe(1);
            (0, vitest_1.expect)(stats.tasks.done).toBe(1);
            (0, vitest_1.expect)(stats.subtasks.total).toBe(2);
        });
    });
    (0, vitest_1.describe)('Transaction', () => {
        (0, vitest_1.it)('トランザクション内で複数の操作を実行できる', () => {
            db.registerWorkspace(testWorkspacePath);
            const result = db.transaction(() => {
                const project = db.createProject(testWorkspacePath, 'Transactional Project');
                const task = db.createTask(testWorkspacePath, project.id, 'Transactional Task');
                return { project, task };
            });
            (0, vitest_1.expect)(result.project.id).toBeDefined();
            (0, vitest_1.expect)(result.task.id).toBeDefined();
            const projects = db.listProjects(testWorkspacePath);
            (0, vitest_1.expect)(projects.length).toBe(1);
        });
        (0, vitest_1.it)('トランザクション内でエラーが発生したらロールバックされる', () => {
            db.registerWorkspace(testWorkspacePath);
            (0, vitest_1.expect)(() => {
                db.transaction(() => {
                    db.createProject(testWorkspacePath, 'Project 1');
                    db.createProject(testWorkspacePath, 'Project 2');
                    throw new Error('Test error');
                });
            }).toThrow('Test error');
            // ロールバックされるのでプロジェクトは作成されない
            const projects = db.listProjects(testWorkspacePath);
            (0, vitest_1.expect)(projects.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('Summary', () => {
        (0, vitest_1.it)('プロジェクトのサマリーを作成できる', () => {
            db.registerWorkspace(testWorkspacePath);
            const project = db.createProject(testWorkspacePath, 'Test Project');
            const summaryId = db.createSummary(testWorkspacePath, 'project', project.id, 'This is a summary of the project');
            (0, vitest_1.expect)(summaryId).toBeDefined();
            const hierarchy = db.getProjectHierarchy(testWorkspacePath, project.id);
            (0, vitest_1.expect)(hierarchy?.summaries).toHaveLength(1);
            (0, vitest_1.expect)(hierarchy?.summaries?.[0].summary).toBe('This is a summary of the project');
        });
        (0, vitest_1.it)('タスクのサマリーを作成できる', () => {
            db.registerWorkspace(testWorkspacePath);
            const project = db.createProject(testWorkspacePath, 'Test Project');
            const task = db.createTask(testWorkspacePath, project.id, 'Test Task');
            const summaryId = db.createSummary(testWorkspacePath, 'task', task.id, 'This is a summary of the task');
            (0, vitest_1.expect)(summaryId).toBeDefined();
        });
    });
});
//# sourceMappingURL=database.test.js.map