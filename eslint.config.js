// Regras de código e de segurança. Roda com `npm run lint` e no CI antes de publicar.
// no-unsanitized: todo innerHTML / insertAdjacentHTML montado com valor variável precisa passar por esc()
// (ou por uma função listada em `escape.methods`, que devolve HTML já seguro).
import js from '@eslint/js';
import globals from 'globals';
import nounsanitized from 'eslint-plugin-no-unsanitized';

// Funções que devolvem HTML seguro: escapam o texto ou montam a marcação só com valores conferidos.
const ESCAPAM = ['esc'];

export default [
  { ignores: ['dist/**', 'node_modules/**', 'supabase/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.browser } },
    plugins: { 'no-unsanitized': nounsanitized },
    rules: {
      'no-unsanitized/property': ['error', { escape: { methods: ESCAPAM } }],
      'no-unsanitized/method': ['error', { escape: { methods: ESCAPAM } }],
      'no-eval': 'error', 'no-implied-eval': 'error', 'no-new-func': 'error', 'no-script-url': 'error',
      'no-restricted-properties': ['error',
        { object: 'document', property: 'write', message: 'Use DOM ou innerHTML com esc().' },
        { object: 'window', property: 'eval', message: 'Proibido.' }],
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['tests/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }], 'no-empty': ['error', { allowEmptyCatch: true }] },
  },
];
