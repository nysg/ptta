#!/usr/bin/env node

/**
 * ptta v2.0 CLI
 * AIのための外部記憶装置
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { PttaDatabase } from './database.js';
import { getWorkspacePath } from './utils.js';

// Commands
import { registerSessionCommands } from './commands/session.js';
import { registerLogCommands } from './commands/log.js';
import { registerHistoryCommands } from './commands/history.js';
import { registerSearchCommands } from './commands/search.js';
import { registerFileCommands } from './commands/file.js';
import { registerStatsCommand } from './commands/stats.js';
import { registerExportCommands } from './commands/export.js';

const program = new Command();

program
  .name('ptta')
  .description('AI-first external memory for Claude Code')
  .version('2.0.0');

// Global database instance (created lazily)
let db: PttaDatabase | null = null;

export function getDb(): PttaDatabase {
  if (!db) {
    db = new PttaDatabase();
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Register all command groups
registerSessionCommands(program);
registerLogCommands(program);
registerHistoryCommands(program);
registerSearchCommands(program);
registerFileCommands(program);
registerStatsCommand(program);
registerExportCommands(program);

// Error handling
program.exitOverride();

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error: any) {
    if (error.code !== 'commander.help' && error.code !== 'commander.version') {
      console.error(chalk.red('Error:'), error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  } finally {
    closeDb();
  }
}

main();
