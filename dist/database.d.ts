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
    metadata?: string;
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
    metadata?: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
}
export interface Subtask {
    id: number;
    task_id: number;
    title: string;
    status: string;
    metadata?: string;
    created_at: string;
    completed_at?: string;
}
export interface Summary {
    id: number;
    entity_type: string;
    entity_id: number;
    summary: string;
    metadata?: string;
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
export declare class PttaDatabase {
    private db;
    private dbPath;
    constructor(dbPath?: string);
    private initDatabase;
    private getTableSuffix;
    registerWorkspace(workspacePath: string, name?: string): Workspace;
    private createWorkspaceTables;
    createProject(workspacePath: string, title: string, description?: string, priority?: string, metadata?: any): Project;
    getProject(workspacePath: string, id: number): Project | null;
    listProjects(workspacePath: string, status?: string): Project[];
    updateProject(workspacePath: string, id: number, updates: Partial<Project>): Project | null;
    createTask(workspacePath: string, projectId: number, title: string, description?: string, priority?: string, metadata?: any): Task;
    getTask(workspacePath: string, id: number): Task | null;
    listTasks(workspacePath: string, projectId?: number, status?: string): Task[];
    updateTask(workspacePath: string, id: number, updates: Partial<Task>): Task | null;
    createSubtask(workspacePath: string, taskId: number, title: string, metadata?: any): Subtask;
    getSubtask(workspacePath: string, id: number): Subtask | null;
    listSubtasks(workspacePath: string, taskId: number): Subtask[];
    updateSubtask(workspacePath: string, id: number, updates: Partial<Subtask>): Subtask | null;
    createSummary(workspacePath: string, entityType: string, entityId: number, summary: string, metadata?: any): number;
    getSummaries(workspacePath: string, entityType: string, entityId: number): Summary[];
    getProjectHierarchy(workspacePath: string, projectId: number): ProjectHierarchy | null;
    exportAsJson(workspacePath: string, projectId?: number): any;
    getStats(workspacePath: string): Stats;
    listWorkspaces(): Workspace[];
    close(): void;
}
//# sourceMappingURL=database.d.ts.map