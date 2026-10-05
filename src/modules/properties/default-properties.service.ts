import { Inject, Injectable } from '@nestjs/common';
import { PropertyRepository, PropertiesService } from './properties.contract';
import { PermissionChecker, PermissionContextLoader } from '../authorization';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { EventBus } from '../../core/events/event-bus.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import type { PermissionContext } from '../../shared/identity.types';
import type {
  PropertyRecord,
  PropertyInput,
  PropertyPatch,
  PropertyFilter,
  PropertyConfiguration,
} from '../../shared/property.types';
import {
  DOMAIN_PERMISSION as P,
  DOMAIN_EVENT as E,
  PROPERTY_STATUS as S,
} from '../../shared/property.constants';
import { configuration, configurationPatch, requireTimezone } from './property-schema';
@Injectable()
export class DefaultPropertiesService extends PropertiesService {
  public constructor(
    @Inject(PropertyRepository) private readonly repo: PropertyRepository,
    @Inject(PermissionChecker) private readonly permissions: PermissionChecker,
    @Inject(PermissionContextLoader) private readonly contexts: PermissionContextLoader,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
    @Inject(EventBus) private readonly events: EventBus,
  ) {
    super();
  }
  public override async create(
    actor: PermissionContext,
    input: PropertyInput,
  ): Promise<PropertyRecord> {
    this.require(actor, P.CREATE);
    requireTimezone(input.timezone);
    const config = configuration(input.type, input.configuration ?? {});
    return this.tx.run(async () => {
      const property = await this.repo.create(actor.organization.id, input);
      await this.repo.setConfig(actor.organization.id, property.id, config);
      await this.tx.afterCommit(async () => {
        await this.contexts.invalidateOrganization(actor.organization.id);
        this.events.publish(E.CREATED, {
          organizationId: actor.organization.id,
          propertyId: property.id,
        });
      });
      return property;
    });
  }
  public override async get(actor: PermissionContext, id: string): Promise<PropertyRecord> {
    const record = await this.record(actor, id);
    this.require(actor, P.READ, id);
    return record;
  }
  public override list(
    actor: PermissionContext,
    filter: PropertyFilter,
  ): ReturnType<PropertyRepository['list']> {
    const allowed = this.allowed(actor, P.READ);
    if (allowed && !allowed.length) throw new AppException(ErrorCode.FORBIDDEN);
    return this.repo.list(actor.organization.id, filter, allowed);
  }
  public override async update(
    actor: PermissionContext,
    id: string,
    patch: PropertyPatch,
  ): Promise<PropertyRecord> {
    await this.record(actor, id);
    this.require(actor, P.UPDATE, id);
    if (!Object.values(patch).some((value: unknown) => value !== undefined))
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    requireTimezone(patch.timezone);
    await this.tx.run(async () => {
      await this.repo.update(actor.organization.id, id, patch);
      if (patch.status === S.ARCHIVED)
        await this.tx.afterCommit(async () => {
          await Promise.resolve();
          this.events.publish(E.ARCHIVED, {
            organizationId: actor.organization.id,
            propertyId: id,
          });
        });
    });
    return this.record(actor, id);
  }
  public override async remove(actor: PermissionContext, id: string): Promise<void> {
    await this.record(actor, id);
    this.require(actor, P.DELETE, id);
    await this.tx.run(async () => {
      await this.repo.remove(actor.organization.id, id);
      await this.tx.afterCommit(async () => {
        await this.contexts.invalidateOrganization(actor.organization.id);
        this.events.publish(E.ARCHIVED, { organizationId: actor.organization.id, propertyId: id });
      });
    });
  }
  public override async getConfig(
    actor: PermissionContext,
    id: string,
  ): Promise<PropertyConfiguration> {
    await this.get(actor, id);
    const result = await this.repo.getConfig(actor.organization.id, id);
    if (!result) throw new AppException(ErrorCode.NOT_FOUND);
    return result;
  }
  public override async setConfig(
    actor: PermissionContext,
    id: string,
    input: Partial<PropertyConfiguration>,
  ): Promise<PropertyConfiguration> {
    const property = await this.record(actor, id);
    this.require(actor, P.UPDATE, id);
    const patch = configurationPatch(property.type, input);
    return this.repo.patchConfig(actor.organization.id, id, patch);
  }
  private async record(actor: PermissionContext, id: string): Promise<PropertyRecord> {
    const result = await this.repo.get(actor.organization.id, id);
    if (!result) throw new AppException(ErrorCode.NOT_FOUND);
    return result;
  }
  private require(actor: PermissionContext, permission: string, propertyId?: string): void {
    if (!this.permissions.can(actor, permission, propertyId ? { propertyId } : {}))
      throw new AppException(ErrorCode.FORBIDDEN);
  }
  private allowed(actor: PermissionContext, permission: string): string[] | undefined {
    if (this.permissions.can(actor, permission)) return undefined;
    return actor.roles
      .filter((r) => this.permissions.can(actor, permission, { propertyId: r.scopeId }))
      .map((r) => r.scopeId);
  }
}
