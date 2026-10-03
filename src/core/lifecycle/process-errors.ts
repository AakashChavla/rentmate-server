import pino from 'pino';
import { INTERNAL_MESSAGES, LIMITS, REDACTED_FIELDS } from '../config/config.constants';
export function registerProcessErrors(): void {
  const logger = pino({
    redact: REDACTED_FIELDS,
    base: { requestId: null, userId: null, organizationId: null },
  });
  const fatal = (error: unknown): never => {
    logger.fatal(
      { errorType: error instanceof Error ? error.name : typeof error },
      INTERNAL_MESSAGES.UNHANDLED,
    );
    process.exit(LIMITS.EXIT_FAILURE);
  };
  process.on('unhandledRejection', fatal);
  process.on('uncaughtException', fatal);
}
