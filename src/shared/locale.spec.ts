import { resolveLocale } from './locale';
describe('locale resolution', () => {
  it('orders user, cookie, header, organization and default', () => {
    expect(resolveLocale({ user: 'hi', cookie: 'en' })).toBe('hi');
    expect(resolveLocale({ cookie: 'hi', acceptLanguage: 'en' })).toBe('hi');
    expect(resolveLocale({ acceptLanguage: 'hi-IN, en;q=0.8', organization: 'en' })).toBe('hi');
    expect(resolveLocale({ organization: 'hi' })).toBe('hi');
    expect(resolveLocale({ acceptLanguage: 'fr' })).toBe('en');
  });
});
