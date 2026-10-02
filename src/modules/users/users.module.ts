import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';
import { UserDirectory } from './contracts/user-directory.contract';
import { UserRoleAssignmentRepository } from '../authorization/repositories/user-role-assignment.repository';
import { RoleRepository } from '../authorization/repositories/role.repository';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => AuthModule),
    forwardRef(() => AuthorizationModule),
  ],
  controllers: [UsersController],
  providers: [
    UserRepository,
    UserRoleAssignmentRepository,
    RoleRepository,
    UsersService,
    {
      provide: UserDirectory,
      useExisting: UsersService,
    },
  ],
  exports: [UsersService, UserDirectory, UserRepository],
})
export class UsersModule {}
