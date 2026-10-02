module.exports = function (plop) {
  // Helper for kebab-case name
  plop.setHelper('kebab', (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

  // Generator 1: Business Module Skeleton
  plop.setGenerator('module', {
    description: 'Generate a canonical business module skeleton',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Module name (kebab-case, e.g. properties):',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/modules/{{kebab name}}/{{kebab name}}.module.ts',
        template: `import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class {{pascalCase name}}Module {}
`,
      },
      {
        type: 'add',
        path: 'src/modules/{{kebab name}}/index.ts',
        template: `export { {{pascalCase name}}Module } from './{{kebab name}}.module';
`,
      },
      {
        type: 'add',
        path: 'src/modules/{{kebab name}}/contracts/{{kebab name}}-directory.contract.ts',
        template: `export interface {{pascalCase name}}Record {
  id: string;
  organizationId: string;
}

export abstract class {{pascalCase name}}Directory {
  abstract findById(organizationId: string, id: string): Promise<{{pascalCase name}}Record | null>;
}
`,
      },
    ],
  });

  // Generator 2: Integration Adapter
  plop.setGenerator('integration', {
    description: 'Generate an integration port and adapter skeleton',
    prompts: [
      {
        type: 'input',
        name: 'capability',
        message: 'Integration capability (e.g. payment):',
      },
      {
        type: 'input',
        name: 'vendor',
        message: 'Integration vendor (e.g. razorpay):',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/integrations/{{kebab capability}}/{{kebab capability}}.provider.ts',
        template: `export abstract class {{pascalCase capability}}Provider {
  abstract process(input: unknown): Promise<{ success: boolean }>;
}
`,
      },
      {
        type: 'add',
        path: 'src/integrations/{{kebab capability}}/adapters/{{kebab vendor}}-{{kebab capability}}.provider.ts',
        template: `import { Injectable } from '@nestjs/common';
import { {{pascalCase capability}}Provider } from '../{{kebab capability}}.provider';

@Injectable()
export class {{pascalCase vendor}}{{pascalCase capability}}Provider extends {{pascalCase capability}}Provider {
  async process(input: unknown): Promise<{ success: boolean }> {
    return { success: true };
  }
}
`,
      },
    ],
  });

  // Generator 3: Queue Processor
  plop.setGenerator('processor', {
    description: 'Generate a BullMQ queue processor',
    prompts: [
      {
        type: 'input',
        name: 'queue',
        message: 'Queue name (e.g. billing):',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/core/queue/processors/{{kebab queue}}.processor.ts',
        template: `import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('{{kebab queue}}')
export class {{pascalCase queue}}Processor extends WorkerHost {
  async process(job: Job): Promise<void> {
    // Process job
  }
}
`,
      },
    ],
  });

  // Generator 4: Migration Wrapper
  plop.setGenerator('migration', {
    description: 'Generate a TypeORM migration',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Migration name (kebab-case, e.g. add-property-indexes):',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/core/database/migrations/{{timestamp}}-{{kebab name}}.ts',
        template: `import { MigrationInterface, QueryRunner } from 'typeorm';

export class {{pascalCase name}}{{timestamp}} implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migration up SQL
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Migration down SQL
  }
}
`,
      },
    ],
  });
};
