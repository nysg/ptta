const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export type Metadata = Record<string, unknown>;

export interface Workspace {
  id: number;
  path: string;
  name: string;
  created_at: string;
}

export interface Summary {
  id: number;
  entity_type: string;
  entity_id: number;
  summary: string;
  metadata?: Metadata;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  metadata?: Metadata;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface Todo {
  id: number;
  task_id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  metadata?: Metadata;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface Action {
  id: number;
  todo_id: number;
  title: string;
  status: string;
  metadata?: Metadata;
  created_at: string;
  completed_at?: string;
}

export interface TaskHierarchy extends Task {
  todos?: (Todo & { actions?: Action[] })[];
  summaries?: Summary[];
}

export interface Stats {
  tasks: {
    total: number;
    active: number;
    completed: number;
  };
  todos: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
  };
  actions: {
    total: number;
    todo: number;
    done: number;
  };
}

// Update types for partial updates
export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  metadata?: Metadata;
}

export interface TodoUpdate {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  metadata?: Metadata;
}

export interface ActionUpdate {
  title?: string;
  status?: string;
  metadata?: Metadata;
}

// API Client
export const api = {
  // Workspaces
  async getWorkspaces(): Promise<Workspace[]> {
    const response = await fetch(`${API_BASE_URL}/workspaces`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch workspaces' }));
      throw new Error(error.error || 'Failed to fetch workspaces');
    }
    return response.json();
  },

  // Tasks
  async getTasks(path?: string, status?: string): Promise<Task[]> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);
    if (status) params.append('status', status);

    const response = await fetch(`${API_BASE_URL}/tasks?${params}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch tasks' }));
      throw new Error(error.error || 'Failed to fetch tasks');
    }
    return response.json();
  },

  async getTask(id: number, path?: string): Promise<TaskHierarchy> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);

    const response = await fetch(`${API_BASE_URL}/tasks/${id}?${params}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch task' }));
      throw new Error(error.error || 'Failed to fetch task');
    }
    return response.json();
  },

  async createTask(data: { title: string; description?: string; priority?: string }, path?: string): Promise<Task> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);

    const response = await fetch(`${API_BASE_URL}/tasks?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create task' }));
      throw new Error(error.error || 'Failed to create task');
    }
    return response.json();
  },

  async updateTask(id: number, data: TaskUpdate, path?: string): Promise<Task> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);

    const response = await fetch(`${API_BASE_URL}/tasks/${id}?${params}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update task' }));
      throw new Error(error.error || 'Failed to update task');
    }
    return response.json();
  },

  // Todos
  async getTodos(path?: string, taskId?: number, status?: string): Promise<Todo[]> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);
    if (taskId) params.append('taskId', taskId.toString());
    if (status) params.append('status', status);

    const response = await fetch(`${API_BASE_URL}/todos?${params}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch todos' }));
      throw new Error(error.error || 'Failed to fetch todos');
    }
    return response.json();
  },

  async createTodo(data: { task_id: number; title: string; description?: string; priority?: string }, path?: string): Promise<Todo> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);

    const response = await fetch(`${API_BASE_URL}/todos?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create todo' }));
      throw new Error(error.error || 'Failed to create todo');
    }
    return response.json();
  },

  async updateTodo(id: number, data: TodoUpdate, path?: string): Promise<Todo> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);

    const response = await fetch(`${API_BASE_URL}/todos/${id}?${params}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update todo' }));
      throw new Error(error.error || 'Failed to update todo');
    }
    return response.json();
  },

  // Actions
  async createAction(data: { todo_id: number; title: string }, path?: string): Promise<Action> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);

    const response = await fetch(`${API_BASE_URL}/actions?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create action' }));
      throw new Error(error.error || 'Failed to create action');
    }
    return response.json();
  },

  async updateAction(id: number, data: ActionUpdate, path?: string): Promise<Action> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);

    const response = await fetch(`${API_BASE_URL}/actions/${id}?${params}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update action' }));
      throw new Error(error.error || 'Failed to update action');
    }
    return response.json();
  },

  // Stats
  async getStats(path?: string): Promise<Stats> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);

    const response = await fetch(`${API_BASE_URL}/stats?${params}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch stats' }));
      throw new Error(error.error || 'Failed to fetch stats');
    }
    return response.json();
  },
};
