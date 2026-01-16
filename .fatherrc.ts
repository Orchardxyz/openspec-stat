import { defineConfig } from 'father';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  cjs: {
    output: 'dist/cjs',
    platform: 'node',
  },
  esm: {
    output: 'dist/esm',
    platform: 'node',
  },
  define: {
    'process.env.CLI_VERSION': JSON.stringify(packageJson.version),
  },
  prebundle: {
    deps: {},
  },
});
