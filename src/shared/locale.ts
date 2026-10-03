import {
  DEFAULT_LOCALE,
  LOCALE_PATTERN,
  COOKIE_PATTERN,
  type SupportedLocale,
} from './locale.constants';
export interface LocaleSources {
  user?: string | undefined;
  cookie?: string | undefined;
  acceptLanguage?: string | undefined;
  organization?: string | undefined;
}
function supported(value: string | undefined): SupportedLocale | undefined {
  const matched = value?.match(LOCALE_PATTERN)?.[1]?.toLowerCase();
  return matched as SupportedLocale | undefined;
}
export function resolveLocale(sources: LocaleSources): SupportedLocale {
  return (
    supported(sources.user) ??
    supported(sources.cookie) ??
    supported(sources.acceptLanguage) ??
    supported(sources.organization) ??
    DEFAULT_LOCALE
  );
}
export function localeCookie(header: string | undefined): string | undefined {
  return header?.match(COOKIE_PATTERN)?.[1];
}
