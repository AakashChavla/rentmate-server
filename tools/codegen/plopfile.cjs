const path = require('node:path');
module.exports = function configure(plop) {
  const targets = {
    module: {
      directory: 'modules',
      role: 'Service',
      fileRole: 'service',
      prefix: 'Default',
      folder: 'services',
    },
    integration: {
      directory: 'integrations',
      role: 'Provider',
      fileRole: 'provider',
      prefix: 'Local',
      folder: 'adapters/local',
    },
    processor: {
      directory: 'core/queue/processors',
      role: 'Processor',
      fileRole: 'processor',
      prefix: 'Default',
      folder: 'processors',
    },
  };
  for (const [kind, data] of Object.entries(targets)) {
    const base = `src/${data.directory}/{{kebabCase name}}`;
    const templates = {
      'contracts/{{kebabCase name}}.contract.ts': 'port',
      '{{folder}}/{{kebabCase prefix}}-{{kebabCase name}}.{{fileRole}}.ts': 'implementation',
      '{{kebabCase name}}.module.ts': 'module',
      'index.ts': 'index',
      'tests/fake-{{kebabCase name}}.ts': 'fake',
      'tests/{{kebabCase name}}.spec.ts': 'test',
    };
    plop.setGenerator(kind, {
      description: `Generate a compiling ${kind} port, binding, fake and test`,
      prompts: [
        {
          type: 'input',
          name: 'name',
          message: 'Name',
          validate: (name) => /^[a-z][a-z0-9-]*$/.test(name) || 'Use a lowercase kebab-case name',
        },
      ],
      actions: Object.entries(templates).map(([suffix, template]) => ({
        type: 'add',
        path: path.resolve(__dirname, '../..', `${base}/${suffix}`),
        data: {
          ...data,
          contractRelative: kind === 'integration' ? '../../contracts' : '../contracts',
        },
        templateFile: path.join(__dirname, 'templates', `${template}.hbs`),
        abortOnFail: true,
      })),
    });
  }
};
