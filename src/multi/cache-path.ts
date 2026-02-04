import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export const GLOBAL_CACHE_DIR = join(homedir(), '.openspec-stat', 'cached', 'repos');

export function ensureGlobalCacheDir(): string {
  if (!existsSync(GLOBAL_CACHE_DIR)) {
    mkdirSync(GLOBAL_CACHE_DIR, { recursive: true });
  }
  return GLOBAL_CACHE_DIR;
}
