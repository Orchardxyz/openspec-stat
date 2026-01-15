import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { Config } from './types';

const DEFAULT_CONFIG: Config = {
  defaultBranches: ['origin/master'],
  defaultSinceHours: -30,
  defaultUntilHours: 20,
  authorMapping: {},
  openspecDir: 'openspec/',
  excludeExtensions: ['.md', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'],
  activeUserWeeks: 2,
};

export async function loadConfig(configPath?: string, repoPath: string = '.'): Promise<Config> {
  let config = { ...DEFAULT_CONFIG };

  const searchPaths = configPath
    ? [configPath]
    : [
        resolve(repoPath, '.openspec-stats.json'),
        resolve(repoPath, 'openspec-stats.config.json'),
        resolve(process.cwd(), '.openspec-stats.json'),
        resolve(process.cwd(), 'openspec-stats.config.json'),
      ];

  for (const path of searchPaths) {
    if (existsSync(path)) {
      try {
        const fileContent = readFileSync(path, 'utf-8');
        const userConfig = JSON.parse(fileContent);
        config = { ...config, ...userConfig };
        break;
      } catch (error) {
        console.warn(`Failed to load config from ${path}:`, error);
      }
    }
  }

  return config;
}

export function normalizeAuthor(author: string, mapping: Record<string, string> = {}): string {
  return mapping[author] || author;
}
