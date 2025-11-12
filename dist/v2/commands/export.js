"use strict";
/**
 * Export commands
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerExportCommands = registerExportCommands;
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
const cli_js_1 = require("../cli.js");
const utils_js_1 = require("../utils.js");
function registerExportCommands(program) {
    program
        .command('export')
        .description('Export session data as JSON')
        .option('-s, --session <id>', 'Session ID (default: current active session)')
        .option('-w, --workspace <path>', 'Workspace path (default: current directory)')
        .option('-o, --output <file>', 'Output file path (default: stdout)')
        .action(async (options) => {
        const db = (0, cli_js_1.getDb)();
        let sessionId = options.session;
        if (!sessionId) {
            const workspacePath = (0, utils_js_1.getWorkspacePath)(options.workspace);
            const currentSession = db.getCurrentSession(workspacePath);
            if (!currentSession) {
                console.error(chalk_1.default.red('No active session found'));
                process.exit(1);
            }
            sessionId = currentSession.id;
        }
        const session = db.getSession(sessionId);
        if (!session) {
            console.error(chalk_1.default.red('Session not found'));
            process.exit(1);
        }
        const events = db.listEvents(sessionId);
        const exportData = {
            session,
            events,
            exported_at: new Date().toISOString(),
        };
        const json = JSON.stringify(exportData, null, 2);
        if (options.output) {
            const outputPath = (0, utils_js_1.getAbsolutePath)(options.output);
            fs.writeFileSync(outputPath, json, 'utf-8');
            console.log(chalk_1.default.green('✓ Exported to:'), outputPath);
        }
        else {
            console.log(json);
        }
    });
    program
        .command('export:file <file_path>')
        .description('Export file history as JSON')
        .option('-o, --output <file>', 'Output file path (default: stdout)')
        .action(async (filePath, options) => {
        const db = (0, cli_js_1.getDb)();
        const absolutePath = (0, utils_js_1.getAbsolutePath)(filePath);
        const history = db.getFileHistory(absolutePath);
        const exportData = {
            file_path: absolutePath,
            history,
            exported_at: new Date().toISOString(),
        };
        const json = JSON.stringify(exportData, null, 2);
        if (options.output) {
            const outputPath = (0, utils_js_1.getAbsolutePath)(options.output);
            fs.writeFileSync(outputPath, json, 'utf-8');
            console.log(chalk_1.default.green('✓ Exported to:'), outputPath);
        }
        else {
            console.log(json);
        }
    });
}
//# sourceMappingURL=export.js.map