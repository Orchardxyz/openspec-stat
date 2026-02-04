import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mockFs from 'mock-fs';
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { MultiRepoAnalyzer } from '../../multi/multi-repo-analyzer';
import { MultiRepoConfig, RepositoryConfig, RepositoryResult, CommitAnalysis } from '../../types';

const gitAnalyzerMocks = vi.hoisted(() => {
  const fetchRemote = vi.fn();
  const getCommits = vi.fn();
  const analyzeCommit = vi.fn();
  class FakeGitAnalyzer {
    fetchRemote = fetchRemote;
    getCommits = getCommits;
    analyzeCommit = analyzeCommit;
  }
  return { FakeGitAnalyzer, fetchRemote, getCommits, analyzeCommit };
});

const spinnerMocks = vi.hoisted(() => {
  class FakeSpinner {
    start = vi.fn();
    succeed = vi.fn();
    fail = vi.fn();
    update = vi.fn();
  }
  return { FakeSpinner };
});

vi.mock('../../git-analyzer', () => ({
  __esModule: true,
  GitAnalyzer: gitAnalyzerMocks.FakeGitAnalyzer,
}));

vi.mock('../../ui/spinner', () => ({
  __esModule: true,
  SpinnerManager: spinnerMocks.FakeSpinner,
}));

const baseConfig: MultiRepoConfig = {
  mode: 'multi-repo',
  repositories: [],
  defaultSinceHours: -1,
  defaultUntilHours: 0,
  autoFetch: false,
  parallelism: {
    maxConcurrent: 2,
    timeout: 1000,
  },
  remoteCache: {
    autoCleanup: false,
    cleanupOnComplete: false,
    cleanupOnError: true,
    mode: 'persistent',
  },
};

const repo: RepositoryConfig = {
  name: 'local-repo',
  type: 'local',
  path: 'tmp/local-repo',
  branches: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  const enPath = resolve(__dirname, '../../i18n/locales/en.json');
  const zhPath = resolve(__dirname, '../../i18n/locales/zh-CN.json');
  const enContent = readFileSync(enPath, 'utf-8');
  const zhContent = readFileSync(zhPath, 'utf-8');

  mockFs({
    'tmp/local-repo': {
      '.git': {},
    },
    [enPath]: enContent,
    [zhPath]: zhContent,
  });
});

afterEach(() => {
  mockFs.restore();
});

