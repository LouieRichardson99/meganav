import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default defineConfig(
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: [
      'node_modules/**',
      '../wwwroot/**',
    ],
  },
  {
    files: ['src/tree/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*'],
              message: 'The tree is generic, so it must not import Meganav code.',
            },
          ],
        },
      ],
    },
  },
);
