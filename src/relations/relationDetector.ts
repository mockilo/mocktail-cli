import { SchemaModelsMap } from '../schema-parsers/baseSchemaParser';

export interface Relation {
  from: string;
  to: string;
  field: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  foreignKey?: string;
  confidence: number; // 0-1 confidence score
  detectionMethod: 'direct' | 'foreign-key' | 'naming-convention' | 'schema-annotation' | 'inferred';
}

export interface RelationDetectionOptions {
  enableAdvancedPatterns?: boolean;
  enableSchemaAnnotations?: boolean;
  enableInference?: boolean;
  confidenceThreshold?: number;
}

export class RelationDetector {
  private options: RelationDetectionOptions;

  constructor(options: RelationDetectionOptions = {}) {
    this.options = {
      enableAdvancedPatterns: true,
      enableSchemaAnnotations: true,
      enableInference: true,
      confidenceThreshold: 0.5,
      ...options
    };
  }

  detectRelations(models: SchemaModelsMap): Relation[] {
    const relations: Relation[] = [];
    const modelNames = Object.keys(models);
    const processedFields = new Set<string>();
    
    for (const [modelName, model] of Object.entries(models)) {
      for (const field of model.fields) {
        const fieldKey = `${modelName}.${field.name}`;
        if (processedFields.has(fieldKey)) continue;
        processedFields.add(fieldKey);

        // 1. Direct model references (highest confidence)
        if (modelNames.includes(field.type)) {
          relations.push({
            from: modelName,
            to: field.type,
            field: field.name,
            type: field.isArray ? 'one-to-many' : 'one-to-one',
            confidence: 1.0,
            detectionMethod: 'direct'
          });
          continue;
        }

        // 2. Schema annotations (high confidence)
        if (this.options.enableSchemaAnnotations) {
          const annotationRelation = this.detectSchemaAnnotation(field, modelNames);
          if (annotationRelation) {
            relations.push({
              from: modelName,
              to: annotationRelation.to,
              field: field.name,
              type: annotationRelation.type,
              confidence: 0.9,
              detectionMethod: 'schema-annotation'
            });
            continue;
          }
        }

        // 3. Enhanced foreign key patterns (medium-high confidence)
        const foreignKeyRelation = this.detectEnhancedForeignKeyPattern(field.name, field.type, modelNames);
        if (foreignKeyRelation) {
          relations.push({
            from: modelName,
            to: foreignKeyRelation.to,
            field: field.name,
            type: foreignKeyRelation.type,
            foreignKey: field.name,
            confidence: foreignKeyRelation.confidence,
            detectionMethod: 'foreign-key'
          });
          continue;
        }

        // 4. Advanced naming conventions (medium confidence)
        if (this.options.enableAdvancedPatterns) {
          const namingRelation = this.detectAdvancedNamingPattern(field.name, modelNames);
          if (namingRelation) {
            relations.push({
              from: modelName,
              to: namingRelation.to,
              field: field.name,
              type: namingRelation.type,
              confidence: namingRelation.confidence,
              detectionMethod: 'naming-convention'
            });
            continue;
          }
        }

        // 5. Inference based on field types and context (lower confidence)
        if (this.options.enableInference) {
          const inferredRelation = this.inferRelation(field, modelName, models);
          if (inferredRelation && inferredRelation.confidence >= this.options.confidenceThreshold!) {
            relations.push({
              from: modelName,
              to: inferredRelation.to,
              field: field.name,
              type: inferredRelation.type,
              confidence: inferredRelation.confidence,
              detectionMethod: 'inferred'
            });
          }
        }
      }
    }
    
    // Filter by confidence threshold and remove duplicates
    return this.deduplicateRelations(
      relations.filter(r => r.confidence >= this.options.confidenceThreshold!)
    );
  }
  
