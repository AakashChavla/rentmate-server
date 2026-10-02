import { TenantContext } from '../tenant-context';

describe('TenantContext', () => {
  it('keeps organization id inside the async context only', () => {
    expect(TenantContext.getOrganizationId()).toBeUndefined();

    TenantContext.run({ requestId: 'req-1' }, () => {
      expect(TenantContext.getOrganizationId()).toBeUndefined();
      TenantContext.setVerifiedIdentity({
        organizationId: 'org-1',
        userId: 'user-1',
      });
      expect(TenantContext.getOrganizationId()).toBe('org-1');
      expect(TenantContext.getUserId()).toBe('user-1');
      expect(TenantContext.getRequestId()).toBe('req-1');
    });

    expect(TenantContext.getOrganizationId()).toBeUndefined();
    expect(TenantContext.getUserId()).toBeUndefined();
  });

  it('refuses to set identity when no request context is active', () => {
    expect(() =>
      TenantContext.setVerifiedIdentity({ organizationId: 'org-1', userId: 'user-1' }),
    ).toThrow('TenantContext is not active');
  });
});
