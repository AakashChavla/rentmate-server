import type { UserStatus } from './user-status';

export interface UserListQuery {
  status?: UserStatus;
  search?: string;
  cursor?: string;
  limit?: number;
}
