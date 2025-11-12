/**
 * ptta v2.0 File Editor
 * Intent → Edit フロー
 */
import { PttaDatabase } from './database.js';
export declare class FileEditor {
    private db;
    constructor(db: PttaDatabase);
    /**
     * Create a new file with intention recording
     */
    createFile(sessionId: string, filePath: string, content: string, reason: string): Promise<{
        intentionId: string;
        editId: string;
        success: boolean;
    }>;
    /**
     * Edit an existing file with intention recording
     */
    editFile(sessionId: string, filePath: string, newContent: string, reason: string): Promise<{
        intentionId: string;
        editId: string;
        success: boolean;
    }>;
    /**
     * Delete a file with intention recording
     */
    deleteFile(sessionId: string, filePath: string, reason: string): Promise<{
        intentionId: string;
        editId: string;
        success: boolean;
    }>;
    /**
     * Record intention only (without performing edit)
     * Useful when using external editors
     */
    recordIntention(sessionId: string, filePath: string, action: 'create' | 'edit' | 'delete', reason: string, oldContent?: string, newContent?: string): string;
    /**
     * Record edit result (after external edit)
     */
    recordEdit(sessionId: string, filePath: string, action: 'create' | 'edit' | 'delete', intentionEventId?: string, success?: boolean, errorMessage?: string): string;
}
//# sourceMappingURL=file-editor.d.ts.map