import { PttaDatabase } from '../database';
/**
 * Migration interface
 */
export interface Migration {
    version: number;
    name: string;
    up: (db: PttaDatabase) => void;
    down: (db: PttaDatabase) => void;
}
/**
 * All migrations in order
 */
export declare const migrations: Migration[];
/**
 * Get current schema version from database
 */
export declare function getCurrentVersion(db: PttaDatabase): number;
/**
 * Initialize schema_version table
 */
export declare function initSchemaVersion(db: PttaDatabase): void;
/**
 * Run migrations up to target version
 */
export declare function migrate(db: PttaDatabase, targetVersion?: number): void;
/**
 * Rollback migrations to target version
 */
export declare function rollback(db: PttaDatabase, targetVersion?: number): void;
//# sourceMappingURL=index.d.ts.map