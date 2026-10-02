/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'No circular dependencies allowed anywhere in the codebase.',
      from: {},
      to: {
        circular: true,
        pathNot: '^src/modules/(auth|authorization)/',
      },
    },
    {
      name: 'no-deep-module-imports',
      severity: 'error',
      comment: 'Outside a module, only modules/<name>/index (public API) may be imported.',
      from: {
        pathNot: '^(src/modules/([^/]+)/|src/core/database/seeds/)',
      },
      to: {
        path: '^src/modules/([^/]+)/',
        pathNot: '^src/modules/([^/]+)/index(\\.ts)?$',
      },
    },
    {
      name: 'platform-no-modules',
      severity: 'error',
      comment: 'core, shared, and integrations must never import modules.',
      from: {
        path: '^(src/core|src/shared|src/integrations)/',
        pathNot: '^src/core/database/seeds/',
      },
      to: {
        path: '^src/modules/',
      },
    },
    {
      name: 'shared-no-framework-io',
      severity: 'error',
      comment: 'shared must contain pure TS logic and never import NestJS, TypeORM, or Redis.',
      from: {
        path: '^src/shared/',
      },
      to: {
        path: '(@nestjs/|typeorm|ioredis|redis)',
      },
    },
    {
      name: 'vendor-only-in-adapters',
      severity: 'error',
      comment: 'Vendor SDK imports (e.g. nodemailer) are only allowed in integration adapters.',
      from: {
        pathNot: '^src/integrations/[^/]+/adapters/',
      },
      to: {
        path: '^(nodemailer)$',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
