/**
 * ptta v2.0 Utility Functions
 */

import * as path from 'path';
import * as fs from 'fs';
import { createTwoFilesPatch } from 'diff';

/**
 * Generate unified diff between two strings
 */
export function generateDiff(
  oldContent: string,
  newContent: string,
  filePath: string = 'file'
): string {
  const patch = createTwoFilesPatch(
    filePath,
    filePath,
    oldContent,
    newContent,
    'before',
    'after'
  );

  return patch;
}

/**
 * Read file content (synchronous)
 */
export function readFileSync(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Write file content (synchronous)
 */
export function writeFileSync(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Get absolute path
 */
export function getAbsolutePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

/**
 * Get workspace path (current directory or specified path)
 */
export function getWorkspacePath(providedPath?: string): string {
  if (providedPath) {
    return getAbsolutePath(providedPath);
  }
  return process.cwd();
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}

/**
 * Truncate string to max length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Extract file name from path
 */
export function getFileName(filePath: string): string {
  return path.basename(filePath);
}

/**
 * Ensure directory exists
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
