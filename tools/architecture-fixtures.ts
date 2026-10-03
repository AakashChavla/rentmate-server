export interface ArchitectureProof {
  name: string;
  files: Record<string, string>;
}
export const ARCHITECTURE_PROOFS: ArchitectureProof[] = [
  {
    name: 'no-circular',
    files: {
      'src/proof/a.ts': "import { b } from './b'; export const a = b;",
      'src/proof/b.ts': "import { a } from './a'; export const b = a;",
    },
  },
  {
    name: 'no-unresolved',
    files: { 'src/proof/unresolved.ts': "export { absent } from './absent';" },
  },
  {
    name: 'no-deep-module-imports',
    files: {
      'src/modules/proofa/a.ts': "export { b } from '../proofb/internal';",
      'src/modules/proofb/internal.ts': 'export const b = true;',
    },
  },
  {
    name: 'platform-no-modules',
    files: {
      'src/core/proof.ts': "export { item } from '../modules/proof/index';",
      'src/modules/proof/index.ts': 'export const item = true;',
    },
  },
  {
    name: 'shared-no-framework-io',
    files: { 'src/shared/proof.ts': "export { Module } from '@nestjs/common';" },
  },
  {
    name: 'vendor-libs-only-in-adapters',
    files: {
      'src/core/vendor.ts': "import vendor from 'razorpay'; export const proof = vendor;",
      'node_modules/razorpay/package.json':
        '{"name":"razorpay","version":"0.0.0","main":"index.js"}',
      'node_modules/razorpay/index.js': 'module.exports = {};',
    },
  },
  {
    name: 'no-adapter-injection',
    files: {
      'src/modules/proof/services/proof.service.ts':
        "export { impl } from '../repositories/proof.repository';",
      'src/modules/proof/repositories/proof.repository.ts': 'export const impl = true;',
    },
  },
  ...['auth', 'properties', 'tenants', 'leases', 'invoices', 'complaints', 'notifications'].map(
    (source, index) => ({
      name: `module-layer-${String(index)}`,
      files: {
        [`src/modules/${source}/proof.ts`]: "export { upper } from '../audit';",
        'src/modules/audit/index.ts': 'export const upper = true;',
      },
    }),
  ),
];
