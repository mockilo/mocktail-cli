import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import * as path from 'path';

export interface LocaleConfig {
  locale: string;
  fakerInstance: typeof faker;
}

// Cache for locale instances to prevent repeated imports
const localeCache = new Map<string, LocaleConfig>();

// Loading promises to prevent race conditions
const loadingPromises = new Map<string, Promise<LocaleConfig>>();

// Global locale configuration with concurrency protection
let globalLocaleConfig: LocaleConfig = {
  locale: 'en',
  fakerInstance: faker
};

// Input validation for locale strings
function validateLocale(locale: string): boolean {
  if (typeof locale !== 'string') return false;
  if (locale.length === 0 || locale.length > 20) return false;
  // Only allow alphanumeric characters, underscores, and hyphens
  return /^[a-zA-Z0-9_-]+$/.test(locale);
}

// Enhanced error logging
function logError(message: string, error?: Error, context?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
  const errorStr = error ? ` | Error: ${error.message}` : '';
  
  console.error(`[${timestamp}] LocaleManager Error: ${message}${errorStr}${contextStr}`);
}

/**
 * Creates a locale-aware faker instance with caching and concurrency protection
 */
export async function createLocalizedFaker(locale: string = 'en'): Promise<LocaleConfig> {
  // Input validation
  if (!validateLocale(locale)) {
    logError(`Invalid locale format: ${locale}`, undefined, { locale });
    throw new Error(`Invalid locale format: ${locale}. Locale must be alphanumeric with underscores/hyphens only.`);
  }

  // Return cached instance if available
  if (localeCache.has(locale)) {
    return localeCache.get(locale)!;
  }

  // Return existing loading promise if already in progress
  if (loadingPromises.has(locale)) {
    return loadingPromises.get(locale)!;
  }

  // Handle English locale (default)
  if (locale === 'en') {
    const config: LocaleConfig = {
      locale: 'en',
      fakerInstance: faker
    };
    localeCache.set(locale, config);
    return config;
  }

  // Create loading promise for async locale loading
  const loadingPromise = loadLocaleAsync(locale);
  loadingPromises.set(locale, loadingPromise);

  try {
    const result = await loadingPromise;
    localeCache.set(locale, result);
    return result;
  } catch (error) {
    logError(`Failed to load locale: ${locale}`, error as Error, { locale });
    console.warn(`⚠️ Locale '${locale}' not supported, falling back to 'en'`);
    
    const fallbackConfig: LocaleConfig = {
      locale: 'en',
      fakerInstance: faker
    };
    localeCache.set(locale, fallbackConfig);
    return fallbackConfig;
  } finally {
    // Clean up loading promise
    loadingPromises.delete(locale);
  }
}

/**
 * Async locale loading with enhanced error handling
 */
async function loadLocaleAsync(locale: string): Promise<LocaleConfig> {
  try {
    // Validate locale exists before attempting import
    if (!await isLocaleAvailable(locale)) {
      throw new Error(`Locale '${locale}' is not available in the faker package`);
    }

    // Dynamic import with path validation
    const localeModule = await import(`@faker-js/faker/locale/${locale}`);
    
    if (!localeModule.faker) {
      throw new Error(`Locale module '${locale}' does not export faker instance`);
    }

    return {
      locale,
      fakerInstance: localeModule.faker
    };
  } catch (error) {
    // Re-throw with more context
    throw new Error(`Failed to load locale '${locale}': ${(error as Error).message}`);
  }
}

/**
 * Check if a locale is available in the faker package
 */
async function isLocaleAvailable(locale: string): Promise<boolean> {
  try {
    const fakerPath = require.resolve('@faker-js/faker');
    const localeDir = path.join(path.dirname(fakerPath), 'locale');
    const localeFile = path.join(localeDir, `${locale}.js`);
    
    return fs.existsSync(localeFile);
  } catch (error) {
    logError(`Error checking locale availability: ${locale}`, error as Error, { locale });
    return false;
  }
}

/**
 * Get available locales dynamically from the faker package
 */
