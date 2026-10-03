module.exports = (plop) => {
  for (const [name, base, sections] of [
    ['context', 'src/domains', ['api', 'application', 'domain', 'infrastructure']],
    ['feature', 'src/features', ['components', 'hooks', 'api', 'schemas', 'types', 'tests']],
  ]) {
    plop.setGenerator(name, {
      description: 'Create documented layer directories; implementation and tests are required separately',
      prompts: [{ type: 'input', name: 'name', message: 'Kebab-case name', validate: (value) => /^[a-z][a-z0-9-]*$/.test(value) || 'Use kebab-case' }],
      actions: sections.map((section) => ({ type: 'add', path: base + '/{{name}}/' + section + '/README.md', template: '# {{name}} ' + section + '\nFollow AGENTS.md. No implementation generated.\n' })),
    });
  }
};
