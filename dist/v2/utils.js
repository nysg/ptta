"use strict";
/**
 * ptta v2.0 Utility Functions
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDiff = generateDiff;
exports.readFileSync = readFileSync;
exports.writeFileSync = writeFileSync;
exports.fileExists = fileExists;
exports.getAbsolutePath = getAbsolutePath;
exports.getWorkspacePath = getWorkspacePath;
exports.formatTimestamp = formatTimestamp;
exports.truncate = truncate;
exports.getFileName = getFileName;
exports.ensureDir = ensureDir;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const diff_1 = require("diff");
/**
 * Generate unified diff between two strings
 */
function generateDiff(oldContent, newContent, filePath = 'file') {
    const patch = (0, diff_1.createTwoFilesPatch)(filePath, filePath, oldContent, newContent, 'before', 'after');
    return patch;
}
/**
 * Read file content (synchronous)
 */
function readFileSync(filePath) {
    return fs.readFileSync(filePath, 'utf-8');
}
/**
 * Write file content (synchronous)
 */
function writeFileSync(filePath, content) {
    fs.writeFileSync(filePath, content, 'utf-8');
}
/**
 * Check if file exists
 */
function fileExists(filePath) {
    return fs.existsSync(filePath);
}
/**
 * Get absolute path
 */
function getAbsolutePath(filePath) {
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}
/**
 * Get workspace path (current directory or specified path)
 */
function getWorkspacePath(providedPath) {
    if (providedPath) {
        return getAbsolutePath(providedPath);
    }
    return process.cwd();
}
/**
 * Format timestamp for display
 */
function formatTimestamp(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString();
}
/**
 * Truncate string to max length
 */
function truncate(str, maxLength) {
    if (str.length <= maxLength)
        return str;
    return str.slice(0, maxLength - 3) + '...';
}
/**
 * Extract file name from path
 */
function getFileName(filePath) {
    return path.basename(filePath);
}
/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
//# sourceMappingURL=utils.js.map