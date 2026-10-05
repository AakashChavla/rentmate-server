export abstract class OrganizationPropertyDirectory {
  public abstract exists(org: string, id: string): Promise<boolean>;
  public abstract hasAny(org: string): Promise<boolean>;
}
