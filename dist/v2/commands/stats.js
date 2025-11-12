"use strict";
/**
 * Statistics command
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStatsCommand = registerStatsCommand;
const chalk_1 = __importDefault(require("chalk"));
const cli_js_1 = require("../cli.js");
const utils_js_1 = require("../utils.js");
function registerStatsCommand(program) {
    program
        .command('stats')
        .description('Show statistics')
        .option('-w, --workspace <path>', 'Filter by workspace path')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
        const db = (0, cli_js_1.getDb)();
        const workspacePath = options.workspace ? (0, utils_js_1.getWorkspacePath)(options.workspace) : undefined;
        const stats = db.getStats(workspacePath);
        if (options.json) {
            console.log(JSON.stringify(stats, null, 2));
            return;
        }
        console.log(chalk_1.default.bold('Statistics'));
        console.log();
        console.log(chalk_1.default.bold('Sessions:'));
        console.log(`  Total: ${stats.sessions.total}`);
        console.log(`  Active: ${chalk_1.default.green(stats.sessions.active)}`);
        console.log(`  Ended: ${chalk_1.default.gray(stats.sessions.ended)}`);
        console.log();
        console.log(chalk_1.default.bold('Events:'));
        console.log(`  Total: ${stats.events.total}`);
        console.log();
        console.log(chalk_1.default.bold('Events by Type:'));
        for (const [type, count] of Object.entries(stats.events.by_type)) {
            const color = getTypeColor(type);
            console.log(`  ${color(type)}: ${count}`);
        }
        console.log();
        console.log(chalk_1.default.bold('Files:'));
        console.log(`  Total Edits: ${stats.files.total_edits}`);
        console.log(`  Unique Files: ${stats.files.unique_files}`);
    });
}
function getTypeColor(type) {
    switch (type) {
        case 'user_message':
            return chalk_1.default.blue;
        case 'assistant_message':
            return chalk_1.default.green;
        case 'thinking':
            return chalk_1.default.yellow;
        case 'code_intention':
        case 'file_edit':
            return chalk_1.default.cyan;
        case 'tool_use':
            return chalk_1.default.magenta;
        default:
            return chalk_1.default.gray;
    }
}
//# sourceMappingURL=stats.js.map