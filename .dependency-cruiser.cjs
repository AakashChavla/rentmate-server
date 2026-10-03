module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-unresolved',
      severity: 'error',
      from: {},
      to: {
        couldNotResolve: true,
      },
    },
    {
      name: 'no-deep-module-imports',
      severity: 'error',
      from: {
        path: '^src/modules/([^/]+)/',
      },
      to: {
        path: '^src/modules/',
        pathNot: '^src/modules/($1/|[^/]+/index\\.ts$)',
      },
    },
    {
      name: 'platform-no-modules',
      severity: 'error',
      from: {
        path: '^src/(core|shared|integrations)/',
      },
      to: {
        path: '^src/modules/',
      },
    },
    {
      name: 'shared-no-framework-io',
      severity: 'error',
      from: {
        path: '^src/shared/',
      },
      to: {
        path: '(node:|node_modules/(?:@nestjs|typeorm|ioredis|bullmq|nodemailer)|^src/(core|integrations|modules)/)',
        dependencyTypes: ['core', 'npm', 'npm-dev', 'local'],
      },
    },
    {
      name: 'vendor-libs-only-in-adapters',
      severity: 'error',
      from: {
        pathNot: '^src/integrations/[^/]+/adapters/',
      },
      to: {
        path: 'node_modules/(nodemailer|razorpay|@aws-sdk|twilio|sendgrid)',
      },
    },
    {
      name: 'no-adapter-injection',
      severity: 'error',
      from: {
        path: '^src/modules/.*\\.(controller|service|processor)\\.ts$',
      },
      to: {
        path: '\\.(repository|store)\\.ts$',
        pathNot: '\\.contract\\.ts$',
      },
    },
    {
      name: 'module-layer-0',
      severity: 'error',
      from: {
        path: '^src/modules/(auth|authorization|organizations|users)/',
      },
      to: {
        path: '^src/modules/(properties|units|beds|occupancy|tenants|documents|kyc|leases|invoices|payments|expenses|utilities|complaints|maintenance|visitors|notifications|templates|reports|dashboard|audit)/',
      },
    },
    {
      name: 'module-layer-1',
      severity: 'error',
      from: {
        path: '^src/modules/(properties|units|beds|occupancy)/',
      },
      to: {
        path: '^src/modules/(tenants|documents|kyc|leases|invoices|payments|expenses|utilities|complaints|maintenance|visitors|notifications|templates|reports|dashboard|audit)/',
      },
    },
    {
      name: 'module-layer-2',
      severity: 'error',
      from: {
        path: '^src/modules/(tenants|documents|kyc)/',
      },
      to: {
        path: '^src/modules/(leases|invoices|payments|expenses|utilities|complaints|maintenance|visitors|notifications|templates|reports|dashboard|audit)/',
      },
    },
    {
      name: 'module-layer-3',
      severity: 'error',
      from: {
        path: '^src/modules/(leases)/',
      },
      to: {
        path: '^src/modules/(invoices|payments|expenses|utilities|complaints|maintenance|visitors|notifications|templates|reports|dashboard|audit)/',
      },
    },
    {
      name: 'module-layer-4',
      severity: 'error',
      from: {
        path: '^src/modules/(invoices|payments|expenses|utilities)/',
      },
      to: {
        path: '^src/modules/(complaints|maintenance|visitors|notifications|templates|reports|dashboard|audit)/',
      },
    },
    {
      name: 'module-layer-5',
      severity: 'error',
      from: {
        path: '^src/modules/(complaints|maintenance|visitors)/',
      },
      to: {
        path: '^src/modules/(notifications|templates|reports|dashboard|audit)/',
      },
    },
    {
      name: 'module-layer-6',
      severity: 'error',
      from: {
        path: '^src/modules/(notifications|templates)/',
      },
      to: {
        path: '^src/modules/(reports|dashboard|audit)/',
      },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    doNotFollow: {
      path: 'node_modules',
    },
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      extensions: ['.ts', '.tsx', '.js', '.json'],
      conditionNames: ['types', 'react-server', 'import', 'require', 'node', 'default'],
    },
  },
};
