/**
 * Export commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import { getDb } from '../cli.js';
import { getWorkspacePath, getAbsolutePath } from '../utils.js';

export function registerExportCommands(program: Command): void {
  program
    .command('export')
    .description('Export session data as JSON')
    .option('-s, --session <id>', 'Session ID (default: current active session)')
    .option('-w, --workspace <path>', 'Workspace path (default: current directory)')
    .option('-o, --output <file>', 'Output file path (default: stdout)')
    .action(async (options) => {
      const db = getDb();

      let sessionId = options.session;

      if (!sessionId) {
        const workspacePath = getWorkspacePath(options.workspace);
        const currentSession = db.getCurrentSession(workspacePath);

        if (!currentSession) {
          console.error(chalk.red('No active session found'));
          process.exit(1);
        }

        sessionId = currentSession.id;
      }

      const session = db.getSession(sessionId);
      if (!session) {
        console.error(chalk.red('Session not found'));
        process.exit(1);
      }

      const events = db.listEvents(sessionId);

      const exportData = {
        session,
        events,
        exported_at: new Date().toISOString(),
      };

      const json = JSON.stringify(exportData, null, 2);

      if (options.output) {
        const outputPath = getAbsolutePath(options.output);
        fs.writeFileSync(outputPath, json, 'utf-8');
        console.log(chalk.green('✓ Exported to:'), outputPath);
      } else {
        console.log(json);
      }
    });

  program
    .command('export:file <file_path>')
    .description('Export file history as JSON')
    .option('-o, --output <file>', 'Output file path (default: stdout)')
    .action(async (filePath, options) => {
      const db = getDb();
      const absolutePath = getAbsolutePath(filePath);

      const history = db.getFileHistory(absolutePath);

      const exportData = {
        file_path: absolutePath,
        history,
        exported_at: new Date().toISOString(),
      };

      const json = JSON.stringify(exportData, null, 2);

      if (options.output) {
        const outputPath = getAbsolutePath(options.output);
        fs.writeFileSync(outputPath, json, 'utf-8');
        console.log(chalk.green('✓ Exported to:'), outputPath);
      } else {
        console.log(json);
      }
    });
}
