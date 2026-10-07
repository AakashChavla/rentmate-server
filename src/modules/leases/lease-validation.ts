import { z } from 'zod';
import { MONEY_PATTERN } from '../../shared/unit.constants';
import { LEASE_LIMIT as L } from '../../shared/lease.constants';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import type { LeaseInput } from '../../shared/lease.types';
export const LEASE_SCHEMA = z
  .object({
    tenantId: z.uuid(),
    unitId: z.uuid(),
    bedId: z.uuid().nullable().optional(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    rent: z.string().regex(MONEY_PATTERN),
    deposit: z.string().regex(MONEY_PATTERN),
    dueDay: z.number().int().min(1).max(L.DUE_DAY),
    members: z.array(z.string().trim().min(1).max(L.NAME)).max(L.MEMBERS).optional(),
  })
  .strict()
  .refine((v) => v.startDate < v.endDate);
export function requireLease(input: LeaseInput): void {
  const fields = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
  if (!LEASE_SCHEMA.safeParse(fields).success) throw new AppException(ErrorCode.VALIDATION_ERROR);
}
export function leaseDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return [values.year, values.month, values.day].join('-');
}