export function getAvailableLocales(): string[] {
  try {
    const fakerPath = require.resolve('@faker-js/faker');
    const localeDir = path.join(path.dirname(fakerPath), 'locale');
    
    if (!fs.existsSync(localeDir)) {
      logError('Faker locale directory not found', undefined, { localeDir });
      return getFallbackLocales();
    }

    const localeFiles = fs.readdirSync(localeDir)
      .filter(file => file.endsWith('.js') && !file.includes('.d.ts'))
      .map(file => file.replace('.js', ''))
      .sort();

    if (localeFiles.length === 0) {
      logError('No locale files found in faker package', undefined, { localeDir });
      return getFallbackLocales();
    }

    return localeFiles;
  } catch (error) {
    logError('Failed to discover locales dynamically', error as Error);
    return getFallbackLocales();
  }
}

/**
 * Fallback locale list when dynamic discovery fails
 */
function getFallbackLocales(): string[] {
  return [
    'en', 'en_AU', 'en_CA', 'en_GB', 'en_US', 'en_ZA',
    'es', 'es_MX', 'fr', 'fr_CA', 'fr_CH', 'de', 'de_AT', 'de_CH',
    'it', 'pt', 'pt_BR', 'pt_PT', 'ja', 'ko', 'zh_CN', 'zh_TW',
    'ru', 'ar', 'hi', 'nl', 'nl_BE', 'sv', 'da', 'nb_NO', 'fi',
    'pl', 'tr', 'th', 'vi', 'uk', 'he', 'hr', 'hu', 'ro', 'ro_MD',
    'sk', 'cs_CZ', 'el', 'bg', 'mk', 'sr_RS_latin', 'lv', 'lt',
    'et', 'sl', 'sq', 'mt', 'is', 'ga', 'cy', 'af_ZA', 'zu_ZA',
    'yo_NG', 'sw', 'am', 'ti', 'so', 'om', 'rw', 'lg', 'ny',
    'sn', 'tn', 'st', 'ss', 've', 'ts', 'xh', 'zu', 'af', 'nso',
    'zu', 'xh', 'st', 'ss', 've', 'ts', 'tn', 'sn', 'ny', 'lg',
    'rw', 'om', 'so', 'ti', 'am', 'sw', 'yo', 'zu', 'af', 'nso'
  ];
}

/**
 * Validate if a locale is likely supported (synchronous check)
 */
export function isValidLocale(locale: string): boolean {
  if (!validateLocale(locale)) {
    return false;
  }
  
  const availableLocales = getAvailableLocales();
  return availableLocales.includes(locale);
}

/**
 * Validate if a locale is supported (asynchronous check with file system)
 */
export async function isLocaleSupported(locale: string): Promise<boolean> {
  if (!validateLocale(locale)) {
    return false;
  }
  
  return await isLocaleAvailable(locale);
}

/**
 * Set global locale configuration with validation
 */
export function setGlobalLocale(config: LocaleConfig): void {
  if (!config || typeof config.locale !== 'string' || !config.fakerInstance) {
    throw new Error('Invalid LocaleConfig: locale must be a string and fakerInstance must be provided');
  }
  
  if (!validateLocale(config.locale)) {
    throw new Error(`Invalid locale format: ${config.locale}`);
  }
  
  globalLocaleConfig = config;
}

/**
 * Get current global locale configuration
 */
export function getGlobalLocale(): LocaleConfig {
  return { ...globalLocaleConfig }; // Return copy to prevent external mutation
}

/**
 * Get the globally configured faker instance
 */
export function getLocalizedFaker(): typeof faker {
  return globalLocaleConfig.fakerInstance;
}

/**
 * Set seed value for reproducible data generation
 */
export function setGlobalSeed(seedValue: number): void {
  if (typeof seedValue !== 'number' || !Number.isInteger(seedValue)) {
    throw new Error('Seed value must be an integer');
  }
  
  globalLocaleConfig.fakerInstance.seed(seedValue);
}

/**
 * Clear locale cache (useful for testing or memory management)
 */
export function clearLocaleCache(): void {
  localeCache.clear();
  loadingPromises.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { cachedLocales: string[]; loadingLocales: string[] } {
  return {
    cachedLocales: Array.from(localeCache.keys()),
    loadingLocales: Array.from(loadingPromises.keys())
  };
}

/**
 * Preload a locale into cache
 */
export async function preloadLocale(locale: string): Promise<void> {
  if (!validateLocale(locale)) {
    throw new Error(`Invalid locale format: ${locale}`);
  }
  
  await createLocalizedFaker(locale);
}
