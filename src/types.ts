/**
 * Core type definitions for ptta
 *
 * Hierarchy:
 * Workspace → Task → Todo → Action
 */

export type Metadata = Record<string, unknown>;

export interface Workspace {
  id: number;
  path: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Task: Largest unit within a workspace (formerly "Project")
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

// Todo: Medium unit within a task (formerly "Task")
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

// Action: Smallest unit within a todo (formerly "Subtask")
export interface Action {
  id: number;
  todo_id: number;
  title: string;
  status: string;
  metadata?: Metadata;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface Summary {
  id: number;
  entity_type: string; // 'task', 'todo', 'action'
  entity_id: number;
  summary: string;
  metadata?: Metadata;
  created_at: string;
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

// Input types for create operations
export interface TaskCreateInput {
  title: string;
  description?: string;
  priority?: string;
  metadata?: Metadata;
}

export interface TodoCreateInput {
  task_id: number;
  title: string;
  description?: string;
  priority?: string;
  metadata?: Metadata;
}

export interface ActionCreateInput {
  todo_id: number;
  title: string;
  metadata?: Metadata;
}

// Update types for partial updates
export interface TaskUpdate extends Partial<Record<string, unknown>> {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  metadata?: Metadata;
}

export interface TodoUpdate extends Partial<Record<string, unknown>> {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  metadata?: Metadata;
}

export interface ActionUpdate extends Partial<Record<string, unknown>> {
  title?: string;
  status?: string;
  metadata?: Metadata;
}

// ===== DEPRECATED TYPES (for backward compatibility during migration) =====
// These will be removed in a future version

/** @deprecated Use Task instead */
export type Project = Task;

/** @deprecated Use TaskCreateInput instead */
export type ProjectCreateInput = TaskCreateInput;

/** @deprecated Use TaskUpdate instead */
export type ProjectUpdate = TaskUpdate;

/** @deprecated Use TaskHierarchy instead */
export type ProjectHierarchy = TaskHierarchy;