describe('MultiRepoAnalyzer', () => {
  type TestBatchContext = {
    indexInBatch: number;
    batchSize: number;
    batchNumber: number;
    totalBatches: number;
    totalItems: number;
  };

  it('returns disabled result when repo is disabled', async () => {
    const analyzer = new MultiRepoAnalyzer(baseConfig, { quiet: true });
    const internal = analyzer as unknown as {
      analyzeRepository: (
        r: RepositoryConfig,
        since: Date,
        until: Date,
        ctx: TestBatchContext
      ) => Promise<RepositoryResult>;
    };

    const result = await internal.analyzeRepository(
      { ...repo, enabled: false },
      new Date('2024-01-01'),
      new Date('2024-01-02'),
      {
        indexInBatch: 0,
        batchSize: 1,
        batchNumber: 1,
        totalBatches: 1,
        totalItems: 1,
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('disabled');
  });

  it('analyzes local repo and returns analyses', async () => {
    const analyzer = new MultiRepoAnalyzer(baseConfig, { quiet: true });
    const internal = analyzer as unknown as {
      analyzeRepository: (
        r: RepositoryConfig,
        since: Date,
        until: Date,
        ctx: TestBatchContext
      ) => Promise<RepositoryResult>;
    };

    gitAnalyzerMocks.getCommits.mockResolvedValueOnce([
      { hash: '1', author: 'a', email: 'a', date: new Date('2024-01-01'), message: 'm' },
    ]);
    gitAnalyzerMocks.analyzeCommit.mockResolvedValueOnce({
      commit: { hash: '1' },
      openspecProposals: new Set(),
      codeFiles: [],
      totalAdditions: 0,
      totalDeletions: 0,
      netChanges: 0,
    });

    const result = await internal.analyzeRepository(repo, new Date('2024-01-01'), new Date('2024-01-02'), {
      indexInBatch: 0,
      batchSize: 1,
      batchNumber: 1,
      totalBatches: 1,
      totalItems: 1,
    });

    expect(result.success).toBe(true);
    expect(result.analyses).toHaveLength(1);
    expect(gitAnalyzerMocks.getCommits).toHaveBeenCalled();
    expect(gitAnalyzerMocks.analyzeCommit).toHaveBeenCalled();
  });

  it('fetches remote branches when autoFetch is enabled for local repos', async () => {
    const analyzer = new MultiRepoAnalyzer({ ...baseConfig, autoFetch: true }, { quiet: true });
    const internal = analyzer as unknown as {
      analyzeRepository: (
        r: RepositoryConfig,
        since: Date,
        until: Date,
        ctx: TestBatchContext
      ) => Promise<RepositoryResult>;
    };

    gitAnalyzerMocks.getCommits.mockResolvedValueOnce([
      { hash: '3', author: 'c', email: 'c', date: new Date('2024-01-04'), message: 'm3' },
    ]);
    gitAnalyzerMocks.analyzeCommit.mockResolvedValueOnce({
      commit: { hash: '3' },
      openspecProposals: new Set(),
      codeFiles: [],
      totalAdditions: 0,
      totalDeletions: 0,
      netChanges: 0,
    });

    const result = await internal.analyzeRepository(repo, new Date('2024-01-01'), new Date('2024-01-02'), {
      indexInBatch: 0,
      batchSize: 1,
      batchNumber: 1,
      totalBatches: 1,
      totalItems: 1,
    });

    expect(result.success).toBe(true);
    expect(gitAnalyzerMocks.fetchRemote).toHaveBeenCalled();
  });

  it('handles analyzeCommit returning null and skips analyses', async () => {
    const analyzer = new MultiRepoAnalyzer(baseConfig, { quiet: true });
    const internal = analyzer as unknown as {
      analyzeRepository: (
        r: RepositoryConfig,
        since: Date,
        until: Date,
        ctx: TestBatchContext
      ) => Promise<RepositoryResult>;
    };

    gitAnalyzerMocks.getCommits.mockResolvedValueOnce([
      { hash: '2', author: 'b', email: 'b', date: new Date('2024-01-03'), message: 'm2' },
    ]);
    gitAnalyzerMocks.analyzeCommit.mockResolvedValueOnce(null);

    const result = await internal.analyzeRepository(repo, new Date('2024-01-01'), new Date('2024-01-02'), {
      indexInBatch: 0,
      batchSize: 1,
      batchNumber: 1,
      totalBatches: 1,
      totalItems: 1,
    });

    expect(result.success).toBe(true);
    expect(result.analyses).toHaveLength(0);
  });

  it('returns failure when local repo missing .git', async () => {
    mockFs({});
    const analyzer = new MultiRepoAnalyzer(baseConfig, { quiet: true });
    const internal = analyzer as unknown as {
      analyzeRepository: (
        r: RepositoryConfig,
        since: Date,
        until: Date,
        ctx: TestBatchContext
      ) => Promise<RepositoryResult>;
    };

    const result = await internal.analyzeRepository(repo, new Date('2024-01-01'), new Date('2024-01-02'), {
      indexInBatch: 0,
      batchSize: 1,
      batchNumber: 1,
      totalBatches: 1,
      totalItems: 1,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Not a git repository');
  });

  it('analyzes remote repo using cloneRemoteRepository', async () => {
    const analyzer = new MultiRepoAnalyzer(baseConfig, { quiet: true });
    const internal = analyzer as unknown as {
      analyzeRepository: (
        r: RepositoryConfig,
        since: Date,
        until: Date,
        ctx: TestBatchContext
      ) => Promise<RepositoryResult>;
      cloneRemoteRepository: (r: RepositoryConfig) => Promise<string>;
    };

    const remoteRepo: RepositoryConfig = {
      name: 'remote',
      type: 'remote',
      url: 'https://example.com/x.git',
      branches: [],
    };
    const cloneSpy = vi.spyOn(internal, 'cloneRemoteRepository').mockResolvedValue('/tmp/remote');
    gitAnalyzerMocks.getCommits.mockResolvedValueOnce([]);

    const result = await internal.analyzeRepository(remoteRepo, new Date('2024-01-01'), new Date('2024-01-02'), {
      indexInBatch: 0,
      batchSize: 1,
      batchNumber: 1,
      totalBatches: 1,
      totalItems: 1,
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe('/tmp/remote');
    expect(cloneSpy).toHaveBeenCalledTimes(1);
  });

  it('uses shouldCleanupTemps flag to cleanup after analyzeAll', async () => {
    const config: MultiRepoConfig = {
      ...baseConfig,
      repositories: [repo],
      remoteCache: {
        ...baseConfig.remoteCache!,
        cleanupOnComplete: false,
        cleanupOnError: false,
      },
    };
    const analyzer = new MultiRepoAnalyzer(config, { quiet: true });
    const internal = analyzer as unknown as {
      shouldCleanupTemps: boolean;
      cleanupTempDirs: () => Promise<void>;
    };
    internal.shouldCleanupTemps = true;
    const cleanupSpy = vi.spyOn(internal, 'cleanupTempDirs').mockResolvedValue();

    await analyzer.analyzeAll(new Date('2024-01-01'), new Date('2024-01-02'));

    expect(cleanupSpy).toHaveBeenCalled();
  });

  it('processes items in batches with contexts', async () => {
    const analyzer = new MultiRepoAnalyzer(baseConfig, { quiet: true });
    const internal = analyzer as unknown as {
      processInBatches: <T, R>(
        items: T[],
        processor: (item: T, ctx: TestBatchContext) => Promise<R>,
        concurrency: number
      ) => Promise<R[]>;
    };
    const contexts: TestBatchContext[] = [];

    const results = await internal.processInBatches(
      [1, 2, 3],
      async (_item, ctx) => {
        contexts.push(ctx);
        return ctx.indexInBatch;
      },
      2
    );

    expect(results).toEqual([0, 1, 0]);
    expect(contexts[0].batchNumber).toBe(1);
    expect(contexts[2].batchNumber).toBe(2);
  });

  it('builds safe repo name from url when name missing', () => {
    const analyzer = new MultiRepoAnalyzer(baseConfig, { quiet: true });
    const internal = analyzer as unknown as { getSafeRepoName: (r: RepositoryConfig) => string };

    const name = internal.getSafeRepoName({ ...repo, name: '', url: 'git@github.com:Org/Repo.git' });

    expect(name).toBe('Org-Repo');
  });

  it('processes analyzeAll and triggers cleanup', async () => {
    const config: MultiRepoConfig = {
      ...baseConfig,
      repositories: [
        { ...repo, name: 'local-1' },
        { name: 'remote-1', type: 'remote', url: 'https://example.com/r.git', branches: [] },
      ],
      remoteCache: {
        ...baseConfig.remoteCache!,
        cleanupOnComplete: true,
      },
    };
    const analyzer = new MultiRepoAnalyzer(config, { quiet: true });
    const internal = analyzer as unknown as {
      analyzeRepository: (
        r: RepositoryConfig,
        since: Date,
        until: Date,
        ctx: TestBatchContext
      ) => Promise<RepositoryResult>;
      cleanupTempDirs: () => Promise<void>;
    };

    const analyzeSpy = vi.spyOn(internal, 'analyzeRepository').mockImplementation(async (r, _s, _u, ctx) => {
      const analysis: CommitAnalysis = {
        commit: { hash: String(ctx.indexInBatch), author: '', email: '', date: new Date('2024-01-01'), message: '' },
        openspecProposals: new Set(),
        codeFiles: [],
        totalAdditions: 0,
        totalDeletions: 0,
        netChanges: 0,
      };
      return {
        repository: r.name,
        type: r.type,
        path: '/tmp',
        analyses: [analysis],
        success: true,
      };
    });
    const cleanupSpy = vi.spyOn(internal, 'cleanupTempDirs').mockResolvedValue();

    const results = await analyzer.analyzeAll(new Date('2024-01-01'), new Date('2024-01-02'));

    expect(results).toHaveLength(2);
    expect(analyzeSpy).toHaveBeenCalledTimes(2);
    expect(cleanupSpy).toHaveBeenCalled();
    expect(results.map((r) => r.repository)).toEqual(['local-1', 'remote-1']);
  });

  it('computes progress suffix based on clone order', () => {
    const analyzer = new MultiRepoAnalyzer(baseConfig, { quiet: true });
    const internal = analyzer as unknown as { totalCloneTargets: number; getProgressSuffix: (name: string) => string };
    internal.totalCloneTargets = 2;

    expect(internal.getProgressSuffix('repo-a')).toBe(' (1/2)');
    expect(internal.getProgressSuffix('repo-b')).toBe(' (2/2)');
    expect(internal.getProgressSuffix('repo-a')).toBe(' (1/2)');
  });

  it('cleans up when analyzeAll encounters errors and cleanupOnError is true', async () => {
    const config: MultiRepoConfig = {
      ...baseConfig,
      repositories: [{ ...repo, name: 'local-error' }],
      remoteCache: {
        ...baseConfig.remoteCache!,
        cleanupOnError: true,
        cleanupOnComplete: false,
      },
    };
    const analyzer = new MultiRepoAnalyzer(config, { quiet: true });
    const internal = analyzer as unknown as {
      analyzeRepository: (
        r: RepositoryConfig,
        since: Date,
        until: Date,
        ctx: TestBatchContext
      ) => Promise<RepositoryResult>;
      cleanupTempDirs: () => Promise<void>;
    };

    vi.spyOn(internal, 'analyzeRepository').mockRejectedValue(new Error('boom'));
    const cleanupSpy = vi.spyOn(internal, 'cleanupTempDirs').mockResolvedValue();

    await expect(analyzer.analyzeAll(new Date('2024-01-01'), new Date('2024-01-02'))).rejects.toThrow('boom');
    expect(cleanupSpy).toHaveBeenCalled();
  });

  it('cleans up temp directories set on analyzer', async () => {
    const analyzer = new MultiRepoAnalyzer(baseConfig, { quiet: true });
    const internal = analyzer as unknown as { tempDirs: Set<string>; cleanupTempDirs: () => Promise<void> };
    const tempPath = join(process.cwd(), 'tmp', 'cleanup-target');
    mockFs({ [tempPath]: { keep: 'file' } });
    internal.tempDirs.add(tempPath);

    await internal.cleanupTempDirs();

    expect(existsSync(tempPath)).toBe(false);
    expect(internal.tempDirs.size).toBe(0);
  });

  it('handles withTimeout resolving and rejecting by timeout', async () => {
    const analyzer = new MultiRepoAnalyzer(baseConfig, { quiet: true });
    const internal = analyzer as unknown as {
      withTimeout: <T>(promise: Promise<T>, timeout: number, message: string) => Promise<T>;
    };

    const resolved = await internal.withTimeout(Promise.resolve('ok'), 50, 'timeout');
    expect(resolved).toBe('ok');

    vi.useFakeTimers();
    const pending = internal.withTimeout(new Promise<string>(() => {}), 10, 'timeout-hit');
    vi.advanceTimersByTime(11);
    await expect(pending).rejects.toThrow('timeout-hit');
    vi.useRealTimers();
  });

  it('reports clone status with and without spinner', () => {
    const analyzer = new MultiRepoAnalyzer(baseConfig, { quiet: true });
    const internal = analyzer as unknown as {
      reportCloneStatus: (
        status: 'start' | 'success' | 'fail',
        repo: string,
        suffix: string,
        spinner?: InstanceType<typeof spinnerMocks.FakeSpinner>,
        error?: string
      ) => void;
    };

    const spinner = new spinnerMocks.FakeSpinner();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    internal.reportCloneStatus('start', 'repo', ' (1/1)', spinner);
    internal.reportCloneStatus('success', 'repo', ' (1/1)', spinner);
    internal.reportCloneStatus('fail', 'repo', ' (1/1)', spinner, 'err');

    expect(spinner.start).toHaveBeenCalled();
    expect(spinner.succeed).toHaveBeenCalled();
    expect(spinner.fail).toHaveBeenCalled();

    internal.reportCloneStatus('start', 'repo', '', undefined);
    internal.reportCloneStatus('success', 'repo', '', undefined);
    internal.reportCloneStatus('fail', 'repo', '', undefined, 'err');
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });
});
