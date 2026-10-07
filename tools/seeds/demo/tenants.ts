import { Readable } from 'node:stream';
import { TenantEntity } from '../../../src/modules/tenants/tenant.entity';
import { TenantDocumentEntity } from '../../../src/modules/documents/tenant-document.entity';
import { ROLE } from '../../../src/shared/identity.constants';
import {
  TENANT_STATUS as T,
  DOCUMENT_STATUS as D,
  DOCUMENT_TYPE,
  FILE_MIME,
} from '../../../src/shared/lease.constants';
import { TENANTS, DEMO } from './catalog';
import { ensure, required, demoId, type DemoContext } from './context';
import { demoPdf } from './pdf';
export async function seedTenants(context: DemoContext): Promise<void> {
  for (const [index, item] of TENANTS.entries()) {
    const propertyId = required(context.properties.get(item.property)).id;
    const linked = 'linked' in item ? required(context.users.get(ROLE.TENANT)) : null;
    const identity = 'DEMO-ID-' + String(index + 1).padStart(4, '0');
    const tenant = await ensure(context, TenantEntity, 'tenant:' + String(index), {
      organizationId: context.orgId,
      propertyId,
      fullName: item.name,
      phone: '000000' + String(index + 1).padStart(4, '0'),
      email: linked?.email ?? item.name.toLowerCase().replaceAll(' ', '.') + '@' + DEMO.domain,
      status: item.status,
      userId: linked?.id ?? null,
      emergencyContact: 'Demo contact — 0000000099',
      idCipher: context.cipher.encrypt(identity),
      idHash: context.cipher.hash(identity),
      idLastFour: identity.slice(-4),
      reviewReason:
        item.status === T.REJECTED ? 'Demo: unreadable sample; request a replacement.' : null,
    });
    context.tenants.push(tenant);
    await document(context, tenant, index);
  }
}
async function document(context: DemoContext, tenant: TenantEntity, index: number): Promise<void> {
  const key = 'document:' + String(index),
    id = demoId(context.orgId + ':' + key);
  if (await context.manager.getRepository(TenantDocumentEntity).findOneBy({ id })) return;
  const stored = await context.storage.put(
    Readable.from([demoPdf(tenant.fullName)]),
    FILE_MIME.PDF,
  );
  context.files.push(stored.key);
  const status =
    tenant.status === T.PENDING
      ? D.PENDING
      : tenant.status === T.REJECTED
        ? D.REJECTED
        : D.VERIFIED;
  await ensure(context, TenantDocumentEntity, key, {
    organizationId: context.orgId,
    propertyId: tenant.propertyId,
    tenantId: tenant.id,
    type: DOCUMENT_TYPE.OTHER,
    storageKey: stored.key,
    mime: stored.mime,
    size: stored.size,
    checksum: stored.checksum,
    status,
    reviewedBy: status === D.PENDING ? null : required(context.users.get(ROLE.OWNER)).id,
    reviewReason: status === D.REJECTED ? 'Demo: replacement requested.' : null,
  });
}
