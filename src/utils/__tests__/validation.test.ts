import { describe, it, expect } from 'vitest';
import {
  parseIntSafe,
  validateRequired,
  validateStatus,
  validatePriority,
  validateEntityType,
} from '../validation';
import { ValidationError } from '../errors';

describe('parseIntSafe', () => {
  it('正常な整数文字列をパースできる', () => {
    expect(parseIntSafe('123', 'test')).toBe(123);
    expect(parseIntSafe('0', 'test')).toBe(0);
    expect(parseIntSafe('999', 'test')).toBe(999);
  });

  it('不正な文字列でValidationErrorをスローする', () => {
    expect(() => parseIntSafe('abc', 'test')).toThrow(ValidationError);
    expect(() => parseIntSafe('', 'test')).toThrow(ValidationError);
    expect(() => parseIntSafe('  ', 'test')).toThrow(ValidationError);
  });

  it('負の数でValidationErrorをスローする', () => {
    expect(() => parseIntSafe('-1', 'test')).toThrow(ValidationError);
    expect(() => parseIntSafe('-999', 'test')).toThrow(ValidationError);
  });

  it('エラーメッセージにフィールド名が含まれる', () => {
    expect(() => parseIntSafe('abc', 'project ID')).toThrow('Invalid project ID');
  });
});

describe('validateRequired', () => {
  it('有効な値でエラーをスローしない', () => {
    expect(() => validateRequired('test', 'field')).not.toThrow();
    expect(() => validateRequired(123, 'field')).not.toThrow();
    expect(() => validateRequired(false, 'field')).not.toThrow();
  });

  it('null/undefined/空文字でValidationErrorをスローする', () => {
    expect(() => validateRequired(null, 'field')).toThrow(ValidationError);
    expect(() => validateRequired(undefined, 'field')).toThrow(ValidationError);
    expect(() => validateRequired('', 'field')).toThrow(ValidationError);
  });

  it('エラーメッセージにフィールド名が含まれる', () => {
    expect(() => validateRequired(null, 'title')).toThrow('title is required');
  });
});

describe('validateStatus', () => {
  it('許可されたステータスでエラーをスローしない', () => {
    expect(() => validateStatus('active', ['active', 'completed'], 'project')).not.toThrow();
    expect(() => validateStatus('completed', ['active', 'completed'], 'project')).not.toThrow();
  });

  it('許可されていないステータスでValidationErrorをスローする', () => {
    expect(() => validateStatus('invalid', ['active', 'completed'], 'project')).toThrow(ValidationError);
  });

  it('エラーメッセージに許可された値が含まれる', () => {
    expect(() => validateStatus('invalid', ['active', 'completed'], 'project')).toThrow('active, completed');
  });
});

describe('validatePriority', () => {
  it('許可された優先度でエラーをスローしない', () => {
    expect(() => validatePriority('low')).not.toThrow();
    expect(() => validatePriority('medium')).not.toThrow();
    expect(() => validatePriority('high')).not.toThrow();
  });

  it('許可されていない優先度でValidationErrorをスローする', () => {
    expect(() => validatePriority('urgent')).toThrow(ValidationError);
    expect(() => validatePriority('invalid')).toThrow(ValidationError);
  });
});

describe('validateEntityType', () => {
  it('許可されたエンティティタイプでエラーをスローしない', () => {
    expect(() => validateEntityType('project')).not.toThrow();
    expect(() => validateEntityType('task')).not.toThrow();
  });

  it('許可されていないエンティティタイプでValidationErrorをスローする', () => {
    expect(() => validateEntityType('subtask')).toThrow(ValidationError);
    expect(() => validateEntityType('invalid')).toThrow(ValidationError);
  });
});
