import chalk from 'chalk';

export interface OutputOptions {
  verbose?: boolean;
  quiet?: boolean;
  color?: boolean;
  timestamp?: boolean;
}

export class OutputFormatter {
  private options: OutputOptions;

  constructor(options: OutputOptions = {}) {
    this.options = {
      verbose: false,
      quiet: false,
      color: true,
      timestamp: false,
      ...options
    };
  }

  log(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    if (this.options.quiet && level !== 'error') return;

    const timestamp = this.options.timestamp ? this.getTimestamp() : '';
    const prefix = this.getPrefix(level);
    const formattedMessage = this.formatMessage(message, level);
    
    console.log(`${timestamp}${prefix}${formattedMessage}`);
  }

  info(message: string): void {
    this.log(message, 'info');
  }

  success(message: string): void {
    this.log(message, 'success');
  }

  warning(message: string): void {
    this.log(message, 'warning');
  }

  error(message: string): void {
    this.log(message, 'error');
  }

  verbose(message: string): void {
    if (this.options.verbose) {
      this.log(`[VERBOSE] ${message}`, 'info');
    }
  }

  private getTimestamp(): string {
    return `[${new Date().toISOString()}] `;
  }

  private getPrefix(level: string): string {
    if (!this.options.color) {
      switch (level) {
        case 'success': return '✅ ';
        case 'warning': return '⚠️  ';
        case 'error': return '❌ ';
        default: return 'ℹ️  ';
      }
    }

    switch (level) {
      case 'success': return chalk.green('✅ ');
      case 'warning': return chalk.yellow('⚠️  ');
      case 'error': return chalk.red('❌ ');
      default: return chalk.blue('ℹ️  ');
    }
  }

  private formatMessage(message: string, level: string): string {
    if (!this.options.color) return message;

    switch (level) {
      case 'success': return chalk.green(message);
      case 'warning': return chalk.yellow(message);
      case 'error': return chalk.red(message);
      default: return message;
    }
  }

  formatSchemaInfo(schemaPath: string, schemaType: string, modelCount: number): string {
    const lines = [
      chalk.cyan('📄 Schema Information:'),
      chalk.gray(`  Path: ${schemaPath}`),
      chalk.gray(`  Type: ${schemaType}`),
      chalk.gray(`  Models: ${modelCount}`)
    ];
    return lines.join('\n');
  }

  formatRelationInfo(relations: any[], averageConfidence: number): string {
    const lines = [
      chalk.cyan('🔗 Relation Detection:'),
      chalk.gray(`  Relations Found: ${relations.length}`),
      chalk.gray(`  Average Confidence: ${(averageConfidence * 100).toFixed(1)}%`)
    ];
    
    if (relations.length > 0) {
      lines.push(chalk.gray('  Top Relations:'));
      relations.slice(0, 5).forEach(relation => {
        const confidence = (relation.confidence * 100).toFixed(1);
        lines.push(chalk.gray(`    ${relation.from} → ${relation.to} (${confidence}%)`));
      });
    }
    
    return lines.join('\n');
  }

  formatPerformanceInfo(metrics: any): string {
    const duration = (metrics.endTime - metrics.startTime) / 1000;
    const recordsPerSecond = metrics.recordsGenerated / duration;
    const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
    
    const lines = [
      chalk.cyan('⚡ Performance Metrics:'),
      chalk.gray(`  Duration: ${duration.toFixed(2)}s`),
      chalk.gray(`  Records Generated: ${metrics.recordsGenerated.toLocaleString()}`),
      chalk.gray(`  Records/Second: ${Math.round(recordsPerSecond)}`),
      chalk.gray(`  Memory Usage: ${memoryUsageMB.toFixed(2)}MB`),
      chalk.gray(`  Batches: ${metrics.totalBatches}`),
      chalk.gray(`  Batch Size: ${metrics.batchSize}`)
    ];
    
    return lines.join('\n');
  }

  formatPluginInfo(plugins: any[]): string {
    if (plugins.length === 0) return '';
    
    const lines = [
      chalk.cyan('🔌 Loaded Plugins:'),
      ...plugins.map(plugin => 
        chalk.gray(`  ${plugin.name} v${plugin.version} - ${plugin.description}`)
      )
    ];
    
    return lines.join('\n');
  }

  formatGenerationSummary(
    totalRecords: number,
    models: string[],
    relations: number,
    duration: number,
    outputPath?: string
  ): string {
    const lines = [
      chalk.green.bold('✅ Generation Complete!'),
      '',
      chalk.cyan('📊 Summary:'),
      chalk.gray(`  Total Records: ${totalRecords.toLocaleString()}`),
      chalk.gray(`  Models: ${models.join(', ')}`),
      chalk.gray(`  Relations: ${relations}`),
      chalk.gray(`  Duration: ${duration.toFixed(2)}s`),
      chalk.gray(`  Records/Second: ${Math.round(totalRecords / duration)}`)
    ];
    
    if (outputPath) {
      lines.push(chalk.gray(`  Output: ${outputPath}`));
    }
    
    return lines.join('\n');
  }

  formatError(error: any, context?: any): string {
    const lines = [
      chalk.red.bold('❌ Error Occurred'),
      '',
      chalk.red(`Message: ${error.message || error}`),
    ];
    
    if (context) {
      lines.push(chalk.yellow('📍 Context:'));
      Object.entries(context).forEach(([key, value]) => {
        lines.push(chalk.gray(`  ${key}: ${value}`));
      });
    }
    
    if (error.stack && this.options.verbose) {
      lines.push(chalk.gray('\nStack Trace:'));
      lines.push(chalk.gray(error.stack));
    }
    
    return lines.join('\n');
  }

  formatHelp(): string {
    return `
${chalk.hex('#00d8c9').bold('Mocktail-CLI')} - Schema-aware mock data generator

${chalk.cyan('Usage:')}
  mocktail-cli [options] [command]

${chalk.cyan('Commands:')}
  generate    Generate mock data from schema
  docs        Show documentation
  help        Show this help message

${chalk.cyan('Options:')}
  --enable-plugins              Enable plugin system
  --plugin-dir <path>           Directory to load plugins from
  --performance-mode           Enable performance optimizations
  --memory-limit <mb>           Set memory limit in MB
  --batch-size <size>          Set batch size for processing
  --enable-advanced-relations  Enable advanced relation detection
  --relation-confidence <num>  Set relation detection confidence threshold
  --verbose                    Enable verbose output
  --quiet                      Suppress output except errors
  --no-logo                    Suppress logo output
  --force-logo                 Force show logo animation

${chalk.cyan('Examples:')}
  mocktail-cli generate --schema ./schema.prisma --count 100
  mocktail-cli generate --enable-plugins --performance-mode --count 10000
  mocktail-cli generate --enable-advanced-relations --relation-confidence 0.7

${chalk.cyan('Documentation:')}
  https://mocktail-cli.dev/docs
  https://github.com/mockilo/mocktail-cli
    `.trim();
  }
}

export const outputFormatter = new OutputFormatter();
