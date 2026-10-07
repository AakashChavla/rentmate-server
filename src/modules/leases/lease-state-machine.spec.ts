import { LeaseStateMachine, LEASE_TRANSITIONS } from './lease-state-machine';
import { LEASE_STATUS as S } from '../../shared/lease.constants';
import { LEASE_SCHEMA } from './lease-validation';
const machine = new LeaseStateMachine();
describe('lease transitions', () => {
  for (const from of Object.values(S))
    for (const to of Object.values(S))
      it(from + ' -> ' + to, () => {
        if (from === to || LEASE_TRANSITIONS[from].includes(to))
          expect(machine.transition(from, to)).toBe(to);
        else expect(() => machine.transition(from, to)).toThrow();
      });
});
it('requires real end-exclusive dates and decimal money', () => {
  const input = {
    tenantId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    unitId: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    startDate: '2026-02-28',
    endDate: '2026-03-01',
    rent: '1000.00',
    deposit: '0.00',
    dueDay: 1,
  };
  expect(LEASE_SCHEMA.safeParse(input).success).toBe(true);
  for (const patch of [
    { rent: 1000 },
    { endDate: input.startDate },
    { startDate: '2026-02-30' },
    { deposit: '1.001' },
    { dueDay: 29 },
  ])
    expect(LEASE_SCHEMA.safeParse({ ...input, ...patch }).success).toBe(false);
});
