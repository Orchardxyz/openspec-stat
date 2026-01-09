import { defineConfig } from 'father';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  cjs: {
    output: 'dist/cjs',
  },
  esm: {
    output: 'dist/esm',
  },
  define: {
    'process.env.CLI_VERSION': JSON.stringify(packageJson.version),
  },
  prebundle: {
    deps: {},
  },
});
