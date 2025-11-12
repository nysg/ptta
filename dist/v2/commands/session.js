"use strict";
/**
 * Session management commands
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSessionCommands = registerSessionCommands;
const chalk_1 = __importDefault(require("chalk"));
const cli_js_1 = require("../cli.js");
const utils_js_1 = require("../utils.js");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
function registerSessionCommands(program) {
    // session:start
    program
        .command('session:start')
        .description('Start a new session')
        .option('-w, --workspace <path>', 'Workspace path (default: current directory)')
        .option('-b, --branch <branch>', 'Git branch name')
        .option('-t, --tags <tags>', 'Comma-separated tags')
        .action(async (options) => {
        const db = (0, cli_js_1.getDb)();
        const workspacePath = (0, utils_js_1.getWorkspacePath)(options.workspace);
        // Get git branch if not provided
        let branch = options.branch;
        if (!branch) {
            try {
                const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
                    cwd: workspacePath,
                });
                branch = stdout.trim();
            }
            catch {
                // Not a git repo, ignore
            }
        }
        const metadata = {};
        if (branch)
            metadata.branch = branch;
        if (options.tags)
            metadata.tags = options.tags.split(',').map((t) => t.trim());
        const session = db.createSession({
            workspace_path: workspacePath,
            metadata,
        });
        console.log(chalk_1.default.green('✓ Session started'));
        console.log(chalk_1.default.gray('  ID:'), session.id);
        console.log(chalk_1.default.gray('  Workspace:'), session.workspace_path);
        if (branch)
            console.log(chalk_1.default.gray('  Branch:'), branch);
        if (metadata.tags)
            console.log(chalk_1.default.gray('  Tags:'), metadata.tags.join(', '));
    });
    // session:end
    program
        .command('session:end')
        .description('End the current session')
        .option('-s, --session <id>', 'Session ID (default: current active session)')
        .option('-w, --workspace <path>', 'Workspace path (default: current directory)')
        .action(async (options) => {
        const db = (0, cli_js_1.getDb)();
        const workspacePath = (0, utils_js_1.getWorkspacePath)(options.workspace);
        let sessionId = options.session;
        if (!sessionId) {
            // Find current active session
            const currentSession = db.getCurrentSession(workspacePath);
            if (!currentSession) {
                console.error(chalk_1.default.red('No active session found'));
                process.exit(1);
            }
            sessionId = currentSession.id;
        }
        const session = db.endSession(sessionId);
        if (!session) {
            console.error(chalk_1.default.red('Session not found'));
            process.exit(1);
        }
        console.log(chalk_1.default.green('✓ Session ended'));
        console.log(chalk_1.default.gray('  ID:'), session.id);
        console.log(chalk_1.default.gray('  Started:'), (0, utils_js_1.formatTimestamp)(session.started_at));
        console.log(chalk_1.default.gray('  Ended:'), (0, utils_js_1.formatTimestamp)(session.ended_at));
    });
    // session:list
    program
        .command('session:list')
        .description('List sessions')
        .option('-w, --workspace <path>', 'Filter by workspace path')
        .option('-a, --active', 'Show only active sessions')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
        const db = (0, cli_js_1.getDb)();
        const workspacePath = options.workspace ? (0, utils_js_1.getWorkspacePath)(options.workspace) : undefined;
        const sessions = db.listSessions(workspacePath, options.active);
        if (options.json) {
            console.log(JSON.stringify(sessions, null, 2));
            return;
        }
        if (sessions.length === 0) {
            console.log(chalk_1.default.gray('No sessions found'));
            return;
        }
        console.log(chalk_1.default.bold(`Sessions (${sessions.length})`));
        console.log();
        for (const session of sessions) {
            const status = session.ended_at ? chalk_1.default.gray('[ended]') : chalk_1.default.green('[active]');
            console.log(`${status} ${chalk_1.default.cyan(session.id.slice(0, 8))}`);
            console.log(chalk_1.default.gray('  Workspace:'), session.workspace_path);
            console.log(chalk_1.default.gray('  Started:'), (0, utils_js_1.formatTimestamp)(session.started_at));
            if (session.ended_at) {
                console.log(chalk_1.default.gray('  Ended:'), (0, utils_js_1.formatTimestamp)(session.ended_at));
            }
            console.log(chalk_1.default.gray('  Events:'), session.event_count);
            if (session.metadata.branch) {
                console.log(chalk_1.default.gray('  Branch:'), session.metadata.branch);
            }
            console.log();
        }
    });
    // session:show
    program
        .command('session:show <id>')
        .description('Show session details')
        .option('--json', 'Output as JSON')
        .action(async (id, options) => {
        const db = (0, cli_js_1.getDb)();
        const session = db.getSession(id);
        if (!session) {
            console.error(chalk_1.default.red('Session not found'));
            process.exit(1);
        }
        const events = db.listEvents(id);
        if (options.json) {
            console.log(JSON.stringify({ session, events }, null, 2));
            return;
        }
        const status = session.ended_at ? chalk_1.default.gray('[ended]') : chalk_1.default.green('[active]');
        console.log(`${status} ${chalk_1.default.bold('Session')} ${chalk_1.default.cyan(session.id)}`);
        console.log();
        console.log(chalk_1.default.gray('Workspace:'), session.workspace_path);
        console.log(chalk_1.default.gray('Started:'), (0, utils_js_1.formatTimestamp)(session.started_at));
        if (session.ended_at) {
            console.log(chalk_1.default.gray('Ended:'), (0, utils_js_1.formatTimestamp)(session.ended_at));
        }
        if (session.metadata.branch) {
            console.log(chalk_1.default.gray('Branch:'), session.metadata.branch);
        }
        if (session.metadata.tags && session.metadata.tags.length > 0) {
            console.log(chalk_1.default.gray('Tags:'), session.metadata.tags.join(', '));
        }
        console.log(chalk_1.default.gray('Events:'), events.length);
        console.log();
        // Show event type breakdown
        const eventsByType = {};
        for (const event of events) {
            eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
        }
        console.log(chalk_1.default.bold('Event Types:'));
        for (const [type, count] of Object.entries(eventsByType)) {
            console.log(`  ${chalk_1.default.gray(type)}: ${count}`);
        }
    });
    // session:current
    program
        .command('session:current')
        .description('Show current active session')
        .option('-w, --workspace <path>', 'Workspace path (default: current directory)')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
        const db = (0, cli_js_1.getDb)();
        const workspacePath = (0, utils_js_1.getWorkspacePath)(options.workspace);
        const session = db.getCurrentSession(workspacePath);
        if (!session) {
            if (options.json) {
                console.log('null');
            }
            else {
                console.log(chalk_1.default.gray('No active session'));
            }
            return;
        }
        if (options.json) {
            console.log(JSON.stringify(session, null, 2));
            return;
        }
        console.log(chalk_1.default.green('[active]'), chalk_1.default.bold('Session'), chalk_1.default.cyan(session.id));
        console.log(chalk_1.default.gray('Started:'), (0, utils_js_1.formatTimestamp)(session.started_at));
        if (session.metadata.branch) {
            console.log(chalk_1.default.gray('Branch:'), session.metadata.branch);
        }
    });
}
//# sourceMappingURL=session.js.map