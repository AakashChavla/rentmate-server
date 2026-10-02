const UNIT_MS = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
} as const;

/** Converts a validated duration such as `15m` or `7d` into milliseconds. */
export function durationToMs(value: string): number {
  const match = /^(\d+)(ms|s|m|h|d|w)$/.exec(value);
  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2] as keyof typeof UNIT_MS;
  return amount * UNIT_MS[unit];
}
