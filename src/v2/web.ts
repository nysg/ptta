/**
 * WebUI Backend API (v2) - Event-stream model
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { PttaDatabase } from './database.js';
import { EventType, CreateEventInput } from './types.js';
import * as path from 'path';
import * as fs from 'fs';

const app = new Hono();

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

// ========================================
// Sessions API
// ========================================

// GET /api/sessions - セッション一覧
app.get('/api/sessions', (c) => {
  const workspacePath = c.req.query('workspace');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50;
  const activeOnly = c.req.query('active') === 'true';

  let sessions = db.listSessions(workspacePath, activeOnly);

  // Apply limit in the API layer
  if (limit && limit > 0) {
    sessions = sessions.slice(0, limit);
  }

  return c.json(sessions);
});

// GET /api/sessions/:id - セッション詳細
app.get('/api/sessions/:id', (c) => {
  const id = c.req.param('id');
  const session = db.getSession(id);

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json(session);
});

// POST /api/sessions - セッション作成
app.post('/api/sessions', async (c) => {
  try {
    const body = await c.req.json();
    const { workspace_path, metadata } = body;

    if (!workspace_path) {
      return c.json({ error: 'workspace_path is required' }, 400);
    }

    const session = db.createSession({
      workspace_path,
      metadata: metadata || {}
    });

    return c.json(session, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 500);
  }
});

// PATCH /api/sessions/:id - セッション更新（終了など）
app.patch('/api/sessions/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const session = db.getSession(id);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const updated = db.updateSession(id, body);
    return c.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 500);
  }
});

// ========================================
// Events API
// ========================================

// GET /api/sessions/:id/events - セッションのイベント一覧
app.get('/api/sessions/:id/events', (c) => {
  const sessionId = c.req.param('id');
  const type = c.req.query('type') as EventType | undefined;
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 100;

  const events = db.listEvents(sessionId, type, limit);
  return c.json(events);
});

// GET /api/events/:id - イベント詳細
app.get('/api/events/:id', (c) => {
  const id = c.req.param('id');
  const event = db.getEvent(id);

  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  return c.json(event);
});

// POST /api/events - イベント作成
app.post('/api/events', async (c) => {
  try {
    const body = await c.req.json();
    const { session_id, type, data, parent_event_id } = body;

    if (!session_id || !type || !data) {
      return c.json({ error: 'session_id, type, and data are required' }, 400);
    }

    const input: CreateEventInput = {
      session_id,
      type: type as EventType,
      data,
      parent_event_id
    };

    const event = db.createEvent(input);
    return c.json(event, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 500);
  }
});

// ========================================
// Search & File History API
// ========================================

// GET /api/search - 全文検索
app.get('/api/search', (c) => {
  const query = c.req.query('q');
  const sessionId = c.req.query('session');
  const type = c.req.query('type') as EventType | undefined;

  if (!query) {
    return c.json({ error: 'query parameter "q" is required' }, 400);
  }

  const results = db.searchEvents(query, sessionId, type);
  return c.json(results);
});

// GET /api/files/history - ファイル履歴
app.get('/api/files/history', (c) => {
  const filePath = c.req.query('path');

  if (!filePath) {
    return c.json({ error: 'query parameter "path" is required' }, 400);
  }

  const history = db.getFileHistory(filePath);
  return c.json(history);
});

// GET /api/stats - 統計情報
app.get('/api/stats', (c) => {
  const workspacePath = c.req.query('workspace');

  const stats = db.getStats(workspacePath);
  return c.json(stats);
});

// ========================================
// Static Files & SPA Fallback
// ========================================

// 静的ファイル配信（本番用）
const baseDir = path.join(__dirname, '../..');
const webClientDist = path.join(baseDir, 'web/client/dist');

// 静的アセットの配信
app.use('/assets/*', serveStatic({ root: webClientDist }));
app.use('/favicon.svg', serveStatic({ root: webClientDist }));

// SPAフォールバック: すべてのHTML要求にindex.htmlを返す
app.get('*', (c) => {
  const indexPath = path.join(webClientDist, 'index.html');

  if (!fs.existsSync(indexPath)) {
    return c.json({
      error: 'WebUI not built. Run: npm run web:build',
      hint: 'The frontend has not been built yet.'
    }, 404);
  }

  const html = fs.readFileSync(indexPath, 'utf-8');
  return c.html(html);
});

// ========================================
// Server Start Function
// ========================================

export function startWebServer(port: number = 3737) {
  console.log(`🚀 ptta v2 WebUI server starting on http://localhost:${port}`);

  try {
    const server = serve({
      fetch: app.fetch,
      port
    });

    // エラーハンドリング
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${port} is already in use.`);
        console.error(`💡 Try using a different port with: ptta web --port <port_number>\n`);
        process.exit(1);
      } else {
        console.error(`\n❌ Server error:`, error.message);
        process.exit(1);
      }
    });

    console.log(`✅ WebUI server started successfully`);
    console.log(`📊 Access the dashboard at: http://localhost:${port}`);
    console.log(`🔍 API available at: http://localhost:${port}/api/*`);

    return app;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`\n❌ Failed to start server:`, message);
    process.exit(1);
  }
}

// 直接実行された場合
if (require.main === module) {
  const port = parseInt(process.env.PORT || '3737');
  startWebServer(port);
}
