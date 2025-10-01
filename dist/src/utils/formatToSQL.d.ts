import type { Field } from '../types';
/**
 * Formats records into an SQL INSERT statement.
 *
 * @param modelName - Table name
 * @param records - Array of record objects
 * @param fieldsMeta - Optional Prisma model.fields array for filtering relations
 */
export declare function formatToSQL(modelName: string, records: Record<string, any>[], fieldsMeta?: Field[]): string;
/**
 * Formats many-to-many join table inserts.
 *
 * @param joinTableName - join table name
 * @param records - array of objects with keys 'A' and 'B'
 */
export declare function formatJoinTableSQL(joinTableName: string, records: Array<{
    A: string;
    B: string;
}>): string;
