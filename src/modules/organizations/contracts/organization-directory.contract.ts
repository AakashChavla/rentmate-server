export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export abstract class OrganizationDirectory {
  abstract findById(id: string): Promise<OrganizationRecord | null>;
  abstract findBySlug(slug: string): Promise<OrganizationRecord | null>;
}
