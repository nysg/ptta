import { describe, it, expect } from 'vitest';
import {
  PttaError,
  DatabaseError,
  ValidationError,
  NotFoundError,
  isError,
  getErrorMessage,
  formatError,
} from '../errors';

describe('PttaError', () => {
  it('正しいメッセージとコードでエラーを作成する', () => {
    const error = new PttaError('Test error', 'TEST_CODE');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('PttaError');
  });

  it('コードなしでエラーを作成できる', () => {
    const error = new PttaError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.code).toBeUndefined();
  });

  it('Errorのインスタンスである', () => {
    const error = new PttaError('Test error');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof PttaError).toBe(true);
  });
});

describe('DatabaseError', () => {
  it('正しいメッセージで作成される', () => {
    const error = new DatabaseError('Database connection failed');
    expect(error.message).toBe('Database connection failed');
    expect(error.code).toBe('DB_ERROR');
    expect(error.name).toBe('DatabaseError');
  });

  it('元のエラーを保持できる', () => {
    const originalError = new Error('Original error');
    const error = new DatabaseError('Database error', originalError);
    expect(error.originalError).toBe(originalError);
  });

  it('PttaErrorのインスタンスである', () => {
    const error = new DatabaseError('Database error');
    expect(error instanceof PttaError).toBe(true);
    expect(error instanceof DatabaseError).toBe(true);
  });
});

describe('ValidationError', () => {
  it('正しいメッセージとフィールド名で作成される', () => {
    const error = new ValidationError('Invalid value', 'username');
    expect(error.message).toBe('Invalid value');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.field).toBe('username');
    expect(error.name).toBe('ValidationError');
  });

  it('フィールド名なしで作成できる', () => {
    const error = new ValidationError('Invalid value');
    expect(error.message).toBe('Invalid value');
    expect(error.field).toBeUndefined();
  });

  it('PttaErrorのインスタンスである', () => {
    const error = new ValidationError('Invalid value');
    expect(error instanceof PttaError).toBe(true);
    expect(error instanceof ValidationError).toBe(true);
  });
});

describe('NotFoundError', () => {
  it('リソース名とIDで正しいメッセージを生成する', () => {
    const error = new NotFoundError('Project', 123);
    expect(error.message).toBe('Project with ID 123 not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('NotFoundError');
  });

  it('IDなしで正しいメッセージを生成する', () => {
    const error = new NotFoundError('Project');
    expect(error.message).toBe('Project not found');
  });

  it('文字列IDでも動作する', () => {
    const error = new NotFoundError('User', 'abc-123');
    expect(error.message).toBe('User with ID abc-123 not found');
  });

  it('PttaErrorのインスタンスである', () => {
    const error = new NotFoundError('Project');
    expect(error instanceof PttaError).toBe(true);
    expect(error instanceof NotFoundError).toBe(true);
  });
});

describe('isError', () => {
  it('Errorインスタンスに対してtrueを返す', () => {
    expect(isError(new Error('test'))).toBe(true);
    expect(isError(new PttaError('test'))).toBe(true);
    expect(isError(new DatabaseError('test'))).toBe(true);
  });

  it('Error以外に対してfalseを返す', () => {
    expect(isError('string')).toBe(false);
    expect(isError(123)).toBe(false);
    expect(isError(null)).toBe(false);
    expect(isError(undefined)).toBe(false);
    expect(isError({})).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('Errorインスタンスからメッセージを取得する', () => {
    const error = new Error('Test error');
    expect(getErrorMessage(error)).toBe('Test error');
  });

  it('PttaErrorからメッセージを取得する', () => {
    const error = new PttaError('Ptta error');
    expect(getErrorMessage(error)).toBe('Ptta error');
  });

  it('文字列をそのまま返す', () => {
    expect(getErrorMessage('Error string')).toBe('Error string');
  });

  it('不明なエラーに対してデフォルトメッセージを返す', () => {
    expect(getErrorMessage(123)).toBe('An unknown error occurred');
    expect(getErrorMessage(null)).toBe('An unknown error occurred');
    expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
    expect(getErrorMessage({})).toBe('An unknown error occurred');
  });
});

describe('formatError', () => {
  it('PttaErrorを正しくフォーマットする', () => {
    const error = new PttaError('Test error', 'TEST_CODE');
    const formatted = formatError(error);

    expect(formatted.message).toBe('Test error');
    expect(formatted.code).toBe('TEST_CODE');
    expect(formatted.stack).toBeDefined();
  });

  it('DatabaseErrorを正しくフォーマットする', () => {
    const error = new DatabaseError('DB error');
    const formatted = formatError(error);

    expect(formatted.message).toBe('DB error');
    expect(formatted.code).toBe('DB_ERROR');
    expect(formatted.stack).toBeDefined();
  });

  it('通常のErrorを正しくフォーマットする', () => {
    const error = new Error('Normal error');
    const formatted = formatError(error);

    expect(formatted.message).toBe('Normal error');
    expect(formatted.code).toBeUndefined();
    expect(formatted.stack).toBeDefined();
  });

  it('文字列エラーをフォーマットする', () => {
    const formatted = formatError('String error');

    expect(formatted.message).toBe('String error');
    expect(formatted.code).toBeUndefined();
    expect(formatted.stack).toBeUndefined();
  });

  it('不明なエラーをフォーマットする', () => {
    const formatted = formatError({ unknown: 'error' });

    expect(formatted.message).toBe('An unknown error occurred');
    expect(formatted.code).toBeUndefined();
    expect(formatted.stack).toBeUndefined();
  });
});
