"use strict";
/**
 * WebUI command
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWebCommand = registerWebCommand;
const web_js_1 = require("../web.js");
function registerWebCommand(program) {
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
        (0, web_js_1.startWebServer)(port);
    });
}
//# sourceMappingURL=web.js.map