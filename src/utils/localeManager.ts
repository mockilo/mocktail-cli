import { faker } from '@faker-js/faker';

export interface LocaleConfig {
  locale: string;
  fakerInstance: typeof faker;
}

// Global locale configuration
let globalLocaleConfig: LocaleConfig = {
  locale: 'en',
  fakerInstance: faker
};

/**
 * Creates a locale-aware faker instance
 */
export async function createLocalizedFaker(locale: string = 'en'): Promise<LocaleConfig> {
  if (locale === 'en') {
    return {
      locale: 'en',
      fakerInstance: faker
    };
  }

  try {
    // Try to import locale-specific faker
    const localeModule = await import(`@faker-js/faker/locale/${locale}`);
    return {
      locale,
      fakerInstance: localeModule.faker
    };
  } catch (error) {
    console.warn(`⚠️ Locale '${locale}' not supported, falling back to 'en'`);
    return {
      locale: 'en',
      fakerInstance: faker
    };
  }
}

/**
 * Get available locales (common ones)
 */
export function getAvailableLocales(): string[] {
  return [
    'en',     // English
    'es',     // Spanish
    'fr',     // French
    'de',     // German
    'it',     // Italian
    'pt_BR',  // Portuguese (Brazil)
    'ja',     // Japanese
    'ko',     // Korean
    'zh_CN',  // Chinese (Simplified)
    'ru',     // Russian
    'ar',     // Arabic
    'hi',     // Hindi
    'nl',     // Dutch
    'sv',     // Swedish
    'da',     // Danish
    'no',     // Norwegian
    'fi',     // Finnish
    'pl',     // Polish
    'tr',     // Turkish
    'th',     // Thai
  ];
}

/**
 * Validate if a locale is likely supported
 */
export function isValidLocale(locale: string): boolean {
  return getAvailableLocales().includes(locale);
}

/**
 * Set global locale configuration
 */
export function setGlobalLocale(config: LocaleConfig): void {
  globalLocaleConfig = config;
}

/**
 * Get current global locale configuration
 */
export function getGlobalLocale(): LocaleConfig {
  return globalLocaleConfig;
}

/**
 * Get the current localized faker instance
 */
export function getLocalizedFaker(): typeof faker {
  return globalLocaleConfig.fakerInstance;
}
