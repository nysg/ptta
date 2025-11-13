"use strict";
/**
 * WebUI Backend API (v2) - Event-stream model
 */
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
const database_js_1 = require("./database.js");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const app = new hono_1.Hono();
// データベースインスタンス
const db = new database_js_1.PttaDatabase();
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
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')) : 50;
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    const type = c.req.query('type');
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')) : 100;
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
        const input = {
            session_id,
            type: type,
            data,
            parent_event_id
        };
        const event = db.createEvent(input);
        return c.json(event, 201);
    }
    catch (error) {
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
    const type = c.req.query('type');
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
app.use('/assets/*', (0, serve_static_1.serveStatic)({ root: webClientDist }));
app.use('/favicon.svg', (0, serve_static_1.serveStatic)({ root: webClientDist }));
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
function startWebServer(port = 3737) {
    console.log(`🚀 ptta v2 WebUI server starting on http://localhost:${port}`);
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
        console.log(`✅ WebUI server started successfully`);
        console.log(`📊 Access the dashboard at: http://localhost:${port}`);
        console.log(`🔍 API available at: http://localhost:${port}/api/*`);
        return app;
    }
    catch (error) {
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
//# sourceMappingURL=web.js.map