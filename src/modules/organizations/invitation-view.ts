import type { InviteRecord, InviteView } from '../../shared/property.types';
import { INVITE_STATUS as S } from '../../shared/property.constants';
export function invitationView(record: InviteRecord): InviteView {
  return {
    id: record.id,
    email: record.email,
    roleKey: record.roleId,
    scopeType: record.scopeType,
    scopeId: record.scopeId,
    status:
      record.status === S.PENDING && record.expiresAt <= new Date() ? S.EXPIRED : record.status,
    expiresAt: record.expiresAt,
    locale: record.locale,
    createdAt: record.createdAt,
  };
}
