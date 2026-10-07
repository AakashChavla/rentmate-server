export abstract class LeaseOccupancy {
  public abstract change(
    org: string,
    unit: string,
    bed: string | null,
    occupied: boolean,
  ): Promise<void>;
}
