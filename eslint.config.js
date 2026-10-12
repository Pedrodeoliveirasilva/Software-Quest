/* Configuração do ESLint: verifica erros comuns no JavaScript do site e do servidor. */
'use strict';
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/', 'dados/', 'coverage/'] },
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error'
    }
  },
  {
    // Site: scripts comuns carregados pelo index.html, que compartilham o objeto global SQ
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, SQ: 'writable', firebase: 'readonly' }
    }
  },
  {
    // Servidor, testes e arquivos de configuração: Node.js com CommonJS
    files: ['servidor.js', 'servidor/**/*.js', 'test/**/*.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node } }
  }
];
