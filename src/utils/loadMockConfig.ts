// src/utils/loadMockConfig.ts
import * as path from 'path';
import * as fs from 'fs';
import type { MockConfig } from '../types';

export default function loadMockConfig(configPath: string = './mocktail-cli.config.js'): MockConfig | null {
  const fullPath = path.resolve(configPath);

  if (!fs.existsSync(fullPath)) return null;

  try {
    // allow JSON or JS module
    const config = require(fullPath);
    return typeof config === 'function' ? config() : config;
  } catch (err: any) {
    console.error('Failed to load mocktail-cli config:', err.message);
    return null;
  }
}
