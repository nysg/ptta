"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const errors_1 = require("../errors");
(0, vitest_1.describe)('PttaError', () => {
    (0, vitest_1.it)('正しいメッセージとコードでエラーを作成する', () => {
        const error = new errors_1.PttaError('Test error', 'TEST_CODE');
        (0, vitest_1.expect)(error.message).toBe('Test error');
        (0, vitest_1.expect)(error.code).toBe('TEST_CODE');
        (0, vitest_1.expect)(error.name).toBe('PttaError');
    });
    (0, vitest_1.it)('コードなしでエラーを作成できる', () => {
        const error = new errors_1.PttaError('Test error');
        (0, vitest_1.expect)(error.message).toBe('Test error');
        (0, vitest_1.expect)(error.code).toBeUndefined();
    });
    (0, vitest_1.it)('Errorのインスタンスである', () => {
        const error = new errors_1.PttaError('Test error');
        (0, vitest_1.expect)(error instanceof Error).toBe(true);
        (0, vitest_1.expect)(error instanceof errors_1.PttaError).toBe(true);
    });
});
(0, vitest_1.describe)('DatabaseError', () => {
    (0, vitest_1.it)('正しいメッセージで作成される', () => {
        const error = new errors_1.DatabaseError('Database connection failed');
        (0, vitest_1.expect)(error.message).toBe('Database connection failed');
        (0, vitest_1.expect)(error.code).toBe('DB_ERROR');
        (0, vitest_1.expect)(error.name).toBe('DatabaseError');
    });
    (0, vitest_1.it)('元のエラーを保持できる', () => {
        const originalError = new Error('Original error');
        const error = new errors_1.DatabaseError('Database error', originalError);
        (0, vitest_1.expect)(error.originalError).toBe(originalError);
    });
    (0, vitest_1.it)('PttaErrorのインスタンスである', () => {
        const error = new errors_1.DatabaseError('Database error');
        (0, vitest_1.expect)(error instanceof errors_1.PttaError).toBe(true);
        (0, vitest_1.expect)(error instanceof errors_1.DatabaseError).toBe(true);
    });
});
(0, vitest_1.describe)('ValidationError', () => {
    (0, vitest_1.it)('正しいメッセージとフィールド名で作成される', () => {
        const error = new errors_1.ValidationError('Invalid value', 'username');
        (0, vitest_1.expect)(error.message).toBe('Invalid value');
        (0, vitest_1.expect)(error.code).toBe('VALIDATION_ERROR');
        (0, vitest_1.expect)(error.field).toBe('username');
        (0, vitest_1.expect)(error.name).toBe('ValidationError');
    });
    (0, vitest_1.it)('フィールド名なしで作成できる', () => {
        const error = new errors_1.ValidationError('Invalid value');
        (0, vitest_1.expect)(error.message).toBe('Invalid value');
        (0, vitest_1.expect)(error.field).toBeUndefined();
    });
    (0, vitest_1.it)('PttaErrorのインスタンスである', () => {
        const error = new errors_1.ValidationError('Invalid value');
        (0, vitest_1.expect)(error instanceof errors_1.PttaError).toBe(true);
        (0, vitest_1.expect)(error instanceof errors_1.ValidationError).toBe(true);
    });
});
(0, vitest_1.describe)('NotFoundError', () => {
    (0, vitest_1.it)('リソース名とIDで正しいメッセージを生成する', () => {
        const error = new errors_1.NotFoundError('Project', 123);
        (0, vitest_1.expect)(error.message).toBe('Project with ID 123 not found');
        (0, vitest_1.expect)(error.code).toBe('NOT_FOUND');
        (0, vitest_1.expect)(error.name).toBe('NotFoundError');
    });
    (0, vitest_1.it)('IDなしで正しいメッセージを生成する', () => {
        const error = new errors_1.NotFoundError('Project');
        (0, vitest_1.expect)(error.message).toBe('Project not found');
    });
    (0, vitest_1.it)('文字列IDでも動作する', () => {
        const error = new errors_1.NotFoundError('User', 'abc-123');
        (0, vitest_1.expect)(error.message).toBe('User with ID abc-123 not found');
    });
    (0, vitest_1.it)('PttaErrorのインスタンスである', () => {
        const error = new errors_1.NotFoundError('Project');
        (0, vitest_1.expect)(error instanceof errors_1.PttaError).toBe(true);
        (0, vitest_1.expect)(error instanceof errors_1.NotFoundError).toBe(true);
    });
});
(0, vitest_1.describe)('isError', () => {
    (0, vitest_1.it)('Errorインスタンスに対してtrueを返す', () => {
        (0, vitest_1.expect)((0, errors_1.isError)(new Error('test'))).toBe(true);
        (0, vitest_1.expect)((0, errors_1.isError)(new errors_1.PttaError('test'))).toBe(true);
        (0, vitest_1.expect)((0, errors_1.isError)(new errors_1.DatabaseError('test'))).toBe(true);
    });
    (0, vitest_1.it)('Error以外に対してfalseを返す', () => {
        (0, vitest_1.expect)((0, errors_1.isError)('string')).toBe(false);
        (0, vitest_1.expect)((0, errors_1.isError)(123)).toBe(false);
        (0, vitest_1.expect)((0, errors_1.isError)(null)).toBe(false);
        (0, vitest_1.expect)((0, errors_1.isError)(undefined)).toBe(false);
        (0, vitest_1.expect)((0, errors_1.isError)({})).toBe(false);
    });
});
(0, vitest_1.describe)('getErrorMessage', () => {
    (0, vitest_1.it)('Errorインスタンスからメッセージを取得する', () => {
        const error = new Error('Test error');
        (0, vitest_1.expect)((0, errors_1.getErrorMessage)(error)).toBe('Test error');
    });
    (0, vitest_1.it)('PttaErrorからメッセージを取得する', () => {
        const error = new errors_1.PttaError('Ptta error');
        (0, vitest_1.expect)((0, errors_1.getErrorMessage)(error)).toBe('Ptta error');
    });
    (0, vitest_1.it)('文字列をそのまま返す', () => {
        (0, vitest_1.expect)((0, errors_1.getErrorMessage)('Error string')).toBe('Error string');
    });
    (0, vitest_1.it)('不明なエラーに対してデフォルトメッセージを返す', () => {
        (0, vitest_1.expect)((0, errors_1.getErrorMessage)(123)).toBe('An unknown error occurred');
        (0, vitest_1.expect)((0, errors_1.getErrorMessage)(null)).toBe('An unknown error occurred');
        (0, vitest_1.expect)((0, errors_1.getErrorMessage)(undefined)).toBe('An unknown error occurred');
        (0, vitest_1.expect)((0, errors_1.getErrorMessage)({})).toBe('An unknown error occurred');
    });
});
(0, vitest_1.describe)('formatError', () => {
    (0, vitest_1.it)('PttaErrorを正しくフォーマットする', () => {
        const error = new errors_1.PttaError('Test error', 'TEST_CODE');
        const formatted = (0, errors_1.formatError)(error);
        (0, vitest_1.expect)(formatted.message).toBe('Test error');
        (0, vitest_1.expect)(formatted.code).toBe('TEST_CODE');
        (0, vitest_1.expect)(formatted.stack).toBeDefined();
    });
    (0, vitest_1.it)('DatabaseErrorを正しくフォーマットする', () => {
        const error = new errors_1.DatabaseError('DB error');
        const formatted = (0, errors_1.formatError)(error);
        (0, vitest_1.expect)(formatted.message).toBe('DB error');
        (0, vitest_1.expect)(formatted.code).toBe('DB_ERROR');
        (0, vitest_1.expect)(formatted.stack).toBeDefined();
    });
    (0, vitest_1.it)('通常のErrorを正しくフォーマットする', () => {
        const error = new Error('Normal error');
        const formatted = (0, errors_1.formatError)(error);
        (0, vitest_1.expect)(formatted.message).toBe('Normal error');
        (0, vitest_1.expect)(formatted.code).toBeUndefined();
        (0, vitest_1.expect)(formatted.stack).toBeDefined();
    });
    (0, vitest_1.it)('文字列エラーをフォーマットする', () => {
        const formatted = (0, errors_1.formatError)('String error');
        (0, vitest_1.expect)(formatted.message).toBe('String error');
        (0, vitest_1.expect)(formatted.code).toBeUndefined();
        (0, vitest_1.expect)(formatted.stack).toBeUndefined();
    });
    (0, vitest_1.it)('不明なエラーをフォーマットする', () => {
        const formatted = (0, errors_1.formatError)({ unknown: 'error' });
        (0, vitest_1.expect)(formatted.message).toBe('An unknown error occurred');
        (0, vitest_1.expect)(formatted.code).toBeUndefined();
        (0, vitest_1.expect)(formatted.stack).toBeUndefined();
    });
});
//# sourceMappingURL=errors.test.js.map