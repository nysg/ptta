const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ========================================
// Types (matching v2 backend)
// ========================================

export type EventType =
  | 'user_message'
  | 'assistant_message'
  | 'thinking'
  | 'code_intention'
  | 'file_edit'
  | 'tool_use';

export interface Session {
  id: string;
  workspace_path: string;
  started_at: string;
  ended_at: string | null;
  metadata: Record<string, any>;
}

export interface SessionWithStats extends Session {
  event_count: number;
  last_event_at: string | null;
}

export interface Event {
  id: string;
  session_id: string;
  sequence: number;
  timestamp: string;
  type: EventType;
  data: EventData;
  parent_event_id?: string;
}

export type EventData =
  | UserMessageData
  | AssistantMessageData
  | ThinkingData
  | CodeIntentionData
  | FileEditData
  | ToolUseData;

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

export interface EventSearchResult {
  id: string;
  session_id: string;
  sequence: number;
  timestamp: string;
  type: EventType;
  data: EventData;
  session: Session;
  rank?: number;
}

export interface FileHistoryEntry {
  event_id: string;
  session_id: string;
  timestamp: string;
  action: 'create' | 'edit' | 'delete';
  reason?: string;
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
    by_type: Record<string, number>;
  };
  files: {
    total_edits: number;
    unique_files: number;
  };
}

// ========================================
// API Client
// ========================================

export const api = {
  // Sessions
  async getSessions(params?: {
    workspace?: string;
    limit?: number;
    active?: boolean;
  }): Promise<SessionWithStats[]> {
    const searchParams = new URLSearchParams();
    if (params?.workspace) searchParams.append('workspace', params.workspace);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.active !== undefined) searchParams.append('active', params.active.toString());

    const response = await fetch(`${API_BASE_URL}/sessions?${searchParams}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch sessions' }));
      throw new Error(error.error || 'Failed to fetch sessions');
    }
    return response.json();
  },

  async getSession(id: string): Promise<Session> {
    const response = await fetch(`${API_BASE_URL}/sessions/${id}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch session' }));
      throw new Error(error.error || 'Failed to fetch session');
    }
    return response.json();
  },

  async createSession(data: {
    workspace_path: string;
    metadata?: Record<string, any>;
  }): Promise<Session> {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create session' }));
      throw new Error(error.error || 'Failed to create session');
    }
    return response.json();
  },

  async updateSession(id: string, data: {
    ended_at?: string;
    metadata?: Record<string, any>;
  }): Promise<Session> {
    const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update session' }));
      throw new Error(error.error || 'Failed to update session');
    }
    return response.json();
  },

  // Events
  async getSessionEvents(sessionId: string, params?: {
    type?: EventType;
    limit?: number;
  }): Promise<Event[]> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/events?${searchParams}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch events' }));
      throw new Error(error.error || 'Failed to fetch events');
    }
    return response.json();
  },

  async getEvent(id: string): Promise<Event> {
    const response = await fetch(`${API_BASE_URL}/events/${id}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch event' }));
      throw new Error(error.error || 'Failed to fetch event');
    }
    return response.json();
  },

  async createEvent(data: {
    session_id: string;
    type: EventType;
    data: EventData;
    parent_event_id?: string;
  }): Promise<Event> {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create event' }));
      throw new Error(error.error || 'Failed to create event');
    }
    return response.json();
  },

  // Search
  async search(query: string, params?: {
    session?: string;
    type?: EventType;
  }): Promise<EventSearchResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('q', query);
    if (params?.session) searchParams.append('session', params.session);
    if (params?.type) searchParams.append('type', params.type);

    const response = await fetch(`${API_BASE_URL}/search?${searchParams}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to search' }));
      throw new Error(error.error || 'Failed to search');
    }
    return response.json();
  },

  // File History
  async getFileHistory(filePath: string): Promise<FileHistoryEntry[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('path', filePath);

    const response = await fetch(`${API_BASE_URL}/files/history?${searchParams}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch file history' }));
      throw new Error(error.error || 'Failed to fetch file history');
    }
    return response.json();
  },

  // Stats
  async getStats(params?: { workspace?: string }): Promise<Stats> {
    const searchParams = new URLSearchParams();
    if (params?.workspace) searchParams.append('workspace', params.workspace);

    const response = await fetch(`${API_BASE_URL}/stats?${searchParams}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch stats' }));
      throw new Error(error.error || 'Failed to fetch stats');
    }
    return response.json();
  },
};
