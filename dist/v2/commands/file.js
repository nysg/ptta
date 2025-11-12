"use strict";
/**
 * File history commands
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFileCommands = registerFileCommands;
const chalk_1 = __importDefault(require("chalk"));
const cli_js_1 = require("../cli.js");
const utils_js_1 = require("../utils.js");
function registerFileCommands(program) {
    program
        .command('file:history <file_path>')
        .description('Show file change history')
        .option('--json', 'Output as JSON')
        .action(async (filePath, options) => {
        const db = (0, cli_js_1.getDb)();
        const absolutePath = (0, utils_js_1.getAbsolutePath)(filePath);
        const history = db.getFileHistory(absolutePath);
        if (options.json) {
            console.log(JSON.stringify(history, null, 2));
            return;
        }
        if (history.length === 0) {
            console.log(chalk_1.default.gray(`No history found for: ${absolutePath}`));
            return;
        }
        console.log(chalk_1.default.bold(`File History (${history.length})`));
        console.log(chalk_1.default.gray(`File: ${absolutePath}`));
        console.log();
        for (const entry of history) {
            const timestamp = chalk_1.default.gray((0, utils_js_1.formatTimestamp)(entry.timestamp));
            const action = getActionColor(entry.action);
            console.log(`${timestamp} ${action}`);
            if (entry.reason) {
                console.log(chalk_1.default.gray(`  Reason: ${entry.reason}`));
            }
            if (entry.diff) {
                // Show first few lines of diff
                const diffLines = entry.diff.split('\n').slice(0, 10);
                for (const line of diffLines) {
                    if (line.startsWith('+')) {
                        console.log(chalk_1.default.green(`  ${line}`));
                    }
                    else if (line.startsWith('-')) {
                        console.log(chalk_1.default.red(`  ${line}`));
                    }
                    else {
                        console.log(chalk_1.default.gray(`  ${line}`));
                    }
                }
                if (entry.diff.split('\n').length > 10) {
                    console.log(chalk_1.default.gray(`  ... (truncated)`));
                }
            }
            console.log();
        }
    });
}
function getActionColor(action) {
    switch (action) {
        case 'create':
            return chalk_1.default.green('[create]');
        case 'edit':
            return chalk_1.default.yellow('[edit]');
        case 'delete':
            return chalk_1.default.red('[delete]');
        default:
            return chalk_1.default.gray(`[${action}]`);
    }
}
//# sourceMappingURL=file.js.map