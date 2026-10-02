import 'express';
import type { AuthenticatedUser } from '../core/http/decorators/current-user.decorator';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: AuthenticatedUser;
    }
  }
}
