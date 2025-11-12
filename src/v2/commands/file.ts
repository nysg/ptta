/**
 * File history commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getDb } from '../cli.js';
import { getAbsolutePath, formatTimestamp } from '../utils.js';

export function registerFileCommands(program: Command): void {
  program
    .command('file:history <file_path>')
    .description('Show file change history')
    .option('--json', 'Output as JSON')
    .action(async (filePath, options) => {
      const db = getDb();
      const absolutePath = getAbsolutePath(filePath);

      const history = db.getFileHistory(absolutePath);

      if (options.json) {
        console.log(JSON.stringify(history, null, 2));
        return;
      }

      if (history.length === 0) {
        console.log(chalk.gray(`No history found for: ${absolutePath}`));
        return;
      }

      console.log(chalk.bold(`File History (${history.length})`));
      console.log(chalk.gray(`File: ${absolutePath}`));
      console.log();

      for (const entry of history) {
        const timestamp = chalk.gray(formatTimestamp(entry.timestamp));
        const action = getActionColor(entry.action);

        console.log(`${timestamp} ${action}`);

        if (entry.reason) {
          console.log(chalk.gray(`  Reason: ${entry.reason}`));
        }

        if (entry.diff) {
          // Show first few lines of diff
          const diffLines = entry.diff.split('\n').slice(0, 10);
          for (const line of diffLines) {
            if (line.startsWith('+')) {
              console.log(chalk.green(`  ${line}`));
            } else if (line.startsWith('-')) {
              console.log(chalk.red(`  ${line}`));
            } else {
              console.log(chalk.gray(`  ${line}`));
            }
          }

          if (entry.diff.split('\n').length > 10) {
            console.log(chalk.gray(`  ... (truncated)`));
          }
        }

        console.log();
      }
    });
}

function getActionColor(action: string): string {
  switch (action) {
    case 'create':
      return chalk.green('[create]');
    case 'edit':
      return chalk.yellow('[edit]');
    case 'delete':
      return chalk.red('[delete]');
    default:
      return chalk.gray(`[${action}]`);
  }
}
