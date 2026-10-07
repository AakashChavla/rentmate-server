export abstract class UnitLeaseDirectory {
  public abstract protectedTarget(org: string, unit: string, bed?: string): Promise<boolean>;
}
