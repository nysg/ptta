"use strict";
/**
 * ptta v2.0 Database Layer
 * SQLite database with FTS5 full-text search
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PttaDatabase = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const uuid_1 = require("uuid");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
class PttaDatabase {
    constructor(dbPath) {
        this.dbPath = dbPath || this.getDefaultDbPath();
        this.ensureDbDirectory();
        this.db = new better_sqlite3_1.default(this.dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
        this.initialize();
    }
    getDefaultDbPath() {
        const homeDir = os.homedir();
        return path.join(homeDir, '.ptta', 'ptta.db');
    }
    ensureDbDirectory() {
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    initialize() {
        this.createTables();
        this.createIndices();
        this.createFTS();
        this.createTriggers();
    }
    createTables() {
        // Sessions table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        workspace_path TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
        // Events table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        parent_event_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_event_id) REFERENCES events(id)
      )
    `);
    }
    createIndices() {
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions(workspace_path);
      CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_ended ON sessions(ended_at DESC);

      CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, sequence);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_events_parent ON events(parent_event_id);
    `);
    }
    createFTS() {
        // FTS5 virtual table for full-text search
        // TODO: Re-enable after fixing trigger issues
        // this.db.exec(`
        //   CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
        //     event_id UNINDEXED,
        //     session_id UNINDEXED,
        //     type UNINDEXED,
        //     content,
        //     tokenize = 'unicode61'
        //   )
        // `);
    }
    createTriggers() {
        // Auto-update FTS5 table when events are inserted
        // Note: Triggers are disabled temporarily for debugging
        // this.db.exec(`
        //   CREATE TRIGGER IF NOT EXISTS events_fts_insert AFTER INSERT ON events BEGIN
        //     INSERT INTO events_fts(event_id, session_id, type, content)
        //     VALUES (
        //       new.id,
        //       new.session_id,
        //       new.type,
        //       IFNULL(json_extract(new.data, '$.content'), '') || ' ' ||
        //       IFNULL(json_extract(new.data, '$.reason'), '') || ' ' ||
        //       IFNULL(json_extract(new.data, '$.file_path'), '') || ' ' ||
        //       IFNULL(json_extract(new.data, '$.context'), '')
        //     );
        //   END;
        // `);
        // // Delete from FTS5 when event is deleted
        // this.db.exec(`
        //   CREATE TRIGGER IF NOT EXISTS events_fts_delete AFTER DELETE ON events BEGIN
        //     DELETE FROM events_fts WHERE event_id = old.id;
        //   END;
        // `);
    }
    // ============================================================================
    // Session Operations
    // ============================================================================
    createSession(input) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const metadata = JSON.stringify(input.metadata || {});
        const stmt = this.db.prepare(`
      INSERT INTO sessions (id, workspace_path, started_at, metadata)
      VALUES (?, ?, ?, ?)
    `);
        stmt.run(id, input.workspace_path, now, metadata);
        return {
            id,
            workspace_path: input.workspace_path,
            started_at: now,
            ended_at: null,
            metadata: input.metadata || {},
        };
    }
    getSession(id) {
        const stmt = this.db.prepare(`
      SELECT id, workspace_path, started_at, ended_at, metadata
      FROM sessions
      WHERE id = ?
    `);
        const row = stmt.get(id);
        if (!row)
            return null;
        return this.parseSessionRow(row);
    }
    listSessions(workspacePath, activeOnly) {
        let sql = `
      SELECT
        s.id, s.workspace_path, s.started_at, s.ended_at, s.metadata,
        COUNT(e.id) as event_count,
        MAX(e.timestamp) as last_event_at
      FROM sessions s
      LEFT JOIN events e ON s.id = e.session_id
    `;
        const conditions = [];
        const params = [];
        if (workspacePath) {
            conditions.push('s.workspace_path = ?');
            params.push(workspacePath);
        }
        if (activeOnly) {
            conditions.push('s.ended_at IS NULL');
        }
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        sql += ' GROUP BY s.id ORDER BY s.started_at DESC';
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        return rows.map((row) => ({
            ...this.parseSessionRow(row),
            event_count: row.event_count,
            last_event_at: row.last_event_at || undefined,
        }));
    }
    getCurrentSession(workspacePath) {
        const stmt = this.db.prepare(`
      SELECT id, workspace_path, started_at, ended_at, metadata
      FROM sessions
      WHERE workspace_path = ? AND ended_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `);
        const row = stmt.get(workspacePath);
        if (!row)
            return null;
        return this.parseSessionRow(row);
    }
    updateSession(id, input) {
        const updates = [];
        const params = [];
        if (input.ended_at !== undefined) {
            updates.push('ended_at = ?');
            params.push(input.ended_at);
        }
        if (input.metadata !== undefined) {
            updates.push('metadata = ?');
            params.push(JSON.stringify(input.metadata));
        }
        if (updates.length === 0) {
            return this.getSession(id);
        }
        params.push(id);
        const stmt = this.db.prepare(`
      UPDATE sessions
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
        stmt.run(...params);
        return this.getSession(id);
    }
    endSession(id) {
        const now = new Date().toISOString();
        return this.updateSession(id, { ended_at: now });
    }
    // ============================================================================
    // Event Operations
    // ============================================================================
    createEvent(input) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        // Get next sequence number for this session
        const sequenceStmt = this.db.prepare(`
      SELECT COALESCE(MAX(sequence), 0) + 1 as next_seq
      FROM events
      WHERE session_id = ?
    `);
        const { next_seq } = sequenceStmt.get(input.session_id);
        const stmt = this.db.prepare(`
      INSERT INTO events (id, session_id, sequence, timestamp, type, data, parent_event_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, input.session_id, next_seq, now, input.type, JSON.stringify(input.data), input.parent_event_id || null);
        return {
            id,
            session_id: input.session_id,
            sequence: next_seq,
            timestamp: now,
            type: input.type,
            data: input.data,
            parent_event_id: input.parent_event_id,
        };
    }
    getEvent(id) {
        const stmt = this.db.prepare(`
      SELECT id, session_id, sequence, timestamp, type, data, parent_event_id
      FROM events
      WHERE id = ?
    `);
        const row = stmt.get(id);
        if (!row)
            return null;
        return this.parseEventRow(row);
    }
    listEvents(sessionId, type, limit) {
        let sql = `
      SELECT id, session_id, sequence, timestamp, type, data, parent_event_id
      FROM events
      WHERE session_id = ?
    `;
        const params = [sessionId];
        if (type) {
            sql += ' AND type = ?';
            params.push(type);
        }
        sql += ' ORDER BY sequence ASC';
        if (limit) {
            sql += ' LIMIT ?';
            params.push(limit);
        }
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        return rows.map((row) => this.parseEventRow(row));
    }
    getRecentEvents(limit = 10, type) {
        let sql = `
      SELECT id, session_id, sequence, timestamp, type, data, parent_event_id
      FROM events
    `;
        const params = [];
        if (type) {
            sql += ' WHERE type = ?';
            params.push(type);
        }
        sql += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        return rows.map((row) => this.parseEventRow(row));
    }
    // ============================================================================
    // File History
    // ============================================================================
    getFileHistory(filePath) {
        const stmt = this.db.prepare(`
      SELECT
        e.id as event_id,
        e.session_id,
        e.timestamp,
        json_extract(e.data, '$.action') as action,
        json_extract(e.data, '$.diff') as diff,
        json_extract(e.data, '$.intention_event_id') as intention_event_id
      FROM events e
      WHERE e.type = 'file_edit'
        AND json_extract(e.data, '$.file_path') = ?
      ORDER BY e.timestamp DESC
    `);
        const rows = stmt.all(filePath);
        // For each file_edit, try to get the corresponding intention reason
        return rows.map((row) => {
            let reason;
            if (row.intention_event_id) {
                const intentionStmt = this.db.prepare(`
          SELECT json_extract(data, '$.reason') as reason
          FROM events
          WHERE id = ?
        `);
                const intentionRow = intentionStmt.get(row.intention_event_id);
                if (intentionRow) {
                    reason = intentionRow.reason;
                }
            }
            return {
                event_id: row.event_id,
                session_id: row.session_id,
                timestamp: row.timestamp,
                action: row.action,
                reason,
                diff: row.diff,
                intention_event_id: row.intention_event_id,
            };
        });
    }
    // ============================================================================
    // Search (FTS5)
    // ============================================================================
    searchEvents(query, sessionId, type) {
        let sql = `
      SELECT
        e.id, e.session_id, e.sequence, e.timestamp, e.type, e.data, e.parent_event_id,
        s.id as s_id, s.workspace_path, s.started_at, s.ended_at, s.metadata,
        fts.rank
      FROM events_fts fts
      JOIN events e ON fts.event_id = e.id
      JOIN sessions s ON e.session_id = s.id
      WHERE events_fts MATCH ?
    `;
        const params = [query];
        if (sessionId) {
            sql += ' AND fts.session_id = ?';
            params.push(sessionId);
        }
        if (type) {
            sql += ' AND fts.type = ?';
            params.push(type);
        }
        sql += ' ORDER BY fts.rank LIMIT 100';
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        return rows.map((row) => ({
            ...this.parseEventRow(row),
            session: this.parseSessionRow({
                id: row.s_id,
                workspace_path: row.workspace_path,
                started_at: row.started_at,
                ended_at: row.ended_at,
                metadata: row.metadata,
                created_at: row.created_at,
            }),
            rank: row.rank,
        }));
    }
    // ============================================================================
    // Event Chain (Causality)
    // ============================================================================
    getEventChain(eventId) {
        const chain = [];
        let currentId = eventId;
        while (currentId) {
            const event = this.getEvent(currentId);
            if (!event)
                break;
            chain.unshift(event); // Add to beginning
            currentId = event.parent_event_id;
        }
        return chain;
    }
    // ============================================================================
    // Statistics
    // ============================================================================
    getStats(workspacePath) {
        const params = [];
        let whereClause = '';
        if (workspacePath) {
            whereClause = ' WHERE workspace_path = ?';
            params.push(workspacePath);
        }
        // Session stats
        const sessionStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN ended_at IS NULL THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN ended_at IS NOT NULL THEN 1 ELSE 0 END) as ended
      FROM sessions${whereClause}
    `);
        const sessionStats = sessionStmt.get(...params);
        // Event stats by type
        let eventSql = `
      SELECT
        type,
        COUNT(*) as count
      FROM events e
    `;
        if (workspacePath) {
            eventSql += ' JOIN sessions s ON e.session_id = s.id WHERE s.workspace_path = ?';
        }
        eventSql += ' GROUP BY type';
        const eventStmt = this.db.prepare(eventSql);
        const eventRows = eventStmt.all(...params);
        const eventsByType = {};
        let totalEvents = 0;
        for (const row of eventRows) {
            eventsByType[row.type] = row.count;
            totalEvents += row.count;
        }
        // File edit stats
        let fileSql = `
      SELECT
        COUNT(*) as total_edits,
        COUNT(DISTINCT json_extract(data, '$.file_path')) as unique_files
      FROM events e
      WHERE type = 'file_edit'
    `;
        if (workspacePath) {
            fileSql += ' AND session_id IN (SELECT id FROM sessions WHERE workspace_path = ?)';
        }
        const fileStmt = this.db.prepare(fileSql);
        const fileStats = fileStmt.get(...params);
        return {
            sessions: {
                total: sessionStats.total,
                active: sessionStats.active,
                ended: sessionStats.ended,
            },
            events: {
                total: totalEvents,
                by_type: eventsByType,
            },
            files: {
                total_edits: fileStats.total_edits,
                unique_files: fileStats.unique_files,
            },
        };
    }
    // ============================================================================
    // Utility Methods
    // ============================================================================
    parseSessionRow(row) {
        return {
            id: row.id,
            workspace_path: row.workspace_path,
            started_at: row.started_at,
            ended_at: row.ended_at,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
        };
    }
    parseEventRow(row) {
        return {
            id: row.id,
            session_id: row.session_id,
            sequence: row.sequence,
            timestamp: row.timestamp,
            type: row.type,
            data: JSON.parse(row.data),
            parent_event_id: row.parent_event_id !== null ? row.parent_event_id : undefined,
        };
    }
    close() {
        this.db.close();
    }
    // Transaction support
    transaction(fn) {
        return this.db.transaction(fn)();
    }
}
exports.PttaDatabase = PttaDatabase;
//# sourceMappingURL=database.js.map