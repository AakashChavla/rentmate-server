import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationsService } from './services/organizations.service';
import { OrganizationDirectory } from './contracts/organization-directory.contract';

@Module({
  imports: [TypeOrmModule.forFeature([Organization])],
  providers: [
    OrganizationRepository,
    OrganizationsService,
    {
      provide: OrganizationDirectory,
      useExisting: OrganizationsService,
    },
  ],
  exports: [OrganizationDirectory, OrganizationRepository, OrganizationsService],
})
export class OrganizationsModule {}
