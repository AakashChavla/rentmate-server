import 'express';
import type { AuthenticatedUser } from '../../core/http/decorators/current-user.decorator';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    user?: AuthenticatedUser;
  }
}
