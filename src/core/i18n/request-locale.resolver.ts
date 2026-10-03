import type { ExecutionContext } from '@nestjs/common';
import { I18nResolver } from 'nestjs-i18n';
import { resolveLocale, localeCookie } from '../../shared/locale';
interface LocaleRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: { locale?: string };
  organization?: { defaultLocale?: string };
}
export class RequestLocaleResolver implements I18nResolver {
  public resolve(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest<LocaleRequest>();
    const language = request.headers['accept-language'];
    const cookie = request.headers.cookie;
    return resolveLocale({
      user: request.user?.locale,
      organization: request.organization?.defaultLocale,
      acceptLanguage: Array.isArray(language) ? language[0] : language,
      cookie: localeCookie(Array.isArray(cookie) ? cookie[0] : cookie),
    });
  }
}
