import type { Model, GenerateOptions, GeneratedData } from '../types';
/**
 * Generate mock data for a single model descriptor.
 *
 * Returns:
 *  {
 *    records: [...],           // main table records
 *    joinTableRecords: {       // many-to-many join table data, e.g. { '_PostToCategory': [ {A: postId, B: categoryId}, ... ] }
 *      [joinTableName]: Array<{A: string, B: string}>
 *    }
 *  }
 */
export declare function generateMockData(model: Model, options?: GenerateOptions): GeneratedData;
