/**
 * WebUI command
 */

import { Command } from 'commander';
import { startWebServer } from '../web.js';

export function registerWebCommand(program: Command): void {
  program
    .command('web')
    .description('Start WebUI server')
    .option('-p, --port <port>', 'Port number (default: 3737)', '3737')
    .action((options) => {
      const port = parseInt(options.port, 10);

      if (isNaN(port) || port < 1 || port > 65535) {
        console.error('Error: Invalid port number. Must be between 1 and 65535.');
        process.exit(1);
      }

      startWebServer(port);
    });
}
