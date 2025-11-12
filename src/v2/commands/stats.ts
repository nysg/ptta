/**
 * Statistics command
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getDb } from '../cli.js';
import { getWorkspacePath } from '../utils.js';

export function registerStatsCommand(program: Command): void {
  program
    .command('stats')
    .description('Show statistics')
    .option('-w, --workspace <path>', 'Filter by workspace path')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const db = getDb();
      const workspacePath = options.workspace ? getWorkspacePath(options.workspace) : undefined;

      const stats = db.getStats(workspacePath);

      if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
        return;
      }

      console.log(chalk.bold('Statistics'));
      console.log();

      console.log(chalk.bold('Sessions:'));
      console.log(`  Total: ${stats.sessions.total}`);
      console.log(`  Active: ${chalk.green(stats.sessions.active)}`);
      console.log(`  Ended: ${chalk.gray(stats.sessions.ended)}`);
      console.log();

      console.log(chalk.bold('Events:'));
      console.log(`  Total: ${stats.events.total}`);
      console.log();

      console.log(chalk.bold('Events by Type:'));
      for (const [type, count] of Object.entries(stats.events.by_type)) {
        const color = getTypeColor(type);
        console.log(`  ${color(type)}: ${count}`);
      }
      console.log();

      console.log(chalk.bold('Files:'));
      console.log(`  Total Edits: ${stats.files.total_edits}`);
      console.log(`  Unique Files: ${stats.files.unique_files}`);
    });
}

function getTypeColor(type: string): (text: string) => string {
  switch (type) {
    case 'user_message':
      return chalk.blue;
    case 'assistant_message':
      return chalk.green;
    case 'thinking':
      return chalk.yellow;
    case 'code_intention':
    case 'file_edit':
      return chalk.cyan;
    case 'tool_use':
      return chalk.magenta;
    default:
      return chalk.gray;
  }
}
