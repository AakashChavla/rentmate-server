export abstract class SessionRevoker {
  abstract revokeAllForUser(organizationId: string, userId: string): Promise<void>;
  abstract revokeFamily(organizationId: string, familyId: string): Promise<void>;
  abstract revokeOtherFamiliesForUser(
    organizationId: string,
    userId: string,
    keepFamilyId: string,
  ): Promise<void>;
}
