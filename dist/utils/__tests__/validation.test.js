"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const validation_1 = require("../validation");
const errors_1 = require("../errors");
(0, vitest_1.describe)('parseIntSafe', () => {
    (0, vitest_1.it)('正常な整数文字列をパースできる', () => {
        (0, vitest_1.expect)((0, validation_1.parseIntSafe)('123', 'test')).toBe(123);
        (0, vitest_1.expect)((0, validation_1.parseIntSafe)('0', 'test')).toBe(0);
        (0, vitest_1.expect)((0, validation_1.parseIntSafe)('999', 'test')).toBe(999);
    });
    (0, vitest_1.it)('不正な文字列でValidationErrorをスローする', () => {
        (0, vitest_1.expect)(() => (0, validation_1.parseIntSafe)('abc', 'test')).toThrow(errors_1.ValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.parseIntSafe)('', 'test')).toThrow(errors_1.ValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.parseIntSafe)('  ', 'test')).toThrow(errors_1.ValidationError);
    });
    (0, vitest_1.it)('負の数でValidationErrorをスローする', () => {
        (0, vitest_1.expect)(() => (0, validation_1.parseIntSafe)('-1', 'test')).toThrow(errors_1.ValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.parseIntSafe)('-999', 'test')).toThrow(errors_1.ValidationError);
    });
    (0, vitest_1.it)('エラーメッセージにフィールド名が含まれる', () => {
        (0, vitest_1.expect)(() => (0, validation_1.parseIntSafe)('abc', 'project ID')).toThrow('Invalid project ID');
    });
});
(0, vitest_1.describe)('validateRequired', () => {
    (0, vitest_1.it)('有効な値でエラーをスローしない', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validateRequired)('test', 'field')).not.toThrow();
        (0, vitest_1.expect)(() => (0, validation_1.validateRequired)(123, 'field')).not.toThrow();
        (0, vitest_1.expect)(() => (0, validation_1.validateRequired)(false, 'field')).not.toThrow();
    });
    (0, vitest_1.it)('null/undefined/空文字でValidationErrorをスローする', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validateRequired)(null, 'field')).toThrow(errors_1.ValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.validateRequired)(undefined, 'field')).toThrow(errors_1.ValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.validateRequired)('', 'field')).toThrow(errors_1.ValidationError);
    });
    (0, vitest_1.it)('エラーメッセージにフィールド名が含まれる', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validateRequired)(null, 'title')).toThrow('title is required');
    });
});
(0, vitest_1.describe)('validateStatus', () => {
    (0, vitest_1.it)('許可されたステータスでエラーをスローしない', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validateStatus)('active', ['active', 'completed'], 'project')).not.toThrow();
        (0, vitest_1.expect)(() => (0, validation_1.validateStatus)('completed', ['active', 'completed'], 'project')).not.toThrow();
    });
    (0, vitest_1.it)('許可されていないステータスでValidationErrorをスローする', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validateStatus)('invalid', ['active', 'completed'], 'project')).toThrow(errors_1.ValidationError);
    });
    (0, vitest_1.it)('エラーメッセージに許可された値が含まれる', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validateStatus)('invalid', ['active', 'completed'], 'project')).toThrow('active, completed');
    });
});
(0, vitest_1.describe)('validatePriority', () => {
    (0, vitest_1.it)('許可された優先度でエラーをスローしない', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validatePriority)('low')).not.toThrow();
        (0, vitest_1.expect)(() => (0, validation_1.validatePriority)('medium')).not.toThrow();
        (0, vitest_1.expect)(() => (0, validation_1.validatePriority)('high')).not.toThrow();
    });
    (0, vitest_1.it)('許可されていない優先度でValidationErrorをスローする', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validatePriority)('urgent')).toThrow(errors_1.ValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.validatePriority)('invalid')).toThrow(errors_1.ValidationError);
    });
});
(0, vitest_1.describe)('validateEntityType', () => {
    (0, vitest_1.it)('許可されたエンティティタイプでエラーをスローしない', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validateEntityType)('project')).not.toThrow();
        (0, vitest_1.expect)(() => (0, validation_1.validateEntityType)('task')).not.toThrow();
    });
    (0, vitest_1.it)('許可されていないエンティティタイプでValidationErrorをスローする', () => {
        (0, vitest_1.expect)(() => (0, validation_1.validateEntityType)('subtask')).toThrow(errors_1.ValidationError);
        (0, vitest_1.expect)(() => (0, validation_1.validateEntityType)('invalid')).toThrow(errors_1.ValidationError);
    });
});
//# sourceMappingURL=validation.test.js.map