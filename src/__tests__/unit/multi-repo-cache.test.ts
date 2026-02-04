import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mockFs from 'mock-fs';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { MultiRepoAnalyzer } from '../../multi/multi-repo-analyzer';
import { MultiRepoConfig, RepositoryConfig } from '../../types';
import { GLOBAL_CACHE_DIR } from '../../multi/cache-path';

const mockGit = {
  getRemotes: vi.fn(),
  fetch: vi.fn(),
  checkout: vi.fn(),
  reset: vi.fn(),
  clone: vi.fn(),
};

vi.mock('simple-git', () => ({
  __esModule: true,
  default: () => mockGit,
}));

const baseConfig: MultiRepoConfig = {
  mode: 'multi-repo',
  repositories: [],
  defaultSinceHours: -30,
  defaultUntilHours: 20,
  openspecDir: 'openspec/',
  excludeExtensions: ['.md'],
  activeUserWeeks: 2,
  authorMapping: {},
  parallelism: {
    maxConcurrent: 1,
    timeout: 60000,
  },
  remoteCache: {
    autoCleanup: true,
    cleanupOnComplete: false,
    cleanupOnError: true,
    mode: 'persistent',
  },
};

const repo: RepositoryConfig = {
  name: 'test-repo',
  type: 'remote',
  url: 'https://example.com/repo.git',
  branches: ['origin/main'],
};

describe('MultiRepoAnalyzer cache mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const enPath = resolve(__dirname, '../../i18n/locales/en.json');
    const zhPath = resolve(__dirname, '../../i18n/locales/zh-CN.json');
    const enContent = readFileSync(enPath, 'utf-8');
    const zhContent = readFileSync(zhPath, 'utf-8');
    mockFs({
      [GLOBAL_CACHE_DIR]: {},
      [enPath]: enContent,
      [zhPath]: zhContent,
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('uses cache when valid and updates without cloning', async () => {
    const analyzer = new MultiRepoAnalyzer(baseConfig, { quiet: true });
    const internal = analyzer as unknown as {
      getCacheRepoPath: (r: RepositoryConfig) => string;
      isCacheValid: (p: string, url: string) => Promise<boolean>;
      updateCachedRepository: (p: string, r: RepositoryConfig) => Promise<void>;
      cloneToPath: (target: string, r: RepositoryConfig, trackTemp: boolean) => Promise<string>;
      cloneRemoteRepository: (r: RepositoryConfig) => Promise<string>;
    };
    const cachePath = internal.getCacheRepoPath(repo);

    const isCacheValidSpy = vi.spyOn(internal, 'isCacheValid').mockResolvedValue(true);
    const updateSpy = vi.spyOn(internal, 'updateCachedRepository').mockResolvedValue();
    const cloneSpy = vi.spyOn(internal, 'cloneToPath').mockResolvedValue('should-not-be-used');

    mockGit.getRemotes.mockResolvedValue([]);

    const resultPath = await internal.cloneRemoteRepository(repo);

    expect(resultPath).toBe(cachePath);
    expect(isCacheValidSpy).toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(cloneSpy).not.toHaveBeenCalled();
  });

  it('forces clone when forceClone option is true', async () => {
    const analyzer = new MultiRepoAnalyzer(baseConfig, { quiet: true, forceClone: true });
    const internal = analyzer as unknown as {
      isCacheValid: (p: string, url: string) => Promise<boolean>;
      cloneToPath: (target: string, r: RepositoryConfig, trackTemp: boolean) => Promise<string>;
      cloneRemoteRepository: (r: RepositoryConfig) => Promise<string>;
    };

    vi.spyOn(internal, 'isCacheValid').mockResolvedValue(true);
    const cloneSpy = vi.spyOn(internal, 'cloneToPath').mockResolvedValue(join(GLOBAL_CACHE_DIR, 'new'));

    const resultPath = await internal.cloneRemoteRepository(repo);

    expect(cloneSpy).toHaveBeenCalledTimes(1);
    expect(resultPath).toBe(join(GLOBAL_CACHE_DIR, 'new'));
  });

  it('invalidates cache when older than maxAge', async () => {
    const configWithAge: MultiRepoConfig = {
      ...baseConfig,
      remoteCache: {
        ...baseConfig.remoteCache!,
        maxAge: 1000,
      },
    };
    const analyzer = new MultiRepoAnalyzer(configWithAge, { quiet: true });
    const internal = analyzer as unknown as {
      isCacheValid: (p: string, url: string) => Promise<boolean>;
    };

    const stalePath = join(GLOBAL_CACHE_DIR, 'stale-repo');
    mockFs({
      [GLOBAL_CACHE_DIR]: {
        'stale-repo': mockFs.directory({
          mtime: new Date(0),
          items: {
            '.git': {},
          },
        }),
      },
    });

    const isValid = await internal.isCacheValid(stalePath, repo.url!);

    expect(isValid).toBe(false);
  });

  it('validates cache when remote matches and not expired', async () => {
    const analyzer = new MultiRepoAnalyzer(baseConfig, { quiet: true });
    const internal = analyzer as unknown as {
      isCacheValid: (p: string, url: string) => Promise<boolean>;
    };

    mockGit.getRemotes.mockResolvedValue([
      {
        name: 'origin',
        refs: {
          fetch: repo.url,
        },
      },
    ]);

    const freshPath = join(GLOBAL_CACHE_DIR, 'fresh-repo');
    mockFs({
      [GLOBAL_CACHE_DIR]: {
        'fresh-repo': {
          '.git': {
            config: 'content',
          },
        },
      },
    });

    const isValid = await internal.isCacheValid(freshPath, repo.url!);

    expect(isValid).toBe(true);
  });
});
