import { defineConfig } from 'father';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  esm: {
    output: 'dist/esm',
    platform: 'node',
    transformer: 'babel',
  },
  define: {
    'process.env.CLI_VERSION': JSON.stringify(packageJson.version),
  },
  prebundle: {
    deps: {},
  },
});
