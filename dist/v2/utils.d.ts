/**
 * ptta v2.0 Utility Functions
 */
/**
 * Generate unified diff between two strings
 */
export declare function generateDiff(oldContent: string, newContent: string, filePath?: string): string;
/**
 * Read file content (synchronous)
 */
export declare function readFileSync(filePath: string): string;
/**
 * Write file content (synchronous)
 */
export declare function writeFileSync(filePath: string, content: string): void;
/**
 * Check if file exists
 */
export declare function fileExists(filePath: string): boolean;
/**
 * Get absolute path
 */
export declare function getAbsolutePath(filePath: string): string;
/**
 * Get workspace path (current directory or specified path)
 */
export declare function getWorkspacePath(providedPath?: string): string;
/**
 * Format timestamp for display
 */
export declare function formatTimestamp(isoString: string): string;
/**
 * Truncate string to max length
 */
export declare function truncate(str: string, maxLength: number): string;
/**
 * Extract file name from path
 */
export declare function getFileName(filePath: string): string;
/**
 * Ensure directory exists
 */
export declare function ensureDir(dirPath: string): void;
//# sourceMappingURL=utils.d.ts.map