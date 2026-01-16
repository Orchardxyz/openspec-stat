import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Compatible with both CJS and ESM
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDirname = (): string => {
  // Check if we're in ESM by looking for import.meta
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    return dirname(fileURLToPath(import.meta.url));
  }
  // In CJS, use __dirname which is injected by Node.js
  // We need to use eval to avoid bundler/transpiler issues
  // eslint-disable-next-line no-eval
  return eval('__dirname');
};

const __dirname = getDirname();

type Language = 'en' | 'zh-CN';
type TranslationKey = string;
type Translations = Record<TranslationKey, string>;

let currentLanguage: Language = 'en';
const translations: Record<Language, Translations> = {
  en: {},
  'zh-CN': {},
};

function loadTranslations() {
  try {
    const enPath = join(__dirname, 'locales', 'en.json');
    const zhPath = join(__dirname, 'locales', 'zh-CN.json');

    translations['en'] = JSON.parse(readFileSync(enPath, 'utf-8'));
    translations['zh-CN'] = JSON.parse(readFileSync(zhPath, 'utf-8'));
  } catch (error) {
    console.error('Failed to load translations:', error);
  }
}

export function setLanguage(lang: Language) {
  currentLanguage = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  if (Object.keys(translations[currentLanguage]).length === 0) {
    loadTranslations();
  }

  let text = translations[currentLanguage][key] || translations['en'][key] || key;

  if (params) {
    Object.keys(params).forEach((paramKey) => {
      text = text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(params[paramKey]));
    });
  }

  return text;
}

export function initI18n(lang?: string) {
  if (lang && (lang === 'en' || lang === 'zh-CN' || lang === 'zh')) {
    setLanguage(lang === 'zh' ? 'zh-CN' : (lang as Language));
  } else {
    const envLang = process.env.LANG || process.env.LANGUAGE || '';
    if (envLang.includes('zh') || envLang.includes('CN')) {
      setLanguage('zh-CN');
    }
  }
  loadTranslations();
}
