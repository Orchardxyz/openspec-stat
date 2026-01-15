import { MultiRepoConfig } from '../types';
import chalk from 'chalk';
import { t } from '../i18n/index';

const DEFAULT_MULTI_REPO_CONFIG: Partial<MultiRepoConfig> = {
  mode: 'multi-repo',
  defaultSinceHours: -30,
  defaultUntilHours: 20,
  openspecDir: 'openspec/',
  excludeExtensions: ['.md', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'],
  activeUserWeeks: 2,
  authorMapping: {},
  parallelism: {
    maxConcurrent: 3,
    timeout: 600000,
  },
  remoteCache: {
    dir: '/tmp/openspec-stat-cache',
    autoCleanup: true,
    cleanupOnComplete: true,
    cleanupOnError: true,
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateAndFillDefaults(config: any): MultiRepoConfig {
  if (!config.repositories || !Array.isArray(config.repositories)) {
    throw new Error(t('config.validation.noRepos'));
  }

  if (config.repositories.length === 0) {
    throw new Error(t('config.validation.emptyRepos'));
  }

  config.repositories.forEach((repo: any, index: number) => {
    if (!repo.name) {
      throw new Error(t('config.validation.noName', { index: String(index + 1) }));
    }

    if (!repo.type || !['local', 'remote'].includes(repo.type)) {
      throw new Error(t('config.validation.invalidType', { name: repo.name }));
    }

    if (repo.type === 'local' && !repo.path) {
      throw new Error(t('config.validation.noPath', { name: repo.name }));
    }

    if (repo.type === 'remote' && !repo.url) {
      throw new Error(t('config.validation.noUrl', { name: repo.name }));
    }

    if (!repo.branches || !Array.isArray(repo.branches) || repo.branches.length === 0) {
      throw new Error(t('config.validation.noBranches', { name: repo.name }));
    }

    if (repo.enabled === undefined) {
      repo.enabled = true;
    }

    if (repo.type === 'remote' && !repo.cloneOptions) {
      repo.cloneOptions = { depth: null, singleBranch: false };
    }
  });

  const mergedConfig = {
    ...DEFAULT_MULTI_REPO_CONFIG,
    ...config,
    parallelism: {
      ...DEFAULT_MULTI_REPO_CONFIG.parallelism,
      ...config.parallelism,
    },
    remoteCache: {
      ...DEFAULT_MULTI_REPO_CONFIG.remoteCache,
      ...config.remoteCache,
    },
  };

  return mergedConfig as MultiRepoConfig;
}

export function printConfigSummary(config: MultiRepoConfig) {
  console.log(chalk.blue(t('config.summary.title')));

  console.log(chalk.cyan(t('config.summary.repositories')));
  config.repositories?.forEach((repo, i) => {
    const icon = repo.type === 'local' ? '📁' : '☁️';
    const location = repo.type === 'local' ? repo.path : repo.url;
    console.log(`  ${i + 1}. ${icon} ${chalk.bold(repo.name)} (${repo.type})`);
    console.log(`     ${chalk.gray(location)}`);
    console.log(`     ${chalk.gray('Branches:')} ${repo.branches.join(', ')}`);
  });

  console.log(chalk.cyan(t('config.summary.timeRange')));
  console.log(t('config.summary.since', { hours: String(config.defaultSinceHours) }));
  console.log(t('config.summary.until', { hours: String(config.defaultUntilHours) }));

  console.log(chalk.cyan(t('config.summary.parallelism')));
  console.log(t('config.summary.maxConcurrent', { count: String(config.parallelism?.maxConcurrent || 3) }));

  console.log(chalk.cyan(t('config.summary.remoteCache')));
  console.log(t('config.summary.cacheDir', { dir: config.remoteCache?.dir || '/tmp/openspec-stat-cache' }));
  console.log(
    t('config.summary.autoCleanup', {
      enabled: config.remoteCache?.cleanupOnComplete ? 'Yes' : 'No',
    })
  );

  console.log();
}
