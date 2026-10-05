import type { PermissionContext } from '../../shared/identity.types';
import type {
  PropertyRecord,
  PropertyInput,
  PropertyPatch,
  PropertyFilter,
  PropertyPage,
  PropertyConfiguration,
} from '../../shared/property.types';
export abstract class PropertyRepository {
  public abstract exists(org: string, id: string): Promise<boolean>;
  public abstract hasAny(org: string): Promise<boolean>;
  public abstract create(org: string, input: PropertyInput): Promise<PropertyRecord>;
  public abstract get(org: string, id: string): Promise<PropertyRecord | null>;
  public abstract list(
    org: string,
    filter: PropertyFilter,
    allowed: string[] | undefined,
  ): Promise<PropertyPage>;
  public abstract update(org: string, id: string, patch: PropertyPatch): Promise<void>;
  public abstract remove(org: string, id: string): Promise<void>;
  public abstract getConfig(org: string, id: string): Promise<PropertyConfiguration | null>;
  public abstract setConfig(
    org: string,
    id: string,
    configuration: PropertyConfiguration,
  ): Promise<void>;
  public abstract patchConfig(
    org: string,
    id: string,
    patch: Partial<PropertyConfiguration>,
  ): Promise<PropertyConfiguration>;
}
export abstract class PropertiesService {
  public abstract create(actor: PermissionContext, input: PropertyInput): Promise<PropertyRecord>;
  public abstract get(actor: PermissionContext, id: string): Promise<PropertyRecord>;
  public abstract list(actor: PermissionContext, filter: PropertyFilter): Promise<PropertyPage>;
  public abstract update(
    actor: PermissionContext,
    id: string,
    patch: PropertyPatch,
  ): Promise<PropertyRecord>;
  public abstract remove(actor: PermissionContext, id: string): Promise<void>;
  public abstract getConfig(actor: PermissionContext, id: string): Promise<PropertyConfiguration>;
  public abstract setConfig(
    actor: PermissionContext,
    id: string,
    input: Partial<PropertyConfiguration>,
  ): Promise<PropertyConfiguration>;
}
