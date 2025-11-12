#!/usr/bin/env node
"use strict";
/**
 * ptta v2.0 CLI
 * AIのための外部記憶装置
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.closeDb = closeDb;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const database_js_1 = require("./database.js");
// Commands
const session_js_1 = require("./commands/session.js");
const log_js_1 = require("./commands/log.js");
const history_js_1 = require("./commands/history.js");
const search_js_1 = require("./commands/search.js");
const file_js_1 = require("./commands/file.js");
const stats_js_1 = require("./commands/stats.js");
const export_js_1 = require("./commands/export.js");
const program = new commander_1.Command();
program
    .name('ptta')
    .description('AI-first external memory for Claude Code')
    .version('2.0.0');
// Global database instance (created lazily)
let db = null;
function getDb() {
    if (!db) {
        db = new database_js_1.PttaDatabase();
    }
    return db;
}
function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}
// Register all command groups
(0, session_js_1.registerSessionCommands)(program);
(0, log_js_1.registerLogCommands)(program);
(0, history_js_1.registerHistoryCommands)(program);
(0, search_js_1.registerSearchCommands)(program);
(0, file_js_1.registerFileCommands)(program);
(0, stats_js_1.registerStatsCommand)(program);
(0, export_js_1.registerExportCommands)(program);
// Error handling
program.exitOverride();
async function main() {
    try {
        await program.parseAsync(process.argv);
    }
    catch (error) {
        if (error.code !== 'commander.help' && error.code !== 'commander.version') {
            console.error(chalk_1.default.red('Error:'), error.message);
            if (process.env.DEBUG) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    }
    finally {
        closeDb();
    }
}
main();
//# sourceMappingURL=cli.js.map