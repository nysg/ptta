#!/usr/bin/env node
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
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const database_1 = require("./database");
const errors_1 = require("./utils/errors");
const validation_1 = require("./utils/validation");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// package.jsonからバージョンを読み込む
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
const program = new commander_1.Command();
program
    .name('ptta')
    .description('AI-first Task Management CLI - External memory storage for Claude Code')
    .version(packageJson.version);
// データベースインスタンスを作成して処理を実行するヘルパー
function withDb(fn) {
    return async (...args) => {
        const options = args[args.length - 1];
        const workspacePath = options.path || process.cwd();
        const db = new database_1.PttaDatabase();
        try {
            await fn(db, workspacePath, ...args);
        }
        catch (error) {
            // エラーメッセージを表示
            if (error instanceof errors_1.PttaError) {
                console.error(chalk_1.default.red(`\n❌ Error: ${error.message}`));
                if (error.code) {
                    console.error(chalk_1.default.gray(`Code: ${error.code}`));
                }
            }
            else {
                console.error(chalk_1.default.red(`\n❌ Error: ${(0, errors_1.getErrorMessage)(error)}`));
            }
            process.exit(1);
        }
        finally {
            db.close();
        }
    };
}
// グローバルオプション
program.option('-p, --path <path>', 'Workspace path (default: current directory)');
// Task作成
program
    .command('task:add')
    .description('Create a new task')
    .argument('<title>', 'Task title')
    .option('-d, --description <desc>', 'Task description')
    .option('-P, --priority <priority>', 'Priority (low/medium/high)', 'medium')
    .action(withDb(async (db, workspacePath, title, options) => {
    const task = db.createTask(workspacePath, title, options.description, options.priority);
    console.log(chalk_1.default.green('✓ Task created:'));
    console.log(JSON.stringify(task, null, 2));
}));
// Task一覧
program
    .command('task:list')
    .description('List all tasks')
    .option('-s, --status <status>', 'Filter by status')
    .option('-j, --json', 'Output as JSON')
    .action(withDb(async (db, workspacePath, options) => {
    const tasks = db.listTasks(workspacePath, options.status);
    if (options.json) {
        console.log(JSON.stringify(tasks, null, 2));
        return;
    }
    if (tasks.length === 0) {
        console.log(chalk_1.default.yellow('No tasks found'));
        return;
    }
    tasks.forEach(t => {
        const statusColor = t.status === 'completed' ? chalk_1.default.green : chalk_1.default.blue;
        console.log(`\n${chalk_1.default.bold(`#${t.id}`)} ${chalk_1.default.cyan(t.title)}`);
        console.log(`  Status: ${statusColor(t.status)}`);
        console.log(`  Priority: ${t.priority}`);
        if (t.description)
            console.log(`  ${chalk_1.default.gray(t.description)}`);
        console.log(`  Created: ${chalk_1.default.gray(t.created_at)}`);
    });
}));
// Task詳細
program
    .command('task:show')
    .description('Show task with all todos and actions')
    .argument('<id>', 'Task ID')
    .option('-j, --json', 'Output as JSON')
    .action(withDb(async (db, workspacePath, id, options) => {
    const hierarchy = db.getTaskHierarchy(workspacePath, (0, validation_1.parseIntSafe)(id, 'task ID'));
    if (!hierarchy) {
        console.log(chalk_1.default.red('Task not found'));
        return;
    }
    if (options.json) {
        console.log(JSON.stringify(hierarchy, null, 2));
        return;
    }
    console.log(chalk_1.default.bold.cyan(`\n${hierarchy.title}`));
    console.log(chalk_1.default.gray(hierarchy.description || ''));
    console.log(`Status: ${hierarchy.status} | Priority: ${hierarchy.priority}\n`);
    if (hierarchy.todos && hierarchy.todos.length > 0) {
        hierarchy.todos.forEach(todo => {
            const todoStatus = todo.status === 'done' ? '✓' : '○';
            console.log(`  ${todoStatus} [${todo.id}] ${todo.title} (${todo.status})`);
            if (todo.actions && todo.actions.length > 0) {
                todo.actions.forEach(action => {
                    const actionStatus = action.status === 'done' ? '✓' : '○';
                    console.log(`    ${actionStatus} [${action.id}] ${action.title}`);
                });
            }
        });
    }
    if (hierarchy.summaries && hierarchy.summaries.length > 0) {
        console.log(chalk_1.default.yellow('\nSummaries:'));
        hierarchy.summaries.forEach(s => {
            console.log(`  ${chalk_1.default.gray(s.created_at)}: ${s.summary}`);
        });
    }
}));
// Task更新
program
    .command('task:update')
    .description('Update task')
    .argument('<id>', 'Task ID')
    .option('-s, --status <status>', 'New status (active/completed/archived)')
    .option('-t, --title <title>', 'New title')
    .option('-d, --description <desc>', 'New description')
    .option('-P, --priority <priority>', 'New priority')
    .action(withDb(async (db, workspacePath, id, options) => {
    const updates = {};
    if (options.status)
        updates.status = options.status;
    if (options.title)
        updates.title = options.title;
    if (options.description)
        updates.description = options.description;
    if (options.priority)
        updates.priority = options.priority;
    const task = db.updateTask(workspacePath, (0, validation_1.parseIntSafe)(id, 'task ID'), updates);
    console.log(chalk_1.default.green('✓ Task updated:'));
    console.log(JSON.stringify(task, null, 2));
}));
// Todo作成
program
    .command('todo:add')
    .description('Create a new todo')
    .argument('<taskId>', 'Task ID')
    .argument('<title>', 'Todo title')
    .option('-d, --description <desc>', 'Todo description')
    .option('-P, --priority <priority>', 'Priority (low/medium/high)', 'medium')
    .action(withDb(async (db, workspacePath, taskId, title, options) => {
    const todo = db.createTodo(workspacePath, (0, validation_1.parseIntSafe)(taskId, 'task ID'), title, options.description, options.priority);
    console.log(chalk_1.default.green('✓ Todo created:'));
    console.log(JSON.stringify(todo, null, 2));
}));
// Todo一覧
program
    .command('todo:list')
    .description('List todos')
    .option('-T, --task <id>', 'Filter by task ID')
    .option('-s, --status <status>', 'Filter by status')
    .option('-j, --json', 'Output as JSON')
    .action(withDb(async (db, workspacePath, options) => {
    const taskId = options.task ? (0, validation_1.parseIntSafe)(options.task, 'task ID') : undefined;
    const todos = db.listTodos(workspacePath, taskId, options.status);
    if (options.json) {
        console.log(JSON.stringify(todos, null, 2));
        return;
    }
    if (todos.length === 0) {
        console.log(chalk_1.default.yellow('No todos found'));
        return;
    }
    todos.forEach(t => {
        const statusIcon = t.status === 'done' ? '✓' : t.status === 'in_progress' ? '◐' : '○';
        console.log(`${statusIcon} [${t.id}] ${t.title}`);
        console.log(`  Task: #${t.task_id} | Status: ${t.status} | Priority: ${t.priority}`);
        if (t.description)
            console.log(`  ${chalk_1.default.gray(t.description)}`);
    });
}));
// Todo更新
program
    .command('todo:update')
    .description('Update todo status or details')
    .argument('<id>', 'Todo ID')
    .option('-s, --status <status>', 'New status (todo/in_progress/done)')
    .option('-t, --title <title>', 'New title')
    .option('-d, --description <desc>', 'New description')
    .option('-P, --priority <priority>', 'New priority')
    .action(withDb(async (db, workspacePath, id, options) => {
    const updates = {};
    if (options.status)
        updates.status = options.status;
    if (options.title)
        updates.title = options.title;
    if (options.description)
        updates.description = options.description;
    if (options.priority)
        updates.priority = options.priority;
    const todo = db.updateTodo(workspacePath, (0, validation_1.parseIntSafe)(id, 'todo ID'), updates);
    console.log(chalk_1.default.green('✓ Todo updated:'));
    console.log(JSON.stringify(todo, null, 2));
}));
// Action作成
program
    .command('action:add')
    .description('Create a new action')
    .argument('<todoId>', 'Todo ID')
    .argument('<title>', 'Action title')
    .action(withDb(async (db, workspacePath, todoId, title) => {
    const action = db.createAction(workspacePath, (0, validation_1.parseIntSafe)(todoId, 'todo ID'), title);
    console.log(chalk_1.default.green('✓ Action created:'));
    console.log(JSON.stringify(action, null, 2));
}));
// Action完了
program
    .command('action:done')
    .description('Mark action as done')
    .argument('<id>', 'Action ID')
    .action(withDb(async (db, workspacePath, id) => {
    const action = db.updateAction(workspacePath, (0, validation_1.parseIntSafe)(id, 'action ID'), { status: 'done' });
    console.log(chalk_1.default.green('✓ Action completed:'));
    console.log(JSON.stringify(action, null, 2));
}));
// Action更新
program
    .command('action:update')
    .description('Update action')
    .argument('<id>', 'Action ID')
    .option('-s, --status <status>', 'New status (todo/done)')
    .option('-t, --title <title>', 'New title')
    .action(withDb(async (db, workspacePath, id, options) => {
    const updates = {};
    if (options.status)
        updates.status = options.status;
    if (options.title)
        updates.title = options.title;
    const action = db.updateAction(workspacePath, (0, validation_1.parseIntSafe)(id, 'action ID'), updates);
    console.log(chalk_1.default.green('✓ Action updated:'));
    console.log(JSON.stringify(action, null, 2));
}));
// サマリー追加
program
    .command('summary:add')
    .description('Add a summary for a task, todo or action')
    .argument('<type>', 'Entity type (task/todo/action)')
    .argument('<id>', 'Entity ID')
    .argument('<summary>', 'Summary text')
    .action(withDb(async (db, workspacePath, type, id, summary) => {
    const summaryId = db.createSummary(workspacePath, type, (0, validation_1.parseIntSafe)(id, 'entity ID'), summary);
    console.log(chalk_1.default.green(`✓ Summary added (ID: ${summaryId})`));
}));
// エクスポート
program
    .command('export')
    .description('Export all data or specific task as JSON')
    .option('-T, --task <id>', 'Export specific task')
    .option('-o, --output <file>', 'Output file path')
    .action(withDb(async (db, workspacePath, options) => {
    const taskId = options.task ? (0, validation_1.parseIntSafe)(options.task, 'task ID') : undefined;
    const data = db.exportAsJson(workspacePath, taskId);
    const jsonData = JSON.stringify(data, null, 2);
    if (options.output) {
        fs.writeFileSync(options.output, jsonData);
        console.log(chalk_1.default.green(`✓ Exported to ${options.output}`));
    }
    else {
        console.log(jsonData);
    }
}));
// 統計情報
program
    .command('stats')
    .description('Show statistics')
    .option('-j, --json', 'Output as JSON')
    .action(withDb(async (db, workspacePath, options) => {
    const stats = db.getStats(workspacePath);
    if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
        return;
    }
    console.log(chalk_1.default.bold('\n📊 Statistics\n'));
    console.log(chalk_1.default.cyan('Tasks:'));
    console.log(`  Total: ${stats.tasks.total}`);
    console.log(`  Active: ${chalk_1.default.blue(stats.tasks.active)}`);
    console.log(`  Completed: ${chalk_1.default.green(stats.tasks.completed)}\n`);
    console.log(chalk_1.default.cyan('Todos:'));
    console.log(`  Total: ${stats.todos.total}`);
    console.log(`  Todo: ${chalk_1.default.yellow(stats.todos.todo)}`);
    console.log(`  In Progress: ${chalk_1.default.blue(stats.todos.inProgress)}`);
    console.log(`  Done: ${chalk_1.default.green(stats.todos.done)}\n`);
    console.log(chalk_1.default.cyan('Actions:'));
    console.log(`  Total: ${stats.actions.total}`);
    console.log(`  Todo: ${chalk_1.default.yellow(stats.actions.todo)}`);
    console.log(`  Done: ${chalk_1.default.green(stats.actions.done)}`);
}));
// AI用の簡易クエリコマンド
program
    .command('query')
    .description('Query data in JSON format (AI-friendly)')
    .argument('<type>', 'Query type (tasks/todos/hierarchy/all/stats/workspaces)')
    .option('-i, --id <id>', 'Specific ID')
    .option('-s, --status <status>', 'Filter by status')
    .action(withDb(async (db, workspacePath, type, options) => {
    let result;
    switch (type) {
        case 'tasks':
            result = db.listTasks(workspacePath, options.status);
            break;
        case 'todos':
            result = db.listTodos(workspacePath, options.id ? (0, validation_1.parseIntSafe)(options.id, 'ID') : undefined, options.status);
            break;
        case 'hierarchy':
            if (!options.id) {
                console.error('Error: --id required for hierarchy query');
                process.exit(1);
            }
            result = db.getTaskHierarchy(workspacePath, (0, validation_1.parseIntSafe)(options.id, 'task ID'));
            break;
        case 'all':
            result = db.exportAsJson(workspacePath);
            break;
        case 'stats':
            result = db.getStats(workspacePath);
            break;
        case 'workspaces':
            result = db.listWorkspaces();
            break;
        default:
            console.error(`Unknown query type: ${type}`);
            process.exit(1);
    }
    console.log(JSON.stringify(result, null, 2));
}));
// ワークスペース一覧
program
    .command('workspace:list')
    .description('List all workspaces')
    .option('-j, --json', 'Output as JSON')
    .action(withDb(async (db, _, options) => {
    const workspaces = db.listWorkspaces();
    if (options.json) {
        console.log(JSON.stringify(workspaces, null, 2));
        return;
    }
    if (workspaces.length === 0) {
        console.log(chalk_1.default.yellow('No workspaces found'));
        return;
    }
    console.log(chalk_1.default.bold('\nWorkspaces:\n'));
    workspaces.forEach(w => {
        console.log(`${chalk_1.default.cyan(w.name)} ${chalk_1.default.gray(`(ID: ${w.id})`)}`);
        console.log(`  Path: ${w.path}`);
        if (w.description)
            console.log(`  ${chalk_1.default.gray(w.description)}`);
        console.log(`  Updated: ${chalk_1.default.gray(w.updated_at)}\n`);
    });
}));
// WebUIサーバー起動
program
    .command('web')
    .description('Start WebUI server')
    .option('--port <port>', 'Server port', '3737')
    .action(async (options) => {
    const { startWebServer } = await Promise.resolve().then(() => __importStar(require('./web')));
    const port = (0, validation_1.parseIntSafe)(options.port, 'port');
    startWebServer(port);
});
program.parse();
//# sourceMappingURL=cli.js.map