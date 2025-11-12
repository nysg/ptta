/**
 * ptta v2.0 File Editor
 * Intent → Edit フロー
 */

import { PttaDatabase } from './database.js';
import {
  generateDiff,
  readFileSync,
  writeFileSync,
  fileExists,
  getAbsolutePath,
} from './utils.js';

export class FileEditor {
  constructor(private db: PttaDatabase) {}

  /**
   * Create a new file with intention recording
   */
  async createFile(
    sessionId: string,
    filePath: string,
    content: string,
    reason: string
  ): Promise<{ intentionId: string; editId: string; success: boolean }> {
    const absolutePath = getAbsolutePath(filePath);

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
    let errorMessage: string | undefined;

    try {
      writeFileSync(absolutePath, content);
      success = true;
    } catch (error: any) {
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
        diff: generateDiff('', content, absolutePath),
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
  async editFile(
    sessionId: string,
    filePath: string,
    newContent: string,
    reason: string
  ): Promise<{ intentionId: string; editId: string; success: boolean }> {
    const absolutePath = getAbsolutePath(filePath);

    // Read old content
    let oldContent = '';
    if (fileExists(absolutePath)) {
      oldContent = readFileSync(absolutePath);
    }

    const diff = generateDiff(oldContent, newContent, absolutePath);

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
    let errorMessage: string | undefined;

    try {
      writeFileSync(absolutePath, newContent);
      success = true;
    } catch (error: any) {
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
  async deleteFile(
    sessionId: string,
    filePath: string,
    reason: string
  ): Promise<{ intentionId: string; editId: string; success: boolean }> {
    const absolutePath = getAbsolutePath(filePath);

    // Read old content before deletion
    let oldContent = '';
    if (fileExists(absolutePath)) {
      oldContent = readFileSync(absolutePath);
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
    let errorMessage: string | undefined;

    try {
      if (fileExists(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
      success = true;
    } catch (error: any) {
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
        diff: generateDiff(oldContent, '', absolutePath),
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
  recordIntention(
    sessionId: string,
    filePath: string,
    action: 'create' | 'edit' | 'delete',
    reason: string,
    oldContent?: string,
    newContent?: string
  ): string {
    const absolutePath = getAbsolutePath(filePath);

    const intentionEvent = this.db.createEvent({
      session_id: sessionId,
      type: 'code_intention',
      data: {
        action,
        file_path: absolutePath,
        reason,
        old_content: oldContent,
        new_content: newContent,
        diff: oldContent && newContent ? generateDiff(oldContent, newContent, absolutePath) : undefined,
      },
    });

    return intentionEvent.id;
  }

  /**
   * Record edit result (after external edit)
   */
  recordEdit(
    sessionId: string,
    filePath: string,
    action: 'create' | 'edit' | 'delete',
    intentionEventId?: string,
    success: boolean = true,
    errorMessage?: string
  ): string {
    const absolutePath = getAbsolutePath(filePath);

    let oldContent = '';
    let newContent = '';
    let diff = '';

    if (action === 'delete') {
      // File was deleted, can't read new content
      diff = generateDiff(oldContent, '', absolutePath);
    } else if (fileExists(absolutePath)) {
      newContent = readFileSync(absolutePath);
      // For create, old content is empty
      diff = generateDiff(oldContent, newContent, absolutePath);
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

// Need to import fs
import * as fs from 'fs';
