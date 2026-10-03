export const SUPPORTED_LOCALES = ['en', 'hi'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';
export const LOCALE_PATTERN = /^(en|hi)(?:-|$)/i;
export const COOKIE_PATTERN = /(?:^|;\s*)NEXT_LOCALE=(en|hi)(?:;|$)/i;
