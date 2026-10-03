process.stderr.write(
  'Phase 0 contains no database or Redis repositories. Real integration/e2e suites are not implemented; this command deliberately fails instead of claiming verification.\n',
);
process.exitCode = 1;
