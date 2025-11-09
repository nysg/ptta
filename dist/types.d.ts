/**
 * Core type definitions for ptta
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
export interface Summary {
    id: number;
    entity_type: string;
    entity_id: number;
    summary: string;
    metadata?: Metadata;
    created_at: string;
}
export interface ProjectHierarchy extends Project {
    tasks?: (Task & {
        subtasks?: Subtask[];
    })[];
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
export interface ProjectCreateInput {
    title: string;
    description?: string;
    priority?: string;
    metadata?: Metadata;
}
export interface TaskCreateInput {
    project_id: number;
    title: string;
    description?: string;
    priority?: string;
    metadata?: Metadata;
}
export interface SubtaskCreateInput {
    task_id: number;
    title: string;
    metadata?: Metadata;
}
export interface ProjectUpdate extends Partial<Record<string, unknown>> {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    metadata?: Metadata;
}
export interface TaskUpdate extends Partial<Record<string, unknown>> {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    metadata?: Metadata;
}
export interface SubtaskUpdate extends Partial<Record<string, unknown>> {
    title?: string;
    status?: string;
    metadata?: Metadata;
}
//# sourceMappingURL=types.d.ts.map