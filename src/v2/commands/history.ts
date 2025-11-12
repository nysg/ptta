/**
 * History display commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getDb } from '../cli.js';
import { getWorkspacePath, formatTimestamp, truncate } from '../utils.js';
import { EventType } from '../types.js';

export function registerHistoryCommands(program: Command): void {
  program
    .command('history')
    .description('Show event history')
    .option('-s, --session <id>', 'Session ID (default: current active session)')
    .option('-w, --workspace <path>', 'Workspace path (default: current directory)')
    .option('-t, --type <type>', 'Filter by event type')
    .option('-l, --limit <number>', 'Limit number of events', parseInt, 50)
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const db = getDb();

      let events;

      if (options.session) {
        // Show events from specific session
        events = db.listEvents(options.session, options.type as EventType, options.limit);
      } else {
        // Show recent events
        events = db.getRecentEvents(options.limit, options.type as EventType);
      }

      if (options.json) {
        console.log(JSON.stringify(events, null, 2));
        return;
      }

      if (events.length === 0) {
        console.log(chalk.gray('No events found'));
        return;
      }

      console.log(chalk.bold(`Event History (${events.length})`));
      console.log();

      for (const event of events) {
        const timestamp = chalk.gray(formatTimestamp(event.timestamp));
        const type = getEventTypeColor(event.type);
        const seq = chalk.gray(`#${event.sequence}`);

        console.log(`${timestamp} ${seq} ${type}`);

        // Display event data based on type
        if (event.type === 'user_message' || event.type === 'assistant_message') {
          const data = event.data as any;
          console.log(chalk.white(`  ${truncate(data.content, 80)}`));
        } else if (event.type === 'thinking') {
          const data = event.data as any;
          const contextStr = data.context ? chalk.gray(`[${data.context}]`) : '';
          console.log(chalk.yellow(`  ${contextStr} ${truncate(data.content, 80)}`));
        } else if (event.type === 'code_intention') {
          const data = event.data as any;
          console.log(chalk.cyan(`  ${data.action} ${data.file_path}`));
          console.log(chalk.gray(`  Reason: ${truncate(data.reason, 80)}`));
        } else if (event.type === 'file_edit') {
          const data = event.data as any;
          const status = data.success ? chalk.green('✓') : chalk.red('✗');
          console.log(`  ${status} ${data.action} ${data.file_path}`);
        } else if (event.type === 'tool_use') {
          const data = event.data as any;
          console.log(chalk.magenta(`  ${data.tool}(${JSON.stringify(data.parameters).slice(0, 50)})`));
        }

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
