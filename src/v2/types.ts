/**
 * ptta v2.0 Type Definitions
 * AIのための外部記憶装置
 */

// ============================================================================
// Event Types
// ============================================================================

export type EventType =
  | 'user_message'
  | 'assistant_message'
  | 'thinking'
  | 'code_intention'
  | 'file_edit'
  | 'tool_use';

// ============================================================================
// Event Data (type別)
// ============================================================================

export interface UserMessageData {
  content: string;
}

export interface AssistantMessageData {
  content: string;
  tool_calls?: Array<{
    tool: string;
    args: any;
  }>;
}

export interface ThinkingData {
  content: string;
  context?: string;
}

export interface CodeIntentionData {
  action: 'create' | 'edit' | 'delete';
  file_path: string;
  reason: string;
  old_content?: string;
  new_content?: string;
  diff?: string;
}

export interface FileEditData {
  action: 'create' | 'edit' | 'delete';
  file_path: string;
  old_content?: string;
  new_content?: string;
  diff: string;
  intention_event_id?: string;
  success: boolean;
  error_message?: string;
}

export interface ToolUseData {
  tool: string;
  parameters: any;
  result?: any;
  duration_ms?: number;
  success?: boolean;
}

export type EventData =
  | UserMessageData
  | AssistantMessageData
  | ThinkingData
  | CodeIntentionData
  | FileEditData
  | ToolUseData;

// ============================================================================
// Core Models
// ============================================================================

export interface Session {
  id: string;
  workspace_path: string;
  started_at: string; // ISO 8601
  ended_at: string | null; // null = running
  metadata: {
    branch?: string;
    initial_context?: string;
    tags?: string[];
    [key: string]: any;
  };
}

export interface Event {
  id: string;
  session_id: string;
  sequence: number;
  timestamp: string; // ISO 8601
  type: EventType;
  data: EventData;
  parent_event_id?: string;
}

// ============================================================================
// Database Row Types (with created_at)
// ============================================================================

export interface SessionRow {
  id: string;
  workspace_path: string;
  started_at: string;
  ended_at: string | null;
  metadata: string; // JSON string
  created_at: string;
}

export interface EventRow {
  id: string;
  session_id: string;
  sequence: number;
  timestamp: string;
  type: EventType;
  data: string; // JSON string
  parent_event_id: string | null;
  created_at: string;
}

// ============================================================================
// Input Types (for creation)
// ============================================================================

export interface CreateSessionInput {
  workspace_path: string;
  metadata?: Session['metadata'];
}

export interface CreateEventInput {
  session_id: string;
  type: EventType;
  data: EventData;
  parent_event_id?: string;
}

export interface UpdateSessionInput {
  ended_at?: string | null;
  metadata?: Session['metadata'];
}

// ============================================================================
// Query Result Types
// ============================================================================

export interface SessionWithStats extends Session {
  event_count: number;
  last_event_at?: string;
}

export interface EventSearchResult extends Event {
  session: Session;
  rank?: number; // FTS5 rank
  snippet?: string; // FTS5 snippet
}

export interface FileHistoryEntry {
  event_id: string;
  session_id: string;
  timestamp: string;
  action: 'create' | 'edit' | 'delete';
  reason?: string; // from code_intention
  diff: string;
  intention_event_id?: string;
}

export interface Stats {
  sessions: {
    total: number;
    active: number;
    ended: number;
  };
  events: {
    total: number;
    by_type: Record<EventType, number>;
  };
  files: {
    total_edits: number;
    unique_files: number;
  };
}

// ============================================================================
// CLI Options
// ============================================================================

export interface SessionStartOptions {
  workspace?: string;
  branch?: string;
  tags?: string[];
}

export interface SessionListOptions {
  workspace?: string;
  json?: boolean;
  active?: boolean;
}

export interface EventLogOptions {
  session?: string;
}

export interface HistoryOptions {
  session?: string;
  type?: EventType;
  limit?: number;
  json?: boolean;
}

export interface SearchOptions {
  session?: string;
  type?: EventType;
  json?: boolean;
}

export interface ExportOptions {
  session?: string;
  output?: string;
}
