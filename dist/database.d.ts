import type { Workspace, Metadata, Task, Todo, Action, Summary, TaskHierarchy, Stats, TaskCreateInput, TodoCreateInput, ActionCreateInput, TaskUpdate, TodoUpdate, ActionUpdate } from './types';
export type { Workspace, Metadata, Task, Todo, Action, Summary, TaskHierarchy, Stats, TaskCreateInput, TodoCreateInput, ActionCreateInput, TaskUpdate, TodoUpdate, ActionUpdate };
export declare class PttaDatabase {
    private db;
    private dbPath;
    private logger;
    constructor(dbPath?: string);
    private initDatabase;
    private getTableSuffix;
    registerWorkspace(workspacePath: string, name?: string): Workspace;
    private createWorkspaceTables;
    createTask(workspacePath: string, title: string, description?: string, priority?: string, metadata?: Metadata): Task;
    getTask(workspacePath: string, id: number): Task | null;
    listTasks(workspacePath: string, status?: string): Task[];
    updateTask(workspacePath: string, id: number, updates: TaskUpdate): Task | null;
    createTodo(workspacePath: string, taskId: number, title: string, description?: string, priority?: string, metadata?: Metadata): Todo;
    getTodo(workspacePath: string, id: number): Todo | null;
    listTodos(workspacePath: string, taskId?: number, status?: string): Todo[];
    updateTodo(workspacePath: string, id: number, updates: TodoUpdate): Todo | null;
    createAction(workspacePath: string, todoId: number, title: string, metadata?: Metadata): Action;
    getAction(workspacePath: string, id: number): Action | null;
    listActions(workspacePath: string, todoId: number): Action[];
    updateAction(workspacePath: string, id: number, updates: ActionUpdate): Action | null;
    createSummary(workspacePath: string, entityType: string, entityId: number, summary: string, metadata?: Metadata): number;
    getSummaries(workspacePath: string, entityType: string, entityId: number): Summary[];
    getTaskHierarchy(workspacePath: string, taskId: number): TaskHierarchy | null;
    exportAsJson(workspacePath: string, taskId?: number): TaskHierarchy | null | (TaskHierarchy | null)[];
    getStats(workspacePath: string): Stats;
    listWorkspaces(): Workspace[];
    /**
     * Execute a function within a transaction
     * Automatically handles commit on success and rollback on error
     */
    transaction<T>(fn: () => T): T;
    /**
     * Begin a transaction manually (for advanced use cases)
     */
    beginTransaction(): void;
    /**
     * Commit the current transaction
     */
    commit(): void;
    /**
     * Rollback the current transaction
     */
    rollback(): void;
    close(): void;
}
//# sourceMappingURL=database.d.ts.map