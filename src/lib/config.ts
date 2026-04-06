export const LANGUAGES = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  'zh-hk': '繁體中文',
  'zh-cn': '简体中文',
} as const;

export type Lang = keyof typeof LANGUAGES;
export const DEFAULT_LANG: Lang = 'ko';
export const SITE_TITLE = 'SmartShip Guide';
