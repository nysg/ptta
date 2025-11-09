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
// プロジェクト作成
program
    .command('project:add')
    .description('Create a new project')
    .argument('<title>', 'Project title')
    .option('-d, --description <desc>', 'Project description')
    .option('-P, --priority <priority>', 'Priority (low/medium/high)', 'medium')
    .action(withDb(async (db, workspacePath, title, options) => {
    const project = db.createProject(workspacePath, title, options.description, options.priority);
    console.log(chalk_1.default.green('✓ Project created:'));
    console.log(JSON.stringify(project, null, 2));
}));
// プロジェクト一覧
program
    .command('project:list')
    .description('List all projects')
    .option('-s, --status <status>', 'Filter by status')
    .option('-j, --json', 'Output as JSON')
    .action(withDb(async (db, workspacePath, options) => {
    const projects = db.listProjects(workspacePath, options.status);
    if (options.json) {
        console.log(JSON.stringify(projects, null, 2));
        return;
    }
    if (projects.length === 0) {
        console.log(chalk_1.default.yellow('No projects found'));
        return;
    }
    projects.forEach(p => {
        const statusColor = p.status === 'completed' ? chalk_1.default.green : chalk_1.default.blue;
        console.log(`\n${chalk_1.default.bold(`#${p.id}`)} ${chalk_1.default.cyan(p.title)}`);
        console.log(`  Status: ${statusColor(p.status)}`);
        console.log(`  Priority: ${p.priority}`);
        if (p.description)
            console.log(`  ${chalk_1.default.gray(p.description)}`);
        console.log(`  Created: ${chalk_1.default.gray(p.created_at)}`);
    });
}));
// プロジェクト詳細
program
    .command('project:show')
    .description('Show project with all tasks and subtasks')
    .argument('<id>', 'Project ID')
    .option('-j, --json', 'Output as JSON')
    .action(withDb(async (db, workspacePath, id, options) => {
    const hierarchy = db.getProjectHierarchy(workspacePath, (0, validation_1.parseIntSafe)(id, 'project ID'));
    if (!hierarchy) {
        console.log(chalk_1.default.red('Project not found'));
        return;
    }
    if (options.json) {
        console.log(JSON.stringify(hierarchy, null, 2));
        return;
    }
    console.log(chalk_1.default.bold.cyan(`\n${hierarchy.title}`));
    console.log(chalk_1.default.gray(hierarchy.description || ''));
    console.log(`Status: ${hierarchy.status} | Priority: ${hierarchy.priority}\n`);
    if (hierarchy.tasks && hierarchy.tasks.length > 0) {
        hierarchy.tasks.forEach(task => {
            const taskStatus = task.status === 'done' ? '✓' : '○';
            console.log(`  ${taskStatus} [${task.id}] ${task.title} (${task.status})`);
            if (task.subtasks && task.subtasks.length > 0) {
                task.subtasks.forEach(subtask => {
                    const subStatus = subtask.status === 'done' ? '✓' : '○';
                    console.log(`    ${subStatus} [${subtask.id}] ${subtask.title}`);
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
// プロジェクト更新
program
    .command('project:update')
    .description('Update project')
    .argument('<id>', 'Project ID')
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
    const project = db.updateProject(workspacePath, (0, validation_1.parseIntSafe)(id, 'project ID'), updates);
    console.log(chalk_1.default.green('✓ Project updated:'));
    console.log(JSON.stringify(project, null, 2));
}));
// タスク作成
program
    .command('task:add')
    .description('Create a new task')
    .argument('<projectId>', 'Project ID')
    .argument('<title>', 'Task title')
    .option('-d, --description <desc>', 'Task description')
    .option('-P, --priority <priority>', 'Priority (low/medium/high)', 'medium')
    .action(withDb(async (db, workspacePath, projectId, title, options) => {
    const task = db.createTask(workspacePath, (0, validation_1.parseIntSafe)(projectId, 'project ID'), title, options.description, options.priority);
    console.log(chalk_1.default.green('✓ Task created:'));
    console.log(JSON.stringify(task, null, 2));
}));
// タスク一覧
program
    .command('task:list')
    .description('List tasks')
    .option('-P, --project <id>', 'Filter by project ID')
    .option('-s, --status <status>', 'Filter by status')
    .option('-j, --json', 'Output as JSON')
    .action(withDb(async (db, workspacePath, options) => {
    const projectId = options.project ? (0, validation_1.parseIntSafe)(options.project, 'project ID') : undefined;
    const tasks = db.listTasks(workspacePath, projectId, options.status);
    if (options.json) {
        console.log(JSON.stringify(tasks, null, 2));
        return;
    }
    if (tasks.length === 0) {
        console.log(chalk_1.default.yellow('No tasks found'));
        return;
    }
    tasks.forEach(t => {
        const statusIcon = t.status === 'done' ? '✓' : t.status === 'in_progress' ? '◐' : '○';
        console.log(`${statusIcon} [${t.id}] ${t.title}`);
        console.log(`  Project: #${t.project_id} | Status: ${t.status} | Priority: ${t.priority}`);
        if (t.description)
            console.log(`  ${chalk_1.default.gray(t.description)}`);
    });
}));
// タスク更新
program
    .command('task:update')
    .description('Update task status or details')
    .argument('<id>', 'Task ID')
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
    const task = db.updateTask(workspacePath, (0, validation_1.parseIntSafe)(id, 'task ID'), updates);
    console.log(chalk_1.default.green('✓ Task updated:'));
    console.log(JSON.stringify(task, null, 2));
}));
// サブタスク作成
program
    .command('subtask:add')
    .description('Create a new subtask')
    .argument('<taskId>', 'Task ID')
    .argument('<title>', 'Subtask title')
    .action(withDb(async (db, workspacePath, taskId, title) => {
    const subtask = db.createSubtask(workspacePath, (0, validation_1.parseIntSafe)(taskId, 'task ID'), title);
    console.log(chalk_1.default.green('✓ Subtask created:'));
    console.log(JSON.stringify(subtask, null, 2));
}));
// サブタスク完了
program
    .command('subtask:done')
    .description('Mark subtask as done')
    .argument('<id>', 'Subtask ID')
    .action(withDb(async (db, workspacePath, id) => {
    const subtask = db.updateSubtask(workspacePath, (0, validation_1.parseIntSafe)(id, 'subtask ID'), { status: 'done' });
    console.log(chalk_1.default.green('✓ Subtask completed:'));
    console.log(JSON.stringify(subtask, null, 2));
}));
// サブタスク更新
program
    .command('subtask:update')
    .description('Update subtask')
    .argument('<id>', 'Subtask ID')
    .option('-s, --status <status>', 'New status (todo/done)')
    .option('-t, --title <title>', 'New title')
    .action(withDb(async (db, workspacePath, id, options) => {
    const updates = {};
    if (options.status)
        updates.status = options.status;
    if (options.title)
        updates.title = options.title;
    const subtask = db.updateSubtask(workspacePath, (0, validation_1.parseIntSafe)(id, 'subtask ID'), updates);
    console.log(chalk_1.default.green('✓ Subtask updated:'));
    console.log(JSON.stringify(subtask, null, 2));
}));
// サマリー追加
program
    .command('summary:add')
    .description('Add a summary for a project or task')
    .argument('<type>', 'Entity type (project/task)')
    .argument('<id>', 'Entity ID')
    .argument('<summary>', 'Summary text')
    .action(withDb(async (db, workspacePath, type, id, summary) => {
    const summaryId = db.createSummary(workspacePath, type, (0, validation_1.parseIntSafe)(id, 'entity ID'), summary);
    console.log(chalk_1.default.green(`✓ Summary added (ID: ${summaryId})`));
}));
// エクスポート
program
    .command('export')
    .description('Export all data or specific project as JSON')
    .option('-P, --project <id>', 'Export specific project')
    .option('-o, --output <file>', 'Output file path')
    .action(withDb(async (db, workspacePath, options) => {
    const projectId = options.project ? (0, validation_1.parseIntSafe)(options.project, 'project ID') : undefined;
    const data = db.exportAsJson(workspacePath, projectId);
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
    console.log(chalk_1.default.cyan('Projects:'));
    console.log(`  Total: ${stats.projects.total}`);
    console.log(`  Active: ${chalk_1.default.blue(stats.projects.active)}`);
    console.log(`  Completed: ${chalk_1.default.green(stats.projects.completed)}\n`);
    console.log(chalk_1.default.cyan('Tasks:'));
    console.log(`  Total: ${stats.tasks.total}`);
    console.log(`  Todo: ${chalk_1.default.yellow(stats.tasks.todo)}`);
    console.log(`  In Progress: ${chalk_1.default.blue(stats.tasks.inProgress)}`);
    console.log(`  Done: ${chalk_1.default.green(stats.tasks.done)}\n`);
    console.log(chalk_1.default.cyan('Subtasks:'));
    console.log(`  Total: ${stats.subtasks.total}`);
    console.log(`  Todo: ${chalk_1.default.yellow(stats.subtasks.todo)}`);
    console.log(`  Done: ${chalk_1.default.green(stats.subtasks.done)}`);
}));
// AI用の簡易クエリコマンド
program
    .command('query')
    .description('Query data in JSON format (AI-friendly)')
    .argument('<type>', 'Query type (projects/tasks/hierarchy/all/stats/workspaces)')
    .option('-i, --id <id>', 'Specific ID')
    .option('-s, --status <status>', 'Filter by status')
    .action(withDb(async (db, workspacePath, type, options) => {
    let result;
    switch (type) {
        case 'projects':
            result = db.listProjects(workspacePath, options.status);
            break;
        case 'tasks':
            result = db.listTasks(workspacePath, options.id ? (0, validation_1.parseIntSafe)(options.id, 'ID') : undefined, options.status);
            break;
        case 'hierarchy':
            if (!options.id) {
                console.error('Error: --id required for hierarchy query');
                process.exit(1);
            }
            result = db.getProjectHierarchy(workspacePath, (0, validation_1.parseIntSafe)(options.id, 'project ID'));
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