import { Inject, Injectable } from '@nestjs/common';
import {
  TenantRepository,
  TenantPolicy,
  TenantsService,
  KycDocumentDirectory,
} from './tenants.contract';
import { InvitationsService } from '../organizations';
import { UnitRepository } from '../units';
import { FieldEncryptor } from '../../integrations/field-encryption/field-encryptor.contract';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import {
  TENANT_STATUS as S,
  TENANT_PERMISSION as P,
  DOCUMENT_STATUS as D,
  LEASE_LIMIT as L,
} from '../../shared/lease.constants';
import { ROLE, SCOPE } from '../../shared/identity.constants';
import type { PermissionContext } from '../../shared/identity.types';
import type {
  TenantInput,
  TenantView,
  TenantRecord,
  TenantStatus,
  DomainFilter,
} from '../../shared/lease.types';
import { tenantView } from './tenant-view';
@Injectable()
export class DefaultTenantsService extends TenantsService {
  public constructor(
    @Inject(TenantRepository) private readonly repo: TenantRepository,
    @Inject(TenantPolicy) private readonly policy: TenantPolicy,
    @Inject(KycDocumentDirectory) private readonly docs: KycDocumentDirectory,
    @Inject(FieldEncryptor) private readonly cipher: FieldEncryptor,
    @Inject(InvitationsService) private readonly invites: InvitationsService,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
    @Inject(UnitRepository) private readonly units: UnitRepository,
  ) {
    super();
  }
  public override create(actor: PermissionContext, input: TenantInput): Promise<TenantView> {
    return this.tx.run(async () => {
      await this.units.lockProperty(actor.organization.id, input.propertyId);
      await this.policy.property(actor, input.propertyId, P.CREATE);
      const id = input.idNumber?.trim();
      return tenantView(
        await this.repo.create(actor.organization.id, {
          ...input,
          idCipher: id ? this.cipher.encrypt(id) : null,
          idHash: id ? this.cipher.hash(id) : null,
          idLastFour: id ? id.slice(-L.ID_MIN) : null,
        }),
      );
    });
  }
  public override async get(actor: PermissionContext, id: string): Promise<TenantView> {
    return tenantView(await this.policy.get(actor, id, P.READ));
  }
  public override async list(
    actor: PermissionContext,
    filter: DomainFilter,
  ): Promise<{ items: TenantView[]; nextCursor: string | null }> {
    if (filter.status && !Object.values(S).some((status) => status === filter.status))
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    const own = this.policy.ownOnly(actor);
    if (filter.propertyId && !own) await this.policy.property(actor, filter.propertyId, P.READ);
    const page = await this.repo.list(
      actor.organization.id,
      filter,
      this.policy.allowed(actor, P.READ),
      own ? actor.user.id : undefined,
    );
    return { ...page, items: page.items.map(tenantView) };
  }
  public override update(
    actor: PermissionContext,
    id: string,
    input: Partial<Pick<TenantRecord, 'fullName' | 'phone' | 'emergencyContact'>>,
  ): Promise<TenantView> {
    return this.tx.run(async () => {
      const row = await this.policy.get(actor, id, P.UPDATE);
      await this.units.lockProperty(actor.organization.id, row.propertyId);
      await this.policy.get(actor, id, P.UPDATE);
      const fields = Object.fromEntries(
        Object.entries(input).filter(([, v]) => typeof v !== 'undefined'),
      );
      if (Object.keys(fields).length) await this.repo.update(actor.organization.id, id, fields);
      return this.get(actor, id);
    });
  }
  public override review(
    actor: PermissionContext,
    id: string,
    status: TenantStatus,
    reason?: string,
  ): Promise<TenantView> {
    return this.tx.run(async () => {
      const org = actor.organization.id;
      if (status === S.REJECTED && !reason?.trim())
        throw new AppException(ErrorCode.VALIDATION_ERROR);
      const row = await this.policy.get(actor, id, P.UPDATE);
      await this.units.lockProperty(org, row.propertyId);
      await this.policy.property(actor, row.propertyId, P.UPDATE);
      await this.repo.lock(org, id);
      if (status === S.VERIFIED) {
        const docs = await this.docs.list(org, id);
        if (!docs.length || docs.some((d) => d.status !== D.VERIFIED))
          throw new AppException(ErrorCode.TENANT_KYC_REQUIRED);
      }
      await this.repo.review(org, id, status, reason ?? null);
      return this.get(actor, id);
    });
  }
  public override async invite(actor: PermissionContext, id: string): Promise<void> {
    const row = await this.policy.get(actor, id, P.UPDATE);
    await this.policy.property(actor, row.propertyId, P.UPDATE);
    await this.invites.create(actor, {
      email: row.email,
      roleKey: ROLE.TENANT,
      scopeType: SCOPE.PROPERTY,
      scopeId: row.propertyId,
    });
  }
}
