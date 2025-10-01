import chalk from 'chalk';

export interface ErrorContext {
  command?: string;
  schemaPath?: string;
  schemaType?: string;
  fieldName?: string;
  modelName?: string;
  lineNumber?: number;
  columnNumber?: number;
  suggestion?: string;
  relatedFiles?: string[];
}

export interface EnhancedError extends Error {
  code?: string;
  context?: ErrorContext;
  suggestions?: string[];
  documentation?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorDatabase: Map<string, ErrorTemplate> = new Map();

  constructor() {
    this.initializeErrorDatabase();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private initializeErrorDatabase(): void {
    // Schema-related errors
    this.errorDatabase.set('SCHEMA_NOT_FOUND', {
      message: 'Schema file not found',
      suggestions: [
        'Check if the file path is correct',
        'Ensure the file exists in the specified location',
        'Use --schema to specify the correct path',
        'Run without --schema to auto-detect schema files'
      ],
      documentation: 'https://mocktail-cli.dev/docs/schema-detection',
      severity: 'high'
    });

    this.errorDatabase.set('INVALID_SCHEMA_TYPE', {
      message: 'Invalid or unsupported schema type',
      suggestions: [
        'Use --type to specify the correct schema type',
        'Supported types: prisma, graphql, json-schema, openapi, typescript, protobuf, avro, xml-schema, sql-ddl, mongoose, sequelize, joi, yup, zod',
        'Let the CLI auto-detect the schema type by omitting --type'
      ],
      documentation: 'https://mocktail-cli.dev/docs/supported-schemas',
      severity: 'medium'
    });

    this.errorDatabase.set('SCHEMA_PARSE_ERROR', {
      message: 'Failed to parse schema file',
      suggestions: [
        'Check the schema syntax for errors',
        'Validate the schema file format',
        'Ensure all required fields are present',
        'Check for missing dependencies or imports'
      ],
      documentation: 'https://mocktail-cli.dev/docs/schema-validation',
      severity: 'high'
    });

    // Model-related errors
    this.errorDatabase.set('MODEL_NOT_FOUND', {
      message: 'Model not found in schema',
      suggestions: [
        'Check if the model name is spelled correctly',
        'Ensure the model exists in the schema file',
        'Use --models to specify which models to generate',
        'List available models with --list-models'
      ],
      documentation: 'https://mocktail-cli.dev/docs/model-selection',
      severity: 'medium'
    });

    this.errorDatabase.set('INVALID_MODEL_COUNT', {
      message: 'Invalid count specified for model',
      suggestions: [
        'Count must be a positive integer',
        'Use comma-separated values for multiple models: --count 10,20,30',
        'Ensure count values match the number of specified models'
      ],
      documentation: 'https://mocktail-cli.dev/docs/count-options',
      severity: 'low'
    });

    // Relation errors
    this.errorDatabase.set('CIRCULAR_DEPENDENCY', {
      message: 'Circular dependency detected in relations',
      suggestions: [
        'Review the relation definitions in your schema',
        'Consider breaking circular dependencies with intermediate models',
        'Use --depth to limit relation depth',
        'Disable relations with --no-nest if needed'
      ],
      documentation: 'https://mocktail-cli.dev/docs/relation-handling',
      severity: 'medium'
    });

    this.errorDatabase.set('RELATION_DETECTION_FAILED', {
      message: 'Failed to detect relations automatically',
      suggestions: [
        'Check field naming conventions (e.g., userId, user_id)',
        'Use explicit relation annotations in your schema',
        'Manually define relations in mocktail-cli.config.js',
        'Enable advanced relation detection with --enable-advanced-relations'
      ],
      documentation: 'https://mocktail-cli.dev/docs/relation-detection',
      severity: 'low'
    });

    // Performance errors
    this.errorDatabase.set('MEMORY_LIMIT_EXCEEDED', {
      message: 'Memory limit exceeded during generation',
      suggestions: [
        'Reduce the count of records to generate',
        'Use --batch-size to process data in smaller chunks',
        'Increase Node.js memory limit with --max-old-space-size',
        'Consider using --format sql for large datasets'
      ],
      documentation: 'https://mocktail-cli.dev/docs/performance-optimization',
      severity: 'high'
    });

    this.errorDatabase.set('GENERATION_TIMEOUT', {
      message: 'Data generation timed out',
      suggestions: [
        'Reduce the complexity of your schema',
        'Lower the relation depth with --depth',
        'Generate data in smaller batches',
        'Use --timeout to increase the timeout limit'
      ],
      documentation: 'https://mocktail-cli.dev/docs/performance-optimization',
      severity: 'medium'
    });

    // Configuration errors
    this.errorDatabase.set('INVALID_CONFIG', {
      message: 'Invalid configuration file',
      suggestions: [
        'Check the syntax of your mocktail-cli.config.js file',
        'Ensure all required configuration options are present',
        'Validate JSON syntax if using .json config file',
        'Use --validate-config to check configuration'
      ],
      documentation: 'https://mocktail-cli.dev/docs/configuration',
      severity: 'medium'
    });

    // Output errors
    this.errorDatabase.set('OUTPUT_WRITE_FAILED', {
      message: 'Failed to write output file',
      suggestions: [
        'Check if the output directory exists and is writable',
        'Ensure you have sufficient disk space',
        'Verify file permissions for the output location',
        'Try using a different output path with --out'
      ],
      documentation: 'https://mocktail-cli.dev/docs/output-formats',
      severity: 'high'
    });

    this.errorDatabase.set('UNSUPPORTED_FORMAT', {
      message: 'Unsupported output format',
      suggestions: [
        'Use one of the supported formats: json, sql, csv, ts',
        'Check if the format is available in your CLI version',
        'Update to the latest version for more format options'
      ],
      documentation: 'https://mocktail-cli.dev/docs/output-formats',
      severity: 'low'
    });
  }

  createEnhancedError(
    originalError: Error,
    code: string,
    context?: ErrorContext
  ): EnhancedError {
    const template = this.errorDatabase.get(code);
    
    const enhancedError = new Error(originalError.message) as EnhancedError;
    enhancedError.code = code;
    enhancedError.context = context || {};
    enhancedError.severity = template?.severity || 'medium';
    enhancedError.suggestions = template?.suggestions || [];
    enhancedError.documentation = template?.documentation || '';

    return enhancedError;
  }

  formatError(error: EnhancedError): string {
    const lines: string[] = [];
    
    // Error header
    // const severityColor = this.getSeverityColor(error.severity);
    const severityIcon = this.getSeverityIcon(error.severity);
    
    lines.push(chalk.red.bold(`${severityIcon} ${error.message}`));
    
    if (error.code) {
      lines.push(chalk.gray(`Error Code: ${error.code}`));
    }

    // Context information
    if (error.context) {
      lines.push(chalk.yellow('\n📍 Context:'));
      if (error.context.schemaPath) {
        lines.push(chalk.gray(`  Schema: ${error.context.schemaPath}`));
      }
      if (error.context.schemaType) {
        lines.push(chalk.gray(`  Type: ${error.context.schemaType}`));
      }
      if (error.context.modelName) {
        lines.push(chalk.gray(`  Model: ${error.context.modelName}`));
      }
      if (error.context.fieldName) {
        lines.push(chalk.gray(`  Field: ${error.context.fieldName}`));
      }
      if (error.context.lineNumber) {
        lines.push(chalk.gray(`  Line: ${error.context.lineNumber}`));
      }
    }

    // Suggestions
    if (error.suggestions && error.suggestions.length > 0) {
      lines.push(chalk.blue('\n💡 Suggestions:'));
      error.suggestions.forEach((suggestion, index) => {
        lines.push(chalk.gray(`  ${index + 1}. ${suggestion}`));
      });
    }

    // Documentation link
    if (error.documentation) {
      lines.push(chalk.cyan(`\n📚 Documentation: ${error.documentation}`));
    }

    // Related files
    if (error.context?.relatedFiles && error.context.relatedFiles.length > 0) {
      lines.push(chalk.magenta('\n📁 Related Files:'));
      error.context.relatedFiles.forEach(file => {
        lines.push(chalk.gray(`  - ${file}`));
      });
    }

    return lines.join('\n');
  }

  // private getSeverityColor(severity: string): string {
  //   switch (severity) {
  //     case 'critical': return 'red';
  //     case 'high': return 'red';
  //     case 'medium': return 'yellow';
  //     case 'low': return 'blue';
  //     default: return 'white';
  //   }
  // }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '❌';
      case 'medium': return '⚠️';
      case 'low': return 'ℹ️';
      default: return '❓';
    }
  }

  logError(error: EnhancedError): void {
    console.error(this.formatError(error));
  }

  logWarning(message: string, context?: ErrorContext): void {
    console.warn(chalk.yellow(`⚠️  ${message}`));
    if (context) {
      console.warn(chalk.gray(`   Context: ${JSON.stringify(context, null, 2)}`));
    }
  }

  logInfo(message: string, context?: ErrorContext): void {
    console.log(chalk.blue(`ℹ️  ${message}`));
    if (context) {
      console.log(chalk.gray(`   Context: ${JSON.stringify(context, null, 2)}`));
    }
  }
}

interface ErrorTemplate {
  message: string;
  suggestions: string[];
  documentation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const errorHandler = ErrorHandler.getInstance();
