/**
 * ptta v2.0 Database Layer
 * SQLite database with FTS5 full-text search
 */
import { Session, Event, EventType, CreateSessionInput, CreateEventInput, UpdateSessionInput, SessionWithStats, EventSearchResult, FileHistoryEntry, Stats } from './types.js';
export declare class PttaDatabase {
    private db;
    private dbPath;
    constructor(dbPath?: string);
    private getDefaultDbPath;
    private ensureDbDirectory;
    private initialize;
    private createTables;
    private createIndices;
    private createFTS;
    private createTriggers;
    createSession(input: CreateSessionInput): Session;
    getSession(id: string): Session | null;
    listSessions(workspacePath?: string, activeOnly?: boolean): SessionWithStats[];
    getCurrentSession(workspacePath: string): Session | null;
    updateSession(id: string, input: UpdateSessionInput): Session | null;
    endSession(id: string): Session | null;
    createEvent(input: CreateEventInput): Event;
    getEvent(id: string): Event | null;
    listEvents(sessionId: string, type?: EventType, limit?: number): Event[];
    getRecentEvents(limit?: number, type?: EventType): Event[];
    getFileHistory(filePath: string): FileHistoryEntry[];
    searchEvents(query: string, sessionId?: string, type?: EventType): EventSearchResult[];
    getEventChain(eventId: string): Event[];
    getStats(workspacePath?: string): Stats;
    private parseSessionRow;
    private parseEventRow;
    close(): void;
    transaction<T>(fn: () => T): T;
}
//# sourceMappingURL=database.d.ts.map