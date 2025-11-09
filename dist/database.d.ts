import type { Workspace, Metadata, Project, Task, Subtask, Summary, ProjectHierarchy, Stats, ProjectCreateInput, TaskCreateInput, SubtaskCreateInput, ProjectUpdate, TaskUpdate, SubtaskUpdate } from './types';
export type { Workspace, Metadata, Project, Task, Subtask, Summary, ProjectHierarchy, Stats, ProjectCreateInput, TaskCreateInput, SubtaskCreateInput, ProjectUpdate, TaskUpdate, SubtaskUpdate };
export declare class PttaDatabase {
    private db;
    private dbPath;
    constructor(dbPath?: string);
    private initDatabase;
    private getTableSuffix;
    registerWorkspace(workspacePath: string, name?: string): Workspace;
    private createWorkspaceTables;
    createProject(workspacePath: string, title: string, description?: string, priority?: string, metadata?: Metadata): Project;
    getProject(workspacePath: string, id: number): Project | null;
    listProjects(workspacePath: string, status?: string): Project[];
    updateProject(workspacePath: string, id: number, updates: ProjectUpdate): Project | null;
    createTask(workspacePath: string, projectId: number, title: string, description?: string, priority?: string, metadata?: Metadata): Task;
    getTask(workspacePath: string, id: number): Task | null;
    listTasks(workspacePath: string, projectId?: number, status?: string): Task[];
    updateTask(workspacePath: string, id: number, updates: TaskUpdate): Task | null;
    createSubtask(workspacePath: string, taskId: number, title: string, metadata?: Metadata): Subtask;
    getSubtask(workspacePath: string, id: number): Subtask | null;
    listSubtasks(workspacePath: string, taskId: number): Subtask[];
    updateSubtask(workspacePath: string, id: number, updates: SubtaskUpdate): Subtask | null;
    createSummary(workspacePath: string, entityType: string, entityId: number, summary: string, metadata?: Metadata): number;
    getSummaries(workspacePath: string, entityType: string, entityId: number): Summary[];
    getProjectHierarchy(workspacePath: string, projectId: number): ProjectHierarchy | null;
    exportAsJson(workspacePath: string, projectId?: number): ProjectHierarchy | null | (ProjectHierarchy | null)[];
    getStats(workspacePath: string): Stats;
    listWorkspaces(): Workspace[];
    close(): void;
}
//# sourceMappingURL=database.d.ts.map