"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const json_1 = require("../json");
(0, vitest_1.describe)('parseMetadata', () => {
    (0, vitest_1.it)('JSON文字列を正しくパースする', () => {
        const metadata = (0, json_1.parseMetadata)('{"key": "value", "count": 42}');
        (0, vitest_1.expect)(metadata).toEqual({ key: 'value', count: 42 });
    });
    (0, vitest_1.it)('既にオブジェクトの場合はそのまま返す', () => {
        const obj = { key: 'value' };
        (0, vitest_1.expect)((0, json_1.parseMetadata)(obj)).toBe(obj);
    });
    (0, vitest_1.it)('undefined/nullの場合はundefinedを返す', () => {
        (0, vitest_1.expect)((0, json_1.parseMetadata)(undefined)).toBeUndefined();
        (0, vitest_1.expect)((0, json_1.parseMetadata)(null)).toBeUndefined();
        (0, vitest_1.expect)((0, json_1.parseMetadata)('')).toBeUndefined();
    });
    (0, vitest_1.it)('不正なJSON文字列の場合はundefinedを返す', () => {
        (0, vitest_1.expect)((0, json_1.parseMetadata)('invalid json')).toBeUndefined();
        (0, vitest_1.expect)((0, json_1.parseMetadata)('{')).toBeUndefined();
    });
});
(0, vitest_1.describe)('stringifyMetadata', () => {
    (0, vitest_1.it)('オブジェクトをJSON文字列に変換する', () => {
        const metadata = { key: 'value', count: 42 };
        (0, vitest_1.expect)((0, json_1.stringifyMetadata)(metadata)).toBe('{"key":"value","count":42}');
    });
    (0, vitest_1.it)('undefined/nullの場合はnullを返す', () => {
        (0, vitest_1.expect)((0, json_1.stringifyMetadata)(undefined)).toBeNull();
        (0, vitest_1.expect)((0, json_1.stringifyMetadata)(null)).toBeNull();
    });
    (0, vitest_1.it)('空オブジェクトを変換できる', () => {
        (0, vitest_1.expect)((0, json_1.stringifyMetadata)({})).toBe('{}');
    });
});
(0, vitest_1.describe)('parseEntityMetadata', () => {
    (0, vitest_1.it)('エンティティのmetadataフィールドをパースする', () => {
        const entity = {
            id: 1,
            title: 'Test',
            metadata: '{"key": "value"}',
        };
        const result = (0, json_1.parseEntityMetadata)(entity);
        (0, vitest_1.expect)(result.metadata).toEqual({ key: 'value' });
    });
    (0, vitest_1.it)('metadataが既にオブジェクトの場合は変更しない', () => {
        const entity = {
            id: 1,
            title: 'Test',
            metadata: { key: 'value' },
        };
        const result = (0, json_1.parseEntityMetadata)(entity);
        (0, vitest_1.expect)(result.metadata).toEqual({ key: 'value' });
    });
    (0, vitest_1.it)('metadataがない場合は何もしない', () => {
        const entity = {
            id: 1,
            title: 'Test',
        };
        const result = (0, json_1.parseEntityMetadata)(entity);
        (0, vitest_1.expect)(result.metadata).toBeUndefined();
    });
    (0, vitest_1.it)('元のオブジェクトを変更する(mutate)', () => {
        const entity = {
            id: 1,
            metadata: '{"key": "value"}',
        };
        (0, json_1.parseEntityMetadata)(entity);
        (0, vitest_1.expect)(entity.metadata).toEqual({ key: 'value' });
    });
});
(0, vitest_1.describe)('buildUpdateQuery', () => {
    (0, vitest_1.it)('基本的な更新クエリを構築する', () => {
        const updates = {
            title: 'New Title',
            description: 'New Description',
        };
        const result = (0, json_1.buildUpdateQuery)(updates);
        (0, vitest_1.expect)(result.fields).toEqual([
            'title = ?',
            'description = ?',
            'updated_at = CURRENT_TIMESTAMP',
        ]);
        (0, vitest_1.expect)(result.values).toEqual(['New Title', 'New Description']);
    });
    (0, vitest_1.it)('除外キーをスキップする', () => {
        const updates = {
            id: 1,
            title: 'New Title',
            created_at: '2024-01-01',
        };
        const result = (0, json_1.buildUpdateQuery)(updates);
        (0, vitest_1.expect)(result.fields).toEqual([
            'title = ?',
            'updated_at = CURRENT_TIMESTAMP',
        ]);
        (0, vitest_1.expect)(result.values).toEqual(['New Title']);
    });
    (0, vitest_1.it)('metadataを正しくシリアライズする', () => {
        const updates = {
            title: 'New Title',
            metadata: { key: 'value' },
        };
        const result = (0, json_1.buildUpdateQuery)(updates);
        (0, vitest_1.expect)(result.fields).toContain('metadata = ?');
        (0, vitest_1.expect)(result.values).toContain('{"key":"value"}');
    });
    (0, vitest_1.it)('完了ステータスでcompleted_atを追加する', () => {
        const updates = {
            status: 'done',
        };
        const result = (0, json_1.buildUpdateQuery)(updates, ['id', 'created_at'], true);
        (0, vitest_1.expect)(result.fields).toContain('completed_at = CURRENT_TIMESTAMP');
    });
    (0, vitest_1.it)('completedステータスでもcompleted_atを追加する', () => {
        const updates = {
            status: 'completed',
        };
        const result = (0, json_1.buildUpdateQuery)(updates, ['id', 'created_at'], true);
        (0, vitest_1.expect)(result.fields).toContain('completed_at = CURRENT_TIMESTAMP');
    });
    (0, vitest_1.it)('autoCompletedがfalseの場合はcompleted_atを追加しない', () => {
        const updates = {
            status: 'done',
        };
        const result = (0, json_1.buildUpdateQuery)(updates, ['id', 'created_at'], false);
        (0, vitest_1.expect)(result.fields).not.toContain('completed_at = CURRENT_TIMESTAMP');
    });
    (0, vitest_1.it)('カスタム除外キーを使用できる', () => {
        const updates = {
            id: 1,
            title: 'New Title',
            custom_field: 'value',
        };
        const result = (0, json_1.buildUpdateQuery)(updates, ['id', 'custom_field']);
        (0, vitest_1.expect)(result.fields).toEqual([
            'title = ?',
            'updated_at = CURRENT_TIMESTAMP',
        ]);
        (0, vitest_1.expect)(result.values).toEqual(['New Title']);
    });
    (0, vitest_1.it)('空の更新でもupdated_atは追加される', () => {
        const updates = {};
        const result = (0, json_1.buildUpdateQuery)(updates);
        (0, vitest_1.expect)(result.fields).toEqual(['updated_at = CURRENT_TIMESTAMP']);
        (0, vitest_1.expect)(result.values).toEqual([]);
    });
});
//# sourceMappingURL=json.test.js.map