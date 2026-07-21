import { defineConfig } from 'eslint/config'
import pluginEslint from 'typescript-eslint'
import pluginUnicorn from 'eslint-plugin-unicorn'
import pluginSolid from 'eslint-plugin-solid/configs/typescript'
import pluginTailwindcss from 'eslint-plugin-tailwindcss'

export default defineConfig({
  extends: [
    pluginEslint.configs.recommended,
    pluginUnicorn.configs.recommended,
    pluginSolid,
    pluginTailwindcss.configs.recommended
  ],
  settings: {
    tailwindcss: {
      cssConfigPath: './src/styles/tailwind.css'
    }
  },
  rules: {
    'comma-dangle': [1, 'never'],
    'semi': [1, 'never'],

    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-unused-vars': [1, { argsIgnorePattern: '^_' }],

    'unicorn/consistent-boolean-name': 0,
    'unicorn/empty-brace-spaces': 0,
    'unicorn/filename-case': 0,
    'unicorn/name-replacements': 0,
    'unicorn/no-await-expression-member': 0,
    'unicorn/no-empty-file': 0,
    'unicorn/no-keyword-prefix': 0,
    'unicorn/no-null': 0,
    'unicorn/no-this-outside-of-class': 0,
    'unicorn/no-top-level-side-effects': 0,
    'unicorn/numeric-separators-style': 0,
    'unicorn/prefer-early-return': 0,
    'unicorn/prefer-node-protocol': 0,

    'tailwindcss/no-custom-classname': 0
  }
})
