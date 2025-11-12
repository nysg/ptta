"use strict";
/**
 * Search commands
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSearchCommands = registerSearchCommands;
const chalk_1 = __importDefault(require("chalk"));
const cli_js_1 = require("../cli.js");
const utils_js_1 = require("../utils.js");
function registerSearchCommands(program) {
    program
        .command('search <query>')
        .description('Full-text search events')
        .option('-s, --session <id>', 'Filter by session ID')
        .option('-t, --type <type>', 'Filter by event type')
        .option('--json', 'Output as JSON')
        .action(async (query, options) => {
        const db = (0, cli_js_1.getDb)();
        const results = db.searchEvents(query, options.session, options.type);
        if (options.json) {
            console.log(JSON.stringify(results, null, 2));
            return;
        }
        if (results.length === 0) {
            console.log(chalk_1.default.gray(`No results found for: ${query}`));
            return;
        }
        console.log(chalk_1.default.bold(`Search Results (${results.length})`));
        console.log(chalk_1.default.gray(`Query: ${query}`));
        console.log();
        for (const result of results) {
            const timestamp = chalk_1.default.gray((0, utils_js_1.formatTimestamp)(result.timestamp));
            const type = getEventTypeColor(result.type);
            const sessionShort = chalk_1.default.gray(result.session_id.slice(0, 8));
            console.log(`${timestamp} ${sessionShort} ${type}`);
            // Display event data based on type
            if (result.type === 'user_message' || result.type === 'assistant_message') {
                const data = result.data;
                console.log(chalk_1.default.white(`  ${(0, utils_js_1.truncate)(data.content, 100)}`));
            }
            else if (result.type === 'thinking') {
                const data = result.data;
                console.log(chalk_1.default.yellow(`  ${(0, utils_js_1.truncate)(data.content, 100)}`));
            }
            else if (result.type === 'code_intention') {
                const data = result.data;
                console.log(chalk_1.default.cyan(`  ${data.action} ${data.file_path}`));
                console.log(chalk_1.default.gray(`  Reason: ${(0, utils_js_1.truncate)(data.reason, 80)}`));
            }
            else if (result.type === 'file_edit') {
                const data = result.data;
                console.log(chalk_1.default.cyan(`  ${data.action} ${data.file_path}`));
            }
            else if (result.type === 'tool_use') {
                const data = result.data;
                console.log(chalk_1.default.magenta(`  ${data.tool}`));
            }
            console.log(chalk_1.default.gray(`  Session: ${result.session.workspace_path}`));
            console.log();
        }
    });
}
function getEventTypeColor(type) {
    switch (type) {
        case 'user_message':
            return chalk_1.default.blue('[user]');
        case 'assistant_message':
            return chalk_1.default.green('[assistant]');
        case 'thinking':
            return chalk_1.default.yellow('[thinking]');
        case 'code_intention':
            return chalk_1.default.cyan('[intention]');
        case 'file_edit':
            return chalk_1.default.cyan('[edit]');
        case 'tool_use':
            return chalk_1.default.magenta('[tool]');
        default:
            return chalk_1.default.gray(`[${type}]`);
    }
}
//# sourceMappingURL=search.js.map