import { proveLint } from './proof-lint';
import { proveArchitecture } from './proof-architecture';
import { proveLocalization } from './proof-i18n';
import { provePointers } from './proof-pointers';
provePointers();
proveLint();
proveArchitecture();
proveLocalization();
process.stdout.write('All configured custom-gate fixtures were rejected and removed.\n');
