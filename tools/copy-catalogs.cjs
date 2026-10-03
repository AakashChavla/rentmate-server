const fs = require('node:fs');
fs.cpSync('src/i18n', 'dist/i18n', { recursive: true });
