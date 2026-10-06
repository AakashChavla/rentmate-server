import { AppException } from '../../core/errors/app-exception';
import { UnitStateMachine } from './unit-state-machine';
import { UNIT_STATUS as S } from '../../shared/unit.constants';
const machine = new UnitStateMachine();
const allowed: Record<string, string[]> = {
  VACANT: ['VACANT', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'BLOCKED'],
  OCCUPIED: ['OCCUPIED', 'VACANT', 'MAINTENANCE'],
  RESERVED: ['RESERVED', 'VACANT', 'OCCUPIED', 'MAINTENANCE', 'BLOCKED'],
  MAINTENANCE: ['MAINTENANCE', 'VACANT', 'BLOCKED'],
  BLOCKED: ['BLOCKED', 'VACANT', 'MAINTENANCE'],
};
describe('explicit occupancy state machine', () => {
  test.each(Object.values(S).flatMap((from) => Object.values(S).map((to) => [from, to] as const)))(
    '%s -> %s',
    (from, to) => {
      if (allowed[from]?.includes(to)) expect(machine.transition(from, { status: to })).toBe(to);
      else expect(() => machine.transition(from, { status: to })).toThrow(AppException);
    },
  );
  it('rejects stale optimistic writes, including a no-op', () => {
    expect(() =>
      machine.transition(S.OCCUPIED, { status: S.OCCUPIED, expectedStatus: S.VACANT }),
    ).toThrow(AppException);
  });
});
