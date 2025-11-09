const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export type Metadata = Record<string, unknown>;

export interface Summary {
  id: number;
  entity_type: string;
  entity_id: number;
  summary: string;
  metadata?: Metadata;
  created_at: string;
}

export interface Project {
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

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  metadata?: Metadata;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  status: string;
  metadata?: Metadata;
  created_at: string;
  completed_at?: string;
}

export interface ProjectHierarchy extends Project {
  tasks?: (Task & { subtasks?: Subtask[] })[];
  summaries?: Summary[];
}

export interface Stats {
  projects: {
    total: number;
    active: number;
    completed: number;
  };
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
  };
  subtasks: {
    total: number;
    todo: number;
    done: number;
  };
}

// API Client
export const api = {
  // Projects
  async getProjects(path?: string, status?: string): Promise<Project[]> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);
    if (status) params.append('status', status);

    const response = await fetch(`${API_BASE_URL}/projects?${params}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch projects' }));
      throw new Error(error.error || 'Failed to fetch projects');
    }
    return response.json();
  },

  async getProject(id: number, path?: string): Promise<ProjectHierarchy> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);

    const response = await fetch(`${API_BASE_URL}/projects/${id}?${params}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch project' }));
      throw new Error(error.error || 'Failed to fetch project');
    }
    return response.json();
  },

  async createProject(data: { title: string; description?: string; priority?: string }, path?: string): Promise<Project> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);

    const response = await fetch(`${API_BASE_URL}/projects?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create project' }));
      throw new Error(error.error || 'Failed to create project');
    }
    return response.json();
  },

  async updateProject(id: number, data: Partial<Project>, path?: string): Promise<Project> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);

    const response = await fetch(`${API_BASE_URL}/projects/${id}?${params}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update project' }));
      throw new Error(error.error || 'Failed to update project');
    }
    return response.json();
  },

  // Tasks
  async getTasks(path?: string, projectId?: number, status?: string): Promise<Task[]> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);
    if (projectId) params.append('projectId', projectId.toString());
    if (status) params.append('status', status);

    const response = await fetch(`${API_BASE_URL}/tasks?${params}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch tasks' }));
      throw new Error(error.error || 'Failed to fetch tasks');
    }
    return response.json();
  },

  async createTask(data: { project_id: number; title: string; description?: string; priority?: string }, path?: string): Promise<Task> {
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

  async updateTask(id: number, data: Partial<Task>, path?: string): Promise<Task> {
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

  // Subtasks
  async createSubtask(data: { task_id: number; title: string }, path?: string): Promise<Subtask> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);

    const response = await fetch(`${API_BASE_URL}/subtasks?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create subtask' }));
      throw new Error(error.error || 'Failed to create subtask');
    }
    return response.json();
  },

  async updateSubtask(id: number, data: Partial<Subtask>, path?: string): Promise<Subtask> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);

    const response = await fetch(`${API_BASE_URL}/subtasks/${id}?${params}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update subtask' }));
      throw new Error(error.error || 'Failed to update subtask');
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
