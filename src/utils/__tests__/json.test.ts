import { describe, it, expect } from 'vitest';
import {
  parseMetadata,
  stringifyMetadata,
  parseEntityMetadata,
  buildUpdateQuery,
} from '../json';
import type { Metadata } from '../../database';

describe('parseMetadata', () => {
  it('JSON文字列を正しくパースする', () => {
    const metadata = parseMetadata('{"key": "value", "count": 42}');
    expect(metadata).toEqual({ key: 'value', count: 42 });
  });

  it('既にオブジェクトの場合はそのまま返す', () => {
    const obj: Metadata = { key: 'value' };
    expect(parseMetadata(obj)).toBe(obj);
  });

  it('undefined/nullの場合はundefinedを返す', () => {
    expect(parseMetadata(undefined)).toBeUndefined();
    expect(parseMetadata(null)).toBeUndefined();
    expect(parseMetadata('')).toBeUndefined();
  });

  it('不正なJSON文字列の場合はundefinedを返す', () => {
    expect(parseMetadata('invalid json')).toBeUndefined();
    expect(parseMetadata('{')).toBeUndefined();
  });
});

describe('stringifyMetadata', () => {
  it('オブジェクトをJSON文字列に変換する', () => {
    const metadata: Metadata = { key: 'value', count: 42 };
    expect(stringifyMetadata(metadata)).toBe('{"key":"value","count":42}');
  });

  it('undefined/nullの場合はnullを返す', () => {
    expect(stringifyMetadata(undefined)).toBeNull();
    expect(stringifyMetadata(null)).toBeNull();
  });

  it('空オブジェクトを変換できる', () => {
    expect(stringifyMetadata({})).toBe('{}');
  });
});

describe('parseEntityMetadata', () => {
  it('エンティティのmetadataフィールドをパースする', () => {
    const entity = {
      id: 1,
      title: 'Test',
      metadata: '{"key": "value"}',
    };

    const result = parseEntityMetadata(entity);
    expect(result.metadata).toEqual({ key: 'value' });
  });

  it('metadataが既にオブジェクトの場合は変更しない', () => {
    const entity = {
      id: 1,
      title: 'Test',
      metadata: { key: 'value' },
    };

    const result = parseEntityMetadata(entity);
    expect(result.metadata).toEqual({ key: 'value' });
  });

  it('metadataがない場合は何もしない', () => {
    const entity: { id: number; title: string; metadata?: string } = {
      id: 1,
      title: 'Test',
    };

    const result = parseEntityMetadata(entity);
    expect(result.metadata).toBeUndefined();
  });

  it('元のオブジェクトを変更する(mutate)', () => {
    const entity = {
      id: 1,
      metadata: '{"key": "value"}',
    };

    parseEntityMetadata(entity);
    expect(entity.metadata).toEqual({ key: 'value' });
  });
});

describe('buildUpdateQuery', () => {
  it('基本的な更新クエリを構築する', () => {
    const updates = {
      title: 'New Title',
      description: 'New Description',
    };

    const result = buildUpdateQuery(updates);
    expect(result.fields).toEqual([
      'title = ?',
      'description = ?',
      'updated_at = CURRENT_TIMESTAMP',
    ]);
    expect(result.values).toEqual(['New Title', 'New Description']);
  });

  it('除外キーをスキップする', () => {
    const updates = {
      id: 1,
      title: 'New Title',
      created_at: '2024-01-01',
    };

    const result = buildUpdateQuery(updates);
    expect(result.fields).toEqual([
      'title = ?',
      'updated_at = CURRENT_TIMESTAMP',
    ]);
    expect(result.values).toEqual(['New Title']);
  });

  it('metadataを正しくシリアライズする', () => {
    const updates = {
      title: 'New Title',
      metadata: { key: 'value' },
    };

    const result = buildUpdateQuery(updates);
    expect(result.fields).toContain('metadata = ?');
    expect(result.values).toContain('{"key":"value"}');
  });

  it('完了ステータスでcompleted_atを追加する', () => {
    const updates = {
      status: 'done',
    };

    const result = buildUpdateQuery(updates, ['id', 'created_at'], true);
    expect(result.fields).toContain('completed_at = CURRENT_TIMESTAMP');
  });

  it('completedステータスでもcompleted_atを追加する', () => {
    const updates = {
      status: 'completed',
    };

    const result = buildUpdateQuery(updates, ['id', 'created_at'], true);
    expect(result.fields).toContain('completed_at = CURRENT_TIMESTAMP');
  });

  it('autoCompletedがfalseの場合はcompleted_atを追加しない', () => {
    const updates = {
      status: 'done',
    };

    const result = buildUpdateQuery(updates, ['id', 'created_at'], false);
    expect(result.fields).not.toContain('completed_at = CURRENT_TIMESTAMP');
  });

  it('カスタム除外キーを使用できる', () => {
    const updates = {
      id: 1,
      title: 'New Title',
      custom_field: 'value',
    };

    const result = buildUpdateQuery(updates, ['id', 'custom_field']);
    expect(result.fields).toEqual([
      'title = ?',
      'updated_at = CURRENT_TIMESTAMP',
    ]);
    expect(result.values).toEqual(['New Title']);
  });

  it('空の更新でもupdated_atは追加される', () => {
    const updates = {};

    const result = buildUpdateQuery(updates);
    expect(result.fields).toEqual(['updated_at = CURRENT_TIMESTAMP']);
    expect(result.values).toEqual([]);
  });
});
