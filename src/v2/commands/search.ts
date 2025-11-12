/**
 * Search commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getDb } from '../cli.js';
import { formatTimestamp, truncate } from '../utils.js';
import { EventType } from '../types.js';

export function registerSearchCommands(program: Command): void {
  program
    .command('search <query>')
    .description('Full-text search events')
    .option('-s, --session <id>', 'Filter by session ID')
    .option('-t, --type <type>', 'Filter by event type')
    .option('--json', 'Output as JSON')
    .action(async (query, options) => {
      const db = getDb();

      const results = db.searchEvents(
        query,
        options.session,
        options.type as EventType
      );

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      if (results.length === 0) {
        console.log(chalk.gray(`No results found for: ${query}`));
        return;
      }

      console.log(chalk.bold(`Search Results (${results.length})`));
      console.log(chalk.gray(`Query: ${query}`));
      console.log();

      for (const result of results) {
        const timestamp = chalk.gray(formatTimestamp(result.timestamp));
        const type = getEventTypeColor(result.type);
        const sessionShort = chalk.gray(result.session_id.slice(0, 8));

        console.log(`${timestamp} ${sessionShort} ${type}`);

        // Display event data based on type
        if (result.type === 'user_message' || result.type === 'assistant_message') {
          const data = result.data as any;
          console.log(chalk.white(`  ${truncate(data.content, 100)}`));
        } else if (result.type === 'thinking') {
          const data = result.data as any;
          console.log(chalk.yellow(`  ${truncate(data.content, 100)}`));
        } else if (result.type === 'code_intention') {
          const data = result.data as any;
          console.log(chalk.cyan(`  ${data.action} ${data.file_path}`));
          console.log(chalk.gray(`  Reason: ${truncate(data.reason, 80)}`));
        } else if (result.type === 'file_edit') {
          const data = result.data as any;
          console.log(chalk.cyan(`  ${data.action} ${data.file_path}`));
        } else if (result.type === 'tool_use') {
          const data = result.data as any;
          console.log(chalk.magenta(`  ${data.tool}`));
        }

        console.log(chalk.gray(`  Session: ${result.session.workspace_path}`));
        console.log();
      }
    });
}

function getEventTypeColor(type: EventType): string {
  switch (type) {
    case 'user_message':
      return chalk.blue('[user]');
    case 'assistant_message':
      return chalk.green('[assistant]');
    case 'thinking':
      return chalk.yellow('[thinking]');
    case 'code_intention':
      return chalk.cyan('[intention]');
    case 'file_edit':
      return chalk.cyan('[edit]');
    case 'tool_use':
      return chalk.magenta('[tool]');
    default:
      return chalk.gray(`[${type}]`);
  }
}
