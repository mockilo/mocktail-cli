import ora from 'ora';
import chalk from 'chalk';

export interface ProgressOptions {
  total: number;
  current: number;
  message?: string;
  showPercentage?: boolean;
  showETA?: boolean;
  showSpeed?: boolean;
}

export class ProgressIndicator {
  private spinner: any;
  private startTime: number;
  private lastUpdate: number;
  private updateInterval: number = 100; // Update every 100ms
  private isActive: boolean = false;

  constructor() {
    this.spinner = ora();
    this.startTime = Date.now();
    this.lastUpdate = Date.now();
  }

  start(message: string = 'Starting...'): void {
    this.isActive = true;
    this.startTime = Date.now();
    this.lastUpdate = Date.now();
    this.spinner.start(message);
  }

  update(options: ProgressOptions): void {
    if (!this.isActive) return;

    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) return;
    this.lastUpdate = now;

    const { total, current, message, showPercentage = true, showETA = true, showSpeed = true } = options;
    
    const percentage = Math.round((current / total) * 100);
    const elapsed = (now - this.startTime) / 1000;
    const speed = current / elapsed;
    const eta = current > 0 ? ((total - current) / speed) : 0;

    let statusText = message || 'Processing...';
    
    if (showPercentage) {
      statusText += ` ${percentage}%`;
    }
    
    if (showSpeed && speed > 0) {
      statusText += ` (${Math.round(speed)}/s)`;
    }
    
    if (showETA && eta > 0) {
      statusText += ` ETA: ${this.formatTime(eta)}`;
    }

    // Create progress bar
    const progressBar = this.createProgressBar(current, total);
    statusText += `\n${progressBar}`;

    this.spinner.text = statusText;
  }

  private createProgressBar(current: number, total: number): string {
    const width = 30;
    const percentage = current / total;
    const filled = Math.round(width * percentage);
    const empty = width - filled;
    
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    
    return `[${filledBar}${emptyBar}] ${Math.round(percentage * 100)}%`;
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m`;
    } else {
      return `${Math.round(seconds / 3600)}h`;
    }
  }

  succeed(message: string = 'Completed!'): void {
    this.isActive = false;
    this.spinner.succeed(chalk.green(message));
  }

  fail(message: string = 'Failed!'): void {
    this.isActive = false;
    this.spinner.fail(chalk.red(message));
  }

  warn(message: string = 'Warning!'): void {
    this.isActive = false;
    this.spinner.warn(chalk.yellow(message));
  }

  info(message: string): void {
    this.spinner.info(chalk.blue(message));
  }

  stop(): void {
    this.isActive = false;
    this.spinner.stop();
  }
}

export const progressIndicator = new ProgressIndicator();
