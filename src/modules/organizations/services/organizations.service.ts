import { Injectable } from '@nestjs/common';
import { OrganizationRepository } from '../repositories/organization.repository';
import {
  OrganizationDirectory,
  OrganizationRecord,
} from '../contracts/organization-directory.contract';

@Injectable()
export class OrganizationsService implements OrganizationDirectory {
  constructor(private readonly organizationRepository: OrganizationRepository) {}

  async findById(id: string): Promise<OrganizationRecord | null> {
    const org = await this.organizationRepository.findById(id);
    if (!org) return null;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  async findBySlug(slug: string): Promise<OrganizationRecord | null> {
    const org = await this.organizationRepository.findBySlug(slug);
    if (!org) return null;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }
}
