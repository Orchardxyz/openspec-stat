module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  env: {
    node: true,
    es6: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // 禁止在 TypeScript 导入中使用 .js/.ts 等文件扩展名
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ImportDeclaration[source.value=/\\.(js|ts|tsx|jsx)$/]',
        message: 'Do not use file extensions in imports. TypeScript will resolve them automatically.',
      },
      {
        selector: 'ExportNamedDeclaration[source.value=/\\.(js|ts|tsx|jsx)$/]',
        message: 'Do not use file extensions in exports. TypeScript will resolve them automatically.',
      },
      {
        selector: 'ExportAllDeclaration[source.value=/\\.(js|ts|tsx|jsx)$/]',
        message: 'Do not use file extensions in exports. TypeScript will resolve them automatically.',
      },
    ],
  },
};
