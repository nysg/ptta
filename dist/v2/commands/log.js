"use strict";
/**
 * Event logging commands
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLogCommands = registerLogCommands;
const chalk_1 = __importDefault(require("chalk"));
const cli_js_1 = require("../cli.js");
const utils_js_1 = require("../utils.js");
const file_editor_js_1 = require("../file-editor.js");
function getCurrentSessionId(workspacePath) {
    const db = (0, cli_js_1.getDb)();
    const session = db.getCurrentSession(workspacePath);
    if (!session) {
        console.error(chalk_1.default.red('No active session. Start a session with:'));
        console.error(chalk_1.default.gray('  ptta session:start'));
        process.exit(1);
    }
    return session.id;
}
function registerLogCommands(program) {
    // log:user
    program
        .command('log:user <message>')
        .description('Log user message')
        .option('-s, --session <id>', 'Session ID (default: current active session)')
        .option('-w, --workspace <path>', 'Workspace path (default: current directory)')
        .action(async (message, options) => {
        const db = (0, cli_js_1.getDb)();
        const workspacePath = (0, utils_js_1.getWorkspacePath)(options.workspace);
        const sessionId = options.session || getCurrentSessionId(workspacePath);
        db.createEvent({
            session_id: sessionId,
            type: 'user_message',
            data: { content: message },
        });
        console.log(chalk_1.default.green('✓ User message logged'));
    });
    // log:assistant
    program
        .command('log:assistant <message>')
        .description('Log assistant message')
        .option('-s, --session <id>', 'Session ID (default: current active session)')
        .option('-w, --workspace <path>', 'Workspace path (default: current directory)')
        .option('--tools <json>', 'Tool calls (JSON array)')
        .action(async (message, options) => {
        const db = (0, cli_js_1.getDb)();
        const workspacePath = (0, utils_js_1.getWorkspacePath)(options.workspace);
        const sessionId = options.session || getCurrentSessionId(workspacePath);
        const data = { content: message };
        if (options.tools) {
            try {
                data.tool_calls = JSON.parse(options.tools);
            }
            catch (error) {
                console.error(chalk_1.default.red('Invalid JSON for --tools'));
                process.exit(1);
            }
        }
        db.createEvent({
            session_id: sessionId,
            type: 'assistant_message',
            data,
        });
        console.log(chalk_1.default.green('✓ Assistant message logged'));
    });
    // log:thinking
    program
        .command('log:thinking <content>')
        .description('Log thinking process')
        .option('-s, --session <id>', 'Session ID (default: current active session)')
        .option('-w, --workspace <path>', 'Workspace path (default: current directory)')
        .option('-c, --context <context>', 'Context of thinking')
        .action(async (content, options) => {
        const db = (0, cli_js_1.getDb)();
        const workspacePath = (0, utils_js_1.getWorkspacePath)(options.workspace);
        const sessionId = options.session || getCurrentSessionId(workspacePath);
        const data = { content };
        if (options.context) {
            data.context = options.context;
        }
        db.createEvent({
            session_id: sessionId,
            type: 'thinking',
            data,
        });
        console.log(chalk_1.default.green('✓ Thinking logged'));
    });
    // log:intention
    program
        .command('log:intention <file_path>')
        .description('Log code change intention (before edit)')
        .requiredOption('-r, --reason <reason>', 'Reason for the change')
        .option('-s, --session <id>', 'Session ID (default: current active session)')
        .option('-w, --workspace <path>', 'Workspace path (default: current directory)')
        .option('-a, --action <action>', 'Action type (create|edit|delete)', 'edit')
        .action(async (filePath, options) => {
        const db = (0, cli_js_1.getDb)();
        const workspacePath = (0, utils_js_1.getWorkspacePath)(options.workspace);
        const sessionId = options.session || getCurrentSessionId(workspacePath);
        const absolutePath = (0, utils_js_1.getAbsolutePath)(filePath);
        const action = options.action;
        let oldContent;
        if ((0, utils_js_1.fileExists)(absolutePath) && action !== 'create') {
            oldContent = (0, utils_js_1.readFileSync)(absolutePath);
        }
        const editor = new file_editor_js_1.FileEditor(db);
        const intentionId = editor.recordIntention(sessionId, absolutePath, action, options.reason, oldContent);
        console.log(chalk_1.default.green('✓ Intention logged'));
        console.log(chalk_1.default.gray('  File:'), absolutePath);
        console.log(chalk_1.default.gray('  Action:'), action);
        console.log(chalk_1.default.gray('  Reason:'), options.reason);
        console.log(chalk_1.default.gray('  ID:'), intentionId);
    });
    // log:edit
    program
        .command('log:edit <file_path>')
        .description('Log file edit result (after edit)')
        .option('-s, --session <id>', 'Session ID (default: current active session)')
        .option('-w, --workspace <path>', 'Workspace path (default: current directory)')
        .option('-a, --action <action>', 'Action type (create|edit|delete)', 'edit')
        .option('-i, --intention <id>', 'Intention event ID')
        .option('--success', 'Edit was successful', true)
        .option('--error <message>', 'Error message if failed')
        .action(async (filePath, options) => {
        const db = (0, cli_js_1.getDb)();
        const workspacePath = (0, utils_js_1.getWorkspacePath)(options.workspace);
        const sessionId = options.session || getCurrentSessionId(workspacePath);
        const absolutePath = (0, utils_js_1.getAbsolutePath)(filePath);
        const action = options.action;
        const editor = new file_editor_js_1.FileEditor(db);
        const editId = editor.recordEdit(sessionId, absolutePath, action, options.intention, options.success, options.error);
        console.log(chalk_1.default.green('✓ Edit logged'));
        console.log(chalk_1.default.gray('  File:'), absolutePath);
        console.log(chalk_1.default.gray('  Action:'), action);
        if (options.intention) {
            console.log(chalk_1.default.gray('  Intention ID:'), options.intention);
        }
        console.log(chalk_1.default.gray('  ID:'), editId);
    });
    // log:tool
    program
        .command('log:tool <tool_name>')
        .description('Log tool usage')
        .option('-s, --session <id>', 'Session ID (default: current active session)')
        .option('-w, --workspace <path>', 'Workspace path (default: current directory)')
        .option('-p, --params <json>', 'Tool parameters (JSON)')
        .option('-r, --result <json>', 'Tool result (JSON)')
        .option('-d, --duration <ms>', 'Duration in milliseconds', parseInt)
        .option('--success', 'Tool execution was successful', true)
        .action(async (toolName, options) => {
        const db = (0, cli_js_1.getDb)();
        const workspacePath = (0, utils_js_1.getWorkspacePath)(options.workspace);
        const sessionId = options.session || getCurrentSessionId(workspacePath);
        const data = {
            tool: toolName,
            parameters: {},
        };
        if (options.params) {
            try {
                data.parameters = JSON.parse(options.params);
            }
            catch (error) {
                console.error(chalk_1.default.red('Invalid JSON for --params'));
                process.exit(1);
            }
        }
        if (options.result) {
            try {
                data.result = JSON.parse(options.result);
            }
            catch (error) {
                console.error(chalk_1.default.red('Invalid JSON for --result'));
                process.exit(1);
            }
        }
        if (options.duration) {
            data.duration_ms = options.duration;
        }
        data.success = options.success;
        db.createEvent({
            session_id: sessionId,
            type: 'tool_use',
            data,
        });
        console.log(chalk_1.default.green('✓ Tool use logged'));
        console.log(chalk_1.default.gray('  Tool:'), toolName);
    });
}
//# sourceMappingURL=log.js.map