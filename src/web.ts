import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { PttaDatabase } from './database';
import { PttaError, getErrorMessage } from './utils/errors';
import { parseIntSafe } from './utils/validation';
import { createLogger } from './utils/logger';
import * as path from 'path';

const app = new Hono();
const logger = createLogger({ module: 'WebServer' });

// データベースインスタンス
const db = new PttaDatabase();

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
  try {
    const workspacePath = c.req.query('path') || process.cwd();
    const id = parseIntSafe(c.req.param('id'), 'project ID');
    const hierarchy = db.getProjectHierarchy(workspacePath, id);

    if (!hierarchy) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json(hierarchy);
  } catch (error) {
    if (error instanceof PttaError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: getErrorMessage(error) }, 500);
  }
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
  try {
    const workspacePath = c.req.query('path') || process.cwd();
    const id = parseIntSafe(c.req.param('id'), 'project ID');
    const body = await c.req.json();

    const project = db.updateProject(workspacePath, id, body);

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json(project);
  } catch (error) {
    if (error instanceof PttaError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// タスク一覧
app.get('/api/tasks', (c) => {
  try {
    const workspacePath = c.req.query('path') || process.cwd();
    const projectId = c.req.query('projectId') ? parseIntSafe(c.req.query('projectId')!, 'project ID') : undefined;
    const status = c.req.query('status');

    const tasks = db.listTasks(workspacePath, projectId, status);
    return c.json(tasks);
  } catch (error) {
    if (error instanceof PttaError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: getErrorMessage(error) }, 500);
  }
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
  try {
    const workspacePath = c.req.query('path') || process.cwd();
    const id = parseIntSafe(c.req.param('id'), 'task ID');
    const body = await c.req.json();

    const task = db.updateTask(workspacePath, id, body);

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json(task);
  } catch (error) {
    if (error instanceof PttaError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: getErrorMessage(error) }, 500);
  }
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
  try {
    const workspacePath = c.req.query('path') || process.cwd();
    const id = parseIntSafe(c.req.param('id'), 'subtask ID');
    const body = await c.req.json();

    const subtask = db.updateSubtask(workspacePath, id, body);

    if (!subtask) {
      return c.json({ error: 'Subtask not found' }, 404);
    }

    return c.json(subtask);
  } catch (error) {
    if (error instanceof PttaError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: getErrorMessage(error) }, 500);
  }
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

app.use('/assets/*', serveStatic({ root: webClientDist }));
app.get('/', serveStatic({ path: path.join(webClientDist, 'index.html') }));

// サーバー起動関数
export function startWebServer(port: number = 3737) {
  logger.info({ port }, 'Starting WebUI server');
  console.log(`🚀 ptta WebUI server starting on http://localhost:${port}`);

  try {
    const server = serve({
      fetch: app.fetch,
      port
    });

    // エラーハンドリング
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error({ port, errorCode: error.code }, 'Port already in use');
        console.error(`\n❌ Error: Port ${port} is already in use.`);
        console.error(`💡 Try using a different port with: ptta web --port <port_number>\n`);
        process.exit(1);
      } else {
        logger.error({ error }, 'Server error');
        console.error(`\n❌ Server error:`, error.message);
        process.exit(1);
      }
    });

    logger.info({ port }, 'WebUI server started successfully');
    return app;
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    console.error(`\n❌ Failed to start server:`, getErrorMessage(error));
    process.exit(1);
  }
}

// 直接実行された場合
if (require.main === module) {
  const port = parseInt(process.env.PORT || '3737');
  startWebServer(port);
}
