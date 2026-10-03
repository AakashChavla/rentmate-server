import 'reflect-metadata';
import { bootstrap } from './bootstrap';

bootstrap().catch(() => {
  process.stderr.write('RentMate startup failed; check environment configuration.\n');
  process.exitCode = 1;
});