  private detectSchemaAnnotation(field: any, modelNames: string[]): { to: string; type: 'one-to-one' | 'one-to-many' | 'many-to-many' } | null {
    // Check for common schema annotation patterns
    const annotations = field.annotations || field.meta || field.tags || [];
    
    for (const annotation of annotations) {
      // @relation, @belongsTo, @hasMany, @hasOne patterns
      if (typeof annotation === 'string') {
        const relationMatch = annotation.match(/@(?:relation|belongsTo|hasMany|hasOne)\(['"]?(\w+)['"]?\)/i);
        if (relationMatch && relationMatch[1] && modelNames.includes(relationMatch[1])) {
          const relationType = annotation.includes('hasMany') ? 'one-to-many' : 
                              annotation.includes('hasOne') ? 'one-to-one' : 'one-to-one';
          return { to: relationMatch[1], type: relationType };
        }
      }
    }
    
    return null;
  }

  private detectEnhancedForeignKeyPattern(fieldName: string, fieldType: string, modelNames: string[]): { to: string; type: 'one-to-one' | 'one-to-many' | 'many-to-many'; confidence: number } | null {
    // Enhanced foreign key patterns with confidence scoring
    const patterns = [
      { regex: /^(\w+)Id$/i, confidence: 0.9, type: 'one-to-one' as const },
      { regex: /^(\w+)_id$/i, confidence: 0.9, type: 'one-to-one' as const },
      { regex: /^(\w+)Ref$/i, confidence: 0.8, type: 'one-to-one' as const },
      { regex: /^(\w+)Key$/i, confidence: 0.8, type: 'one-to-one' as const },
      { regex: /^(\w+)Fk$/i, confidence: 0.8, type: 'one-to-one' as const },
      { regex: /^(\w+)Id$/i, confidence: 0.7, type: 'one-to-one' as const },
      { regex: /^(\w+)Id$/i, confidence: 0.6, type: 'one-to-one' as const },
      // Plural patterns for many-to-many
      { regex: /^(\w+)Ids$/i, confidence: 0.8, type: 'many-to-many' as const },
      { regex: /^(\w+)_ids$/i, confidence: 0.8, type: 'many-to-many' as const },
    ];
    
    for (const pattern of patterns) {
      const match = fieldName.match(pattern.regex);
      if (match) {
        const referencedModel = match[1];
        if (referencedModel && modelNames.includes(referencedModel)) {
          return { 
            to: referencedModel, 
            type: pattern.type, 
            confidence: pattern.confidence 
          };
        }
      }
    }
    
    // Check for type-based inference
    if (fieldType === 'string' && fieldName.toLowerCase().includes('id')) {
      const possibleModel = this.findModelByFieldPattern(fieldName, modelNames);
      if (possibleModel) {
        return { to: possibleModel, type: 'one-to-one', confidence: 0.6 };
      }
    }
    
    return null;
  }

  private detectAdvancedNamingPattern(fieldName: string, modelNames: string[]): { to: string; type: 'one-to-one' | 'one-to-many' | 'many-to-many'; confidence: number } | null {
    // Advanced naming convention patterns
    const patterns = [
      // Direct model references
      { regex: /^(\w+)$/i, confidence: 0.7, type: 'one-to-one' as const },
      // Plural patterns
      { regex: /^(\w+)s$/i, confidence: 0.8, type: 'one-to-many' as const },
      { regex: /^(\w+)List$/i, confidence: 0.8, type: 'one-to-many' as const },
      { regex: /^(\w+)Array$/i, confidence: 0.8, type: 'one-to-many' as const },
      { regex: /^(\w+)Collection$/i, confidence: 0.8, type: 'one-to-many' as const },
      // Relation-specific patterns
      { regex: /^(\w+)Relation$/i, confidence: 0.9, type: 'one-to-one' as const },
      { regex: /^(\w+)Ref$/i, confidence: 0.8, type: 'one-to-one' as const },
      { regex: /^(\w+)Link$/i, confidence: 0.7, type: 'one-to-one' as const },
      // Many-to-many patterns
      { regex: /^(\w+)s$/i, confidence: 0.6, type: 'many-to-many' as const },
    ];
    
    for (const pattern of patterns) {
      const match = fieldName.match(pattern.regex);
      if (match) {
        const referencedModel = match[1];
        if (referencedModel && modelNames.includes(referencedModel)) {
          return { 
            to: referencedModel, 
            type: pattern.type, 
            confidence: pattern.confidence 
          };
        }
      }
    }
    
    return null;
  }

  private inferRelation(field: any, _modelName: string, models: SchemaModelsMap): { to: string; type: 'one-to-one' | 'one-to-many' | 'many-to-many'; confidence: number } | null {
    // Infer relations based on field context and naming patterns
    const fieldName = field.name.toLowerCase();
    
    // Check for common relation indicators
    const relationIndicators = ['id', 'ref', 'key', 'link', 'relation'];
    const hasRelationIndicator = relationIndicators.some(indicator => fieldName.includes(indicator));
    
    if (!hasRelationIndicator) return null;
    
    // Try to find matching model by similarity
    const modelNames = Object.keys(models);
    const possibleMatches = modelNames.filter(name => {
      const nameLower = name.toLowerCase();
      return fieldName.includes(nameLower) || nameLower.includes(fieldName.replace(/[^a-z]/g, ''));
    });
    
    if (possibleMatches.length === 1) {
      const isArray = field.isArray || fieldName.endsWith('s') || fieldName.includes('list') || fieldName.includes('array');
      return {
        to: possibleMatches[0] || 'Unknown',
        type: isArray ? 'one-to-many' : 'one-to-one',
        confidence: 0.5
      };
    }
    
    return null;
  }

  private findModelByFieldPattern(fieldName: string, modelNames: string[]): string | null {
    // Extract potential model name from field name
    const cleanFieldName = fieldName.replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    for (const modelName of modelNames) {
      const modelNameLower = modelName.toLowerCase();
      if (cleanFieldName.includes(modelNameLower) || modelNameLower.includes(cleanFieldName)) {
        return modelName;
      }
    }
    
    return null;
  }

  private deduplicateRelations(relations: Relation[]): Relation[] {
    const seen = new Set<string>();
    const deduplicated: Relation[] = [];
    
    for (const relation of relations) {
      const key = `${relation.from}-${relation.to}-${relation.field}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(relation);
      }
    }
    
    return deduplicated;
  }
  
  getRelationGraph(models: SchemaModelsMap): Map<string, string[]> {
    const relations = this.detectRelations(models);
    const graph = new Map<string, string[]>();
    
    for (const relation of relations) {
      if (!graph.has(relation.from)) {
        graph.set(relation.from, []);
      }
      graph.get(relation.from)!.push(relation.to);
    }
    
    return graph;
  }
  
  getTopologicalOrder(models: SchemaModelsMap): string[] {
    const graph = this.getRelationGraph(models);
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];
    
    const visit = (node: string) => {
      if (visiting.has(node)) {
        // Circular dependency detected
        return;
      }
      
      if (visited.has(node)) {
        return;
      }
      
      visiting.add(node);
      
      const dependencies = graph.get(node) || [];
      for (const dep of dependencies) {
        visit(dep);
      }
      
      visiting.delete(node);
      visited.add(node);
      result.push(node);
    };
    
    for (const modelName of Object.keys(models)) {
      if (!visited.has(modelName)) {
        visit(modelName);
      }
    }
    
    return result;
  }
}
