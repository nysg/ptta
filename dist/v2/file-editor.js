"use strict";
/**
 * ptta v2.0 File Editor
 * Intent → Edit フロー
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileEditor = void 0;
const utils_js_1 = require("./utils.js");
class FileEditor {
    constructor(db) {
        this.db = db;
    }
    /**
     * Create a new file with intention recording
     */
    async createFile(sessionId, filePath, content, reason) {
        const absolutePath = (0, utils_js_1.getAbsolutePath)(filePath);
        // STEP 1: Record intention
        const intentionEvent = this.db.createEvent({
            session_id: sessionId,
            type: 'code_intention',
            data: {
                action: 'create',
                file_path: absolutePath,
                reason,
                new_content: content,
            },
        });
        // STEP 2: Perform actual file creation
        let success = false;
        let errorMessage;
        try {
            (0, utils_js_1.writeFileSync)(absolutePath, content);
            success = true;
        }
        catch (error) {
            errorMessage = error.message;
        }
        // STEP 3: Record result
        const editEvent = this.db.createEvent({
            session_id: sessionId,
            type: 'file_edit',
            data: {
                action: 'create',
                file_path: absolutePath,
                new_content: content,
                diff: (0, utils_js_1.generateDiff)('', content, absolutePath),
                intention_event_id: intentionEvent.id,
                success,
                error_message: errorMessage,
            },
            parent_event_id: intentionEvent.id,
        });
        return {
            intentionId: intentionEvent.id,
            editId: editEvent.id,
            success,
        };
    }
    /**
     * Edit an existing file with intention recording
     */
    async editFile(sessionId, filePath, newContent, reason) {
        const absolutePath = (0, utils_js_1.getAbsolutePath)(filePath);
        // Read old content
        let oldContent = '';
        if ((0, utils_js_1.fileExists)(absolutePath)) {
            oldContent = (0, utils_js_1.readFileSync)(absolutePath);
        }
        const diff = (0, utils_js_1.generateDiff)(oldContent, newContent, absolutePath);
        // STEP 1: Record intention
        const intentionEvent = this.db.createEvent({
            session_id: sessionId,
            type: 'code_intention',
            data: {
                action: 'edit',
                file_path: absolutePath,
                reason,
                old_content: oldContent,
                new_content: newContent,
                diff,
            },
        });
        // STEP 2: Perform actual file edit
        let success = false;
        let errorMessage;
        try {
            (0, utils_js_1.writeFileSync)(absolutePath, newContent);
            success = true;
        }
        catch (error) {
            errorMessage = error.message;
        }
        // STEP 3: Record result
        const editEvent = this.db.createEvent({
            session_id: sessionId,
            type: 'file_edit',
            data: {
                action: 'edit',
                file_path: absolutePath,
                old_content: oldContent,
                new_content: newContent,
                diff,
                intention_event_id: intentionEvent.id,
                success,
                error_message: errorMessage,
            },
            parent_event_id: intentionEvent.id,
        });
        return {
            intentionId: intentionEvent.id,
            editId: editEvent.id,
            success,
        };
    }
    /**
     * Delete a file with intention recording
     */
    async deleteFile(sessionId, filePath, reason) {
        const absolutePath = (0, utils_js_1.getAbsolutePath)(filePath);
        // Read old content before deletion
        let oldContent = '';
        if ((0, utils_js_1.fileExists)(absolutePath)) {
            oldContent = (0, utils_js_1.readFileSync)(absolutePath);
        }
        // STEP 1: Record intention
        const intentionEvent = this.db.createEvent({
            session_id: sessionId,
            type: 'code_intention',
            data: {
                action: 'delete',
                file_path: absolutePath,
                reason,
                old_content: oldContent,
            },
        });
        // STEP 2: Perform actual file deletion
        let success = false;
        let errorMessage;
        try {
            if ((0, utils_js_1.fileExists)(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
            success = true;
        }
        catch (error) {
            errorMessage = error.message;
        }
        // STEP 3: Record result
        const editEvent = this.db.createEvent({
            session_id: sessionId,
            type: 'file_edit',
            data: {
                action: 'delete',
                file_path: absolutePath,
                old_content: oldContent,
                diff: (0, utils_js_1.generateDiff)(oldContent, '', absolutePath),
                intention_event_id: intentionEvent.id,
                success,
                error_message: errorMessage,
            },
            parent_event_id: intentionEvent.id,
        });
        return {
            intentionId: intentionEvent.id,
            editId: editEvent.id,
            success,
        };
    }
    /**
     * Record intention only (without performing edit)
     * Useful when using external editors
     */
    recordIntention(sessionId, filePath, action, reason, oldContent, newContent) {
        const absolutePath = (0, utils_js_1.getAbsolutePath)(filePath);
        const intentionEvent = this.db.createEvent({
            session_id: sessionId,
            type: 'code_intention',
            data: {
                action,
                file_path: absolutePath,
                reason,
                old_content: oldContent,
                new_content: newContent,
                diff: oldContent && newContent ? (0, utils_js_1.generateDiff)(oldContent, newContent, absolutePath) : undefined,
            },
        });
        return intentionEvent.id;
    }
    /**
     * Record edit result (after external edit)
     */
    recordEdit(sessionId, filePath, action, intentionEventId, success = true, errorMessage) {
        const absolutePath = (0, utils_js_1.getAbsolutePath)(filePath);
        let oldContent = '';
        let newContent = '';
        let diff = '';
        if (action === 'delete') {
            // File was deleted, can't read new content
            diff = (0, utils_js_1.generateDiff)(oldContent, '', absolutePath);
        }
        else if ((0, utils_js_1.fileExists)(absolutePath)) {
            newContent = (0, utils_js_1.readFileSync)(absolutePath);
            // For create, old content is empty
            diff = (0, utils_js_1.generateDiff)(oldContent, newContent, absolutePath);
        }
        const editEvent = this.db.createEvent({
            session_id: sessionId,
            type: 'file_edit',
            data: {
                action,
                file_path: absolutePath,
                old_content: oldContent || undefined,
                new_content: newContent || undefined,
                diff,
                intention_event_id: intentionEventId,
                success,
                error_message: errorMessage,
            },
            parent_event_id: intentionEventId,
        });
        return editEvent.id;
    }
}
exports.FileEditor = FileEditor;
// Need to import fs
const fs = __importStar(require("fs"));
//# sourceMappingURL=file-editor.js.map