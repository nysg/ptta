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
exports.startWebServer = startWebServer;
const hono_1 = require("hono");
const node_server_1 = require("@hono/node-server");
const serve_static_1 = require("@hono/node-server/serve-static");
const database_1 = require("./database");
const path = __importStar(require("path"));
const app = new hono_1.Hono();
// データベースインスタンス
const db = new database_1.PttaDatabase();
// CORS設定
app.use('/*', async (c, next) => {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type');
    if (c.req.method === 'OPTIONS') {
        return c.body(null, 204);
    }
    await next();
});
// ヘルスチェック
app.get('/api/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ワークスペース一覧
app.get('/api/workspaces', (c) => {
    const workspaces = db.listWorkspaces();
    return c.json(workspaces);
});
// プロジェクト一覧
app.get('/api/projects', (c) => {
    const workspacePath = c.req.query('path') || process.cwd();
    const status = c.req.query('status');
    const projects = db.listProjects(workspacePath, status);
    return c.json(projects);
});
// プロジェクト詳細（階層）
app.get('/api/projects/:id', (c) => {
    const workspacePath = c.req.query('path') || process.cwd();
    const id = parseInt(c.req.param('id'));
    const hierarchy = db.getProjectHierarchy(workspacePath, id);
    if (!hierarchy) {
        return c.json({ error: 'Project not found' }, 404);
    }
    return c.json(hierarchy);
});
// プロジェクト作成
app.post('/api/projects', async (c) => {
    const workspacePath = c.req.query('path') || process.cwd();
    const body = await c.req.json();
    const { title, description, priority } = body;
    if (!title) {
        return c.json({ error: 'Title is required' }, 400);
    }
    const project = db.createProject(workspacePath, title, description, priority || 'medium');
    return c.json(project, 201);
});
// プロジェクト更新
app.patch('/api/projects/:id', async (c) => {
    const workspacePath = c.req.query('path') || process.cwd();
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const project = db.updateProject(workspacePath, id, body);
    if (!project) {
        return c.json({ error: 'Project not found' }, 404);
    }
    return c.json(project);
});
// タスク一覧
app.get('/api/tasks', (c) => {
    const workspacePath = c.req.query('path') || process.cwd();
    const projectId = c.req.query('projectId') ? parseInt(c.req.query('projectId')) : undefined;
    const status = c.req.query('status');
    const tasks = db.listTasks(workspacePath, projectId, status);
    return c.json(tasks);
});
// タスク作成
app.post('/api/tasks', async (c) => {
    const workspacePath = c.req.query('path') || process.cwd();
    const body = await c.req.json();
    const { project_id, title, description, priority } = body;
    if (!project_id || !title) {
        return c.json({ error: 'project_id and title are required' }, 400);
    }
    const task = db.createTask(workspacePath, project_id, title, description, priority || 'medium');
    return c.json(task, 201);
});
// タスク更新
app.patch('/api/tasks/:id', async (c) => {
    const workspacePath = c.req.query('path') || process.cwd();
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const task = db.updateTask(workspacePath, id, body);
    if (!task) {
        return c.json({ error: 'Task not found' }, 404);
    }
    return c.json(task);
});
// サブタスク作成
app.post('/api/subtasks', async (c) => {
    const workspacePath = c.req.query('path') || process.cwd();
    const body = await c.req.json();
    const { task_id, title } = body;
    if (!task_id || !title) {
        return c.json({ error: 'task_id and title are required' }, 400);
    }
    const subtask = db.createSubtask(workspacePath, task_id, title);
    return c.json(subtask, 201);
});
// サブタスク更新
app.patch('/api/subtasks/:id', async (c) => {
    const workspacePath = c.req.query('path') || process.cwd();
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const subtask = db.updateSubtask(workspacePath, id, body);
    if (!subtask) {
        return c.json({ error: 'Subtask not found' }, 404);
    }
    return c.json(subtask);
});
// サマリー作成
app.post('/api/summaries', async (c) => {
    const workspacePath = c.req.query('path') || process.cwd();
    const body = await c.req.json();
    const { entity_type, entity_id, summary } = body;
    if (!entity_type || !entity_id || !summary) {
        return c.json({ error: 'entity_type, entity_id, and summary are required' }, 400);
    }
    const summaryId = db.createSummary(workspacePath, entity_type, entity_id, summary);
    return c.json({ id: summaryId }, 201);
});
// 統計情報
app.get('/api/stats', (c) => {
    const workspacePath = c.req.query('path') || process.cwd();
    const stats = db.getStats(workspacePath);
    return c.json(stats);
});
// 静的ファイル配信（本番用）
// グローバルインストール対応: 絶対パスで解決
const baseDir = path.join(__dirname, '..');
const webClientDist = path.join(baseDir, 'web/client/dist');
app.use('/assets/*', (0, serve_static_1.serveStatic)({ root: webClientDist }));
app.get('/', (0, serve_static_1.serveStatic)({ path: path.join(webClientDist, 'index.html') }));
// サーバー起動関数
function startWebServer(port = 3000) {
    console.log(`🚀 ptta WebUI server starting on http://localhost:${port}`);
    try {
        const server = (0, node_server_1.serve)({
            fetch: app.fetch,
            port
        });
        // エラーハンドリング
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`\n❌ Error: Port ${port} is already in use.`);
                console.error(`💡 Try using a different port with: ptta web --port <port_number>\n`);
                process.exit(1);
            }
            else {
                console.error(`\n❌ Server error:`, error.message);
                process.exit(1);
            }
        });
        return app;
    }
    catch (error) {
        console.error(`\n❌ Failed to start server:`, error.message);
        process.exit(1);
    }
}
// 直接実行された場合
if (require.main === module) {
    const port = parseInt(process.env.PORT || '3000');
    startWebServer(port);
}
//# sourceMappingURL=web.js.map