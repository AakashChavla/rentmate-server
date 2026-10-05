import { OrganizationPropertyDirectory } from '../../modules/organizations';
export class FakePropertyDirectory extends OrganizationPropertyDirectory {
  public override exists(_org: string, _id: string): Promise<boolean> {
    return Promise.resolve(true);
  }
  public override hasAny(_org: string): Promise<boolean> {
    return Promise.resolve(false);
  }
}
