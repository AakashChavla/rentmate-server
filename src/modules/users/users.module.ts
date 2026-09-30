import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { TokenService } from '../auth/token.service';
import { RefreshToken } from '../auth/refresh-token.entity';
import { JwtModule } from '@nestjs/jwt';
import { Role } from '../authorization/role.entity';
import { UserRoleAssignment } from '../authorization/user-role-assignment.entity';
import { AuthUserLookup } from './auth-user-lookup.service';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([User, UserRoleAssignment, Role, RefreshToken]),
    AuthorizationModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, AuthUserLookup, TokenService],
  exports: [UsersService, AuthUserLookup, TypeOrmModule],
})
export class UsersModule {}
