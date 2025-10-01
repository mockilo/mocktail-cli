export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  memoryUsage: NodeJS.MemoryUsage;
  recordsGenerated: number;
  relationsProcessed: number;
  batchSize: number;
  totalBatches: number;
}

export interface PerformanceOptions {
  maxMemoryUsage?: number; // in MB
  batchSize?: number;
  enableMemoryMonitoring?: boolean;
  enableProgressTracking?: boolean;
  timeoutMs?: number;
  enableCaching?: boolean;
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private metrics: PerformanceMetrics;
  private options: PerformanceOptions;
  private memoryCheckInterval?: NodeJS.Timeout;
  private isGenerating: boolean = false;

  constructor(options: PerformanceOptions = {}) {
    this.options = {
      maxMemoryUsage: 1024, // 1GB default
      batchSize: 1000,
      enableMemoryMonitoring: true,
      enableProgressTracking: true,
      timeoutMs: 300000, // 5 minutes default
      enableCaching: true,
      ...options
    };

    this.metrics = {
      startTime: Date.now(),
      memoryUsage: process.memoryUsage(),
      recordsGenerated: 0,
      relationsProcessed: 0,
      batchSize: this.options.batchSize!,
      totalBatches: 0
    };
  }

  static getInstance(options?: PerformanceOptions): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer(options);
    }
    return PerformanceOptimizer.instance;
  }

  startGeneration(): void {
    this.isGenerating = true;
    this.metrics.startTime = Date.now();
    this.metrics.memoryUsage = process.memoryUsage();
    
    if (this.options.enableMemoryMonitoring) {
      this.startMemoryMonitoring();
    }
  }

  stopGeneration(): void {
    this.isGenerating = false;
    this.metrics.endTime = Date.now();
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
  }

  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(() => {
      if (!this.isGenerating) return;

      const currentMemory = process.memoryUsage();
      const memoryUsageMB = currentMemory.heapUsed / 1024 / 1024;

      if (memoryUsageMB > this.options.maxMemoryUsage!) {
        this.handleMemoryPressure();
      }
    }, 1000); // Check every second
  }

  private handleMemoryPressure(): void {
    console.warn('⚠️  High memory usage detected. Consider reducing batch size or count.');
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  calculateOptimalBatchSize(_totalRecords: number, complexity: number = 1): number {
    const baseBatchSize = this.options.batchSize!;
    const memoryLimit = this.options.maxMemoryUsage! * 1024 * 1024; // Convert to bytes
    const currentMemory = process.memoryUsage().heapUsed;
    const availableMemory = memoryLimit - currentMemory;
    
    // Adjust batch size based on available memory and complexity
    const adjustedBatchSize = Math.floor(
      (availableMemory / (1024 * 1024)) / (complexity * 10)
    );
    
    return Math.max(100, Math.min(baseBatchSize, adjustedBatchSize));
  }

  shouldUseBatching(totalRecords: number): boolean {
    return totalRecords > this.options.batchSize! * 2;
  }

  createBatches<T>(items: T[], batchSize?: number): T[][] {
    const size = batchSize || this.calculateOptimalBatchSize(items.length);
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += size) {
      batches.push(items.slice(i, i + size));
    }
    
    this.metrics.totalBatches = batches.length;
    return batches;
  }

  async processBatch<T, R>(
    batch: T[],
    processor: (item: T) => Promise<R> | R,
    onProgress?: (progress: number) => void
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < batch.length; i++) {
      const result = await processor(batch[i]!);
      results.push(result);
      
      if (onProgress) {
        const progress = ((i + 1) / batch.length) * 100;
        onProgress(progress);
      }
    }
    
    return results;
  }

  updateMetrics(recordsGenerated: number, relationsProcessed: number = 0): void {
    this.metrics.recordsGenerated += recordsGenerated;
    this.metrics.relationsProcessed += relationsProcessed;
    this.metrics.memoryUsage = process.memoryUsage();
  }

  getMetrics(): PerformanceMetrics {
    return {
      ...this.metrics,
      endTime: this.metrics.endTime || Date.now()
    };
  }

  getPerformanceReport(): string {
    const metrics = this.getMetrics();
    const duration = (metrics.endTime! - metrics.startTime) / 1000;
    const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
    const recordsPerSecond = metrics.recordsGenerated / duration;
    
    return `
📊 Performance Report:
  ⏱️  Duration: ${duration.toFixed(2)}s
  📈 Records Generated: ${metrics.recordsGenerated.toLocaleString()}
  🔗 Relations Processed: ${metrics.relationsProcessed.toLocaleString()}
  💾 Memory Usage: ${memoryUsageMB.toFixed(2)}MB
  ⚡ Records/Second: ${recordsPerSecond.toFixed(0)}
  📦 Batches: ${metrics.totalBatches}
  📏 Batch Size: ${metrics.batchSize}
    `.trim();
  }

  optimizeForLargeDatasets(totalRecords: number): PerformanceOptions {
    const optimizedOptions: PerformanceOptions = { ...this.options };
    
    if (totalRecords > 100000) {
      // Large dataset optimizations
      optimizedOptions.batchSize = Math.min(500, this.options.batchSize!);
      optimizedOptions.enableCaching = false; // Disable caching for very large datasets
      optimizedOptions.maxMemoryUsage = Math.max(512, this.options.maxMemoryUsage! / 2);
    } else if (totalRecords > 10000) {
      // Medium dataset optimizations
      optimizedOptions.batchSize = Math.min(1000, this.options.batchSize!);
      optimizedOptions.maxMemoryUsage = Math.max(256, this.options.maxMemoryUsage! * 0.75);
    }
    
    return optimizedOptions;
  }

  checkTimeout(): boolean {
    if (!this.options.timeoutMs) return false;
    
    const elapsed = Date.now() - this.metrics.startTime;
    return elapsed > this.options.timeoutMs;
  }

  getMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
  } {
    const usage = process.memoryUsage();
    const used = usage.heapUsed / 1024 / 1024;
    const total = usage.heapTotal / 1024 / 1024;
    const percentage = (used / total) * 100;
    
    return { used, total, percentage };
  }

  reset(): void {
    this.metrics = {
      startTime: Date.now(),
      memoryUsage: process.memoryUsage(),
      recordsGenerated: 0,
      relationsProcessed: 0,
      batchSize: this.options.batchSize!,
      totalBatches: 0
    };
  }
}

export const performanceOptimizer = PerformanceOptimizer.getInstance();
