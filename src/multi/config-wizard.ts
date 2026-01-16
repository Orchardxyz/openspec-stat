import { input, select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { t } from '../i18n/index';
import { RepositoryConfig } from '../types';

export async function runConfigWizard(isMultiRepo = false) {
  console.log(chalk.blue.bold(isMultiRepo ? t('init.welcomeMulti') : t('init.welcome')));

  const configName = await input({
    message: t('init.configName'),
    default: isMultiRepo ? '.openspec-stats.multi.json' : '.openspec-stats.json',
  });

  if (!isMultiRepo) {
    const singleRepoConfig = await createSingleRepoConfig();
    saveConfig(configName, singleRepoConfig);
    return;
  }

  const repositories: RepositoryConfig[] = [];
  let addMore = true;

  while (addMore) {
    console.log(chalk.cyan(t('init.addRepository', { number: String(repositories.length + 1) })));

    const repo = await addRepository();
    repositories.push(repo);

    addMore = await confirm({
      message: t('init.addMore'),
      default: false,
    });
  }

  console.log(chalk.cyan(t('init.timeConfig')));
  const timeConfig = await configureTimeRange();

  console.log(chalk.cyan(t('init.advanced')));
  const advancedConfig = await configureAdvanced();

  const config = {
    mode: 'multi-repo',
    repositories,
    ...timeConfig,
    ...advancedConfig,
  };

  console.log(chalk.green(t('init.preview')));
  console.log(JSON.stringify(config, null, 2));

  const confirmed = await confirm({
    message: t('init.save'),
    default: true,
  });

  if (confirmed) {
    saveConfig(configName, config);
    console.log(chalk.green(t('init.saved', { path: configName })));
    console.log(chalk.blue(t('init.runCommand', { path: configName })));
  }
}

async function createSingleRepoConfig() {
  console.log(chalk.cyan(t('init.timeConfig')));
  const timeConfig = await configureTimeRange();

  const branches = await input({
    message: t('init.branches'),
    default: 'origin/master',
  });

  const advancedConfig = await configureAdvanced();

  return {
    defaultBranches: branches
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean),
    ...timeConfig,
    ...advancedConfig,
  };
}

async function addRepository(): Promise<RepositoryConfig> {
  const type = await select({
    message: t('init.repoType'),
    choices: [
      {
        name: t('init.repoType.local'),
        value: 'local',
      },
      {
        name: t('init.repoType.remote'),
        value: 'remote',
      },
    ],
  });

  const name = await input({
    message: t('init.repoName'),
    validate: (value) => value.length > 0 || 'Name is required',
  });

  const repo: RepositoryConfig = {
    name,
    type: type as 'local' | 'remote',
    branches: [],
  };

  if (type === 'local') {
    repo.path = await input({
      message: t('init.repoPath'),
      default: '.',
      validate: (value) => value.length > 0 || 'Path is required',
    });
  } else {
    repo.url = await input({
      message: t('init.repoUrl'),
      validate: (value) => {
        if (!value.length) return 'URL is required';
        if (!value.match(/^(git@|https:\/\/)/)) {
          return t('init.repoUrlInvalid');
        }
        return true;
      },
    });

    const useFullClone = await confirm({
      message: t('init.useFullClone'),
      default: true,
    });

    if (!useFullClone) {
      const depth = await input({
        message: t('init.cloneDepth'),
        default: '100',
        validate: (value) => !isNaN(Number(value)) || 'Must be a number',
      });
      repo.cloneOptions = { depth: Number(depth) };
    } else {
      repo.cloneOptions = { depth: null };
    }
  }

  const branchInput = await input({
    message: t('init.branches'),
    default: 'origin/master',
  });

  repo.branches = branchInput
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);

  return repo;
}

async function configureTimeRange() {
  const useDefault = await confirm({
    message: t('init.useDefaultTime'),
    default: true,
  });

  if (useDefault) {
    return {
      defaultSinceHours: -30,
      defaultUntilHours: 20,
    };
  }

  const sinceHours = await input({
    message: t('init.sinceHours'),
    default: '-30',
    validate: (value) => !isNaN(Number(value)) || 'Must be a number',
  });

  const untilHours = await input({
    message: t('init.untilHours'),
    default: '20',
    validate: (value) => {
      const num = Number(value);
      return (!isNaN(num) && num >= 0 && num <= 23) || 'Must be 0-23';
    },
  });

  return {
    defaultSinceHours: Number(sinceHours),
    defaultUntilHours: Number(untilHours),
  };
}

async function configureAdvanced() {
  const configureAdvanced = await confirm({
    message: t('init.configureAdvanced'),
    default: false,
  });

  if (!configureAdvanced) {
    return getDefaultAdvancedConfig();
  }

  const config: Record<string, unknown> = {};

  config.openspecDir = await input({
    message: t('init.openspecDir'),
    default: 'openspec/',
  });

  const maxConcurrent = await input({
    message: t('init.maxConcurrent'),
    default: '3',
    validate: (value) => {
      const num = Number(value);
      return (!isNaN(num) && num > 0) || 'Must be positive number';
    },
  });

  config.parallelism = {
    maxConcurrent: Number(maxConcurrent),
    timeout: 600000,
  };

  config.remoteCache = {
    dir: '/tmp/openspec-stat-cache',
    autoCleanup: true,
    cleanupOnComplete: true,
    cleanupOnError: true,
  };

  config.excludeExtensions = ['.md', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'];

  config.activeUserWeeks = 2;

  const addAuthorMapping = await confirm({
    message: t('init.authorMapping'),
    default: false,
  });

  if (addAuthorMapping) {
    config.authorMapping = await configureAuthorMapping();
  } else {
    config.authorMapping = {};
  }

  return config;
}

async function configureAuthorMapping() {
  console.log(chalk.gray(t('init.authorMappingInfo')));

  const mapping: Record<string, string> = {};
  let addMore = true;

  while (addMore) {
    const gitIdentity = await input({
      message: t('init.gitIdentity'),
    });

    if (!gitIdentity) break;

    const unifiedName = await input({
      message: t('init.unifiedName', { identity: gitIdentity }),
    });

    mapping[gitIdentity] = unifiedName;

    addMore = await confirm({
      message: t('init.addMoreMapping'),
      default: false,
    });
  }

  return mapping;
}

function getDefaultAdvancedConfig() {
  return {
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
}

function saveConfig(path: string, config: unknown) {
  writeFileSync(path, JSON.stringify(config, null, 2));
}

export const SINGLE_REPO_TEMPLATE = {
  defaultBranches: ['origin/master'],
  defaultSinceHours: -30,
  defaultUntilHours: 20,
  authorMapping: {
    'user@email1.com': 'User Name',
    'user@email2.com': 'User Name',
  },
  openspecDir: 'openspec/',
  excludeExtensions: ['.md', '.txt', '.png', '.jpg'],
  activeUserWeeks: 2,
};

export const MULTI_REPO_TEMPLATE = {
  mode: 'multi-repo',
  repositories: [
    {
      name: 'example-local-repo',
      type: 'local',
      path: './path/to/repo',
      branches: ['origin/master'],
    },
    {
      name: 'example-remote-repo',
      type: 'remote',
      url: 'git@github.com:org/repo.git',
      branches: ['origin/main'],
      cloneOptions: {
        depth: null,
        singleBranch: false,
      },
    },
  ],
  defaultSinceHours: -30,
  defaultUntilHours: 20,
  authorMapping: {},
  openspecDir: 'openspec/',
  excludeExtensions: ['.md', '.txt', '.png', '.jpg'],
  activeUserWeeks: 2,
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
