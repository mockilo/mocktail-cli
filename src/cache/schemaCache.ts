import * as fs from 'fs';
import * as crypto from 'crypto';
import { SchemaModelsMap } from '../schema-parsers/baseSchemaParser';

export interface CachedSchema {
  models: SchemaModelsMap;
  timestamp: number;
  hash: string;
}

export class SchemaCache {
  private cache: Map<string, CachedSchema> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  getCachedSchema(schemaPath: string): SchemaModelsMap | null {
    const cached = this.cache.get(schemaPath);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(schemaPath);
      return null;
    }
    
    // Check if file has changed
    const currentHash = this.getFileHash(schemaPath);
    if (currentHash !== cached.hash) {
      this.cache.delete(schemaPath);
      return null;
    }
    
    return cached.models;
  }
  
  setCachedSchema(schemaPath: string, models: SchemaModelsMap): void {
    const hash = this.getFileHash(schemaPath);
    this.cache.set(schemaPath, {
      models,
      timestamp: Date.now(),
      hash
    });
  }
  
  private getFileHash(schemaPath: string): string {
    try {
      const content = fs.readFileSync(schemaPath, 'utf-8');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return '';
    }
  }
  
  clearCache(): void {
    this.cache.clear();
  }
  
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}
