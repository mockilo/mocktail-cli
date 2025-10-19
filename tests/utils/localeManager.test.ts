import {
  createLocalizedFaker,
  getAvailableLocales,
  isValidLocale,
  setGlobalLocale,
  getGlobalLocale,
  getLocalizedFaker,
  setGlobalSeed,
  clearLocaleCache,
  getCacheStats,
  LocaleConfig
} from '../../src/utils/localeManager';
import { faker } from '@faker-js/faker';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

const mockFs = require('fs');
const mockPath = require('path');

describe('LocaleManager', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearLocaleCache();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock path.join to return predictable paths
    mockPath.join.mockImplementation((...args: string[]) => args.join('/'));
    mockPath.dirname.mockImplementation((p: string) => p.split('/').slice(0, -1).join('/'));
    
    // Mock require.resolve to return a fake path
    const mockResolve = jest.fn().mockReturnValue('/fake/path/to/faker');
    (require as any).resolve = mockResolve;
  });

  describe('Input Validation', () => {
    test('should validate locale format correctly', () => {
      // Mock getAvailableLocales to return a known set
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['en.js', 'es.js', 'fr.js', 'en_US.js', 'pt-BR.js', 'zh_CN.js', '123.js']);
      
      expect(isValidLocale('en')).toBe(true);
      expect(isValidLocale('en_US')).toBe(true);
      expect(isValidLocale('pt-BR')).toBe(true);
      expect(isValidLocale('zh_CN')).toBe(true);
      
      expect(isValidLocale('')).toBe(false);
      expect(isValidLocale('en@')).toBe(false);
      expect(isValidLocale('en/../')).toBe(false);
      expect(isValidLocale('a'.repeat(21))).toBe(false);
      expect(isValidLocale('123')).toBe(true);
    });

    test('should throw error for invalid locale in createLocalizedFaker', async () => {
      await expect(createLocalizedFaker('en@')).rejects.toThrow('Invalid locale format');
      await expect(createLocalizedFaker('')).rejects.toThrow('Invalid locale format');
      await expect(createLocalizedFaker('en/../')).rejects.toThrow('Invalid locale format');
    });
  });

  describe('Locale Discovery', () => {
    test('should get available locales dynamically', () => {
      // Mock fs.existsSync to return true for locale directory
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['en.js', 'es.js', 'fr.js', 'de.js']);
      
      const locales = getAvailableLocales();
      
      expect(locales).toEqual(['de', 'en', 'es', 'fr']);
      expect(mockFs.existsSync).toHaveBeenCalled();
      expect(mockFs.readdirSync).toHaveBeenCalled();
    });

    test('should fallback to hardcoded locales when discovery fails', () => {
      // Mock fs.existsSync to return false
      mockFs.existsSync.mockReturnValue(false);
      
      const locales = getAvailableLocales();
      
      expect(locales).toContain('en');
      expect(locales).toContain('es');
      expect(locales).toContain('fr');
      expect(locales.length).toBeGreaterThan(20);
    });

    test('should handle readdirSync errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const locales = getAvailableLocales();
      
      expect(locales).toContain('en');
      expect(locales.length).toBeGreaterThan(20);
    });
  });

  describe('Locale Loading', () => {
    test('should load English locale correctly', async () => {
      const result = await createLocalizedFaker('en');
      
      expect(result.locale).toBe('en');
      expect(result.fakerInstance).toBeDefined();
      expect(result.fakerInstance).toBe(faker);
    });

    test('should cache locale instances', async () => {
      const result1 = await createLocalizedFaker('en');
      const result2 = await createLocalizedFaker('en');
      
      expect(result1).toBe(result2); // Same reference due to caching
    });

    test('should handle concurrent loading of same locale', async () => {
      const promises = [
        createLocalizedFaker('en'),
        createLocalizedFaker('en'),
        createLocalizedFaker('en')
      ];
      
      const results = await Promise.all(promises);
      
      // All should be the same instance
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });

    test('should handle locale loading errors gracefully', async () => {
      // Mock file system to indicate locale doesn't exist
      mockFs.existsSync.mockReturnValue(false);
      
      const result = await createLocalizedFaker('invalid');
      
      expect(result.locale).toBe('en'); // Should fallback to English
      expect(result.fakerInstance).toBe(faker);
    });
  });

  describe('Global State Management', () => {
    test('should set and get global locale', () => {
      const config: LocaleConfig = {
        locale: 'en',
        fakerInstance: faker
      };
      
      setGlobalLocale(config);
      const retrieved = getGlobalLocale();
      
      expect(retrieved.locale).toBe('en');
      expect(retrieved.fakerInstance).toBe(faker);
    });

    test('should validate global locale config', () => {
      expect(() => setGlobalLocale(null as any)).toThrow('Invalid LocaleConfig');
      expect(() => setGlobalLocale({} as any)).toThrow('Invalid LocaleConfig');
      expect(() => setGlobalLocale({ locale: 'en' } as any)).toThrow('Invalid LocaleConfig');
    });

    test('should return copy of global locale to prevent mutation', () => {
      const config: LocaleConfig = {
        locale: 'en',
        fakerInstance: faker
      };
      
      setGlobalLocale(config);
      const retrieved = getGlobalLocale();
      
      // Modify the retrieved config
      retrieved.locale = 'modified';
      
      // Original should not be affected
      const retrievedAgain = getGlobalLocale();
      expect(retrievedAgain.locale).toBe('en');
    });

    test('should get localized faker instance', () => {
      const config: LocaleConfig = {
        locale: 'en',
        fakerInstance: faker
      };
      
      setGlobalLocale(config);
      const fakerInstance = getLocalizedFaker();
      
      expect(fakerInstance).toBe(faker);
    });

    test('should set seed value correctly', () => {
      const seedSpy = jest.spyOn(faker, 'seed');
      
      setGlobalSeed(12345);
      
      expect(seedSpy).toHaveBeenCalledWith(12345);
      
      seedSpy.mockRestore();
    });

    test('should validate seed value', () => {
      expect(() => setGlobalSeed(1.5)).toThrow('Seed value must be an integer');
      expect(() => setGlobalSeed('123' as any)).toThrow('Seed value must be an integer');
    });
  });

  describe('Cache Management', () => {
    test('should clear cache', () => {
      // Load a locale to populate cache
      createLocalizedFaker('en');
      
      const statsBefore = getCacheStats();
      expect(statsBefore.cachedLocales).toContain('en');
      
      clearLocaleCache();
      
      const statsAfter = getCacheStats();
      expect(statsAfter.cachedLocales).toHaveLength(0);
    });

    test('should provide cache statistics', async () => {
      const statsBefore = getCacheStats();
      expect(statsBefore.cachedLocales).toHaveLength(0);
      expect(statsBefore.loadingLocales).toHaveLength(0);
      
      await createLocalizedFaker('en');
      
      const statsAfter = getCacheStats();
      expect(statsAfter.cachedLocales).toContain('en');
    });
  });

  describe('Performance and Memory', () => {
    test('should not create duplicate instances for same locale', async () => {
      const result1 = await createLocalizedFaker('en');
      const result2 = await createLocalizedFaker('en');
      
      expect(result1).toBe(result2);
    });

    test('should handle multiple concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      const promises = Array.from({ length: 10 }, () => createLocalizedFaker('en'));
      const results = await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should be fast due to caching
      expect(duration).toBeLessThan(100);
      
      // All results should be the same instance
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toBe(firstResult);
      });
    });
  });
});