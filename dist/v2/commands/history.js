"use strict";
/**
 * History display commands
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHistoryCommands = registerHistoryCommands;
const chalk_1 = __importDefault(require("chalk"));
const cli_js_1 = require("../cli.js");
const utils_js_1 = require("../utils.js");
function registerHistoryCommands(program) {
    program
        .command('history')
        .description('Show event history')
        .option('-s, --session <id>', 'Session ID (default: current active session)')
        .option('-w, --workspace <path>', 'Workspace path (default: current directory)')
        .option('-t, --type <type>', 'Filter by event type')
        .option('-l, --limit <number>', 'Limit number of events', parseInt, 50)
        .option('--json', 'Output as JSON')
        .action(async (options) => {
        const db = (0, cli_js_1.getDb)();
        // Ensure limit is a number
        const limit = typeof options.limit === 'number' ? options.limit : parseInt(options.limit || '50', 10);
        let events;
        if (options.session) {
            // Show events from specific session
            events = db.listEvents(options.session, options.type, limit);
        }
        else {
            // Show recent events
            events = db.getRecentEvents(limit, options.type);
        }
        if (options.json) {
            console.log(JSON.stringify(events, null, 2));
            return;
        }
        if (events.length === 0) {
            console.log(chalk_1.default.gray('No events found'));
            return;
        }
        console.log(chalk_1.default.bold(`Event History (${events.length})`));
        console.log();
        for (const event of events) {
            const timestamp = chalk_1.default.gray((0, utils_js_1.formatTimestamp)(event.timestamp));
            const type = getEventTypeColor(event.type);
            const seq = chalk_1.default.gray(`#${event.sequence}`);
            console.log(`${timestamp} ${seq} ${type}`);
            // Display event data based on type
            if (event.type === 'user_message' || event.type === 'assistant_message') {
                const data = event.data;
                console.log(chalk_1.default.white(`  ${(0, utils_js_1.truncate)(data.content, 80)}`));
            }
            else if (event.type === 'thinking') {
                const data = event.data;
                const contextStr = data.context ? chalk_1.default.gray(`[${data.context}]`) : '';
                console.log(chalk_1.default.yellow(`  ${contextStr} ${(0, utils_js_1.truncate)(data.content, 80)}`));
            }
            else if (event.type === 'code_intention') {
                const data = event.data;
                console.log(chalk_1.default.cyan(`  ${data.action} ${data.file_path}`));
                console.log(chalk_1.default.gray(`  Reason: ${(0, utils_js_1.truncate)(data.reason, 80)}`));
            }
            else if (event.type === 'file_edit') {
                const data = event.data;
                const status = data.success ? chalk_1.default.green('✓') : chalk_1.default.red('✗');
                console.log(`  ${status} ${data.action} ${data.file_path}`);
            }
            else if (event.type === 'tool_use') {
                const data = event.data;
                console.log(chalk_1.default.magenta(`  ${data.tool}(${JSON.stringify(data.parameters).slice(0, 50)})`));
            }
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
//# sourceMappingURL=history.js.map