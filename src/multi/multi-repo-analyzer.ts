import simpleGit, { SimpleGit } from 'simple-git';
import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import chalk from 'chalk';
import { GitAnalyzer } from '../git-analyzer.js';
import { MultiRepoConfig, RepositoryConfig, RepositoryResult, CommitAnalysis } from '../types.js';
import { t } from '../i18n/index.js';

export class MultiRepoAnalyzer {
  private config: MultiRepoConfig;
  private tempDirs: Set<string> = new Set();

  constructor(config: MultiRepoConfig) {
    this.config = config;
  }

  async analyzeAll(since: Date, until: Date): Promise<RepositoryResult[]> {
    const repos = this.config.repositories || [];
    const enabledRepos = repos.filter((r) => r.enabled !== false);

    try {
      const results = await this.processInBatches(
        enabledRepos,
        (repo) => this.analyzeRepository(repo, since, until),
        this.config.parallelism?.maxConcurrent || 3
      );

      return results;
    } finally {
      if (this.config.remoteCache?.cleanupOnComplete) {
        await this.cleanupTempDirs();
      }
    }
  }

  private async analyzeRepository(repo: RepositoryConfig, since: Date, until: Date): Promise<RepositoryResult> {
    let repoPath: string;

    try {
      if (repo.enabled === false) {
        console.log(chalk.gray(t('multi.repo.skipped', { repo: repo.name })));
        return {
          repository: repo.name,
          type: repo.type,
          path: '',
          analyses: [],
          success: false,
          error: 'disabled',
        };
      }

      console.log(chalk.blue(t('multi.repo.analyzing', { repo: repo.name, type: repo.type })));

      if (repo.type === 'local') {
        repoPath = this.resolveLocalPath(repo.path!);

        if (!existsSync(join(repoPath, '.git'))) {
          throw new Error(`Not a git repository: ${repoPath}`);
        }
      } else {
        repoPath = await this.cloneRemoteRepository(repo);
      }

      const analyzer = new GitAnalyzer(repoPath, this.config);
      const commits = await analyzer.getCommits(since, until, repo.branches);

      const analyses: CommitAnalysis[] = [];
      for (const commit of commits) {
        const analysis = await analyzer.analyzeCommit(commit);
        if (analysis) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (analysis as any).repository = repo.name;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (analysis as any).repositoryType = repo.type;
          analyses.push(analysis);
        }
      }

      console.log(chalk.green(t('multi.repo.completed', { repo: repo.name, commits: String(analyses.length) })));

      return {
        repository: repo.name,
        type: repo.type,
        path: repoPath,
        analyses,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(t('multi.repo.failed', { repo: repo.name, error: errorMessage })));

      return {
        repository: repo.name,
        type: repo.type,
        path: '',
        analyses: [],
        success: false,
        error: errorMessage,
      };
    }
  }

  private async cloneRemoteRepository(repo: RepositoryConfig): Promise<string> {
    const cacheDir = this.config.remoteCache?.dir || join(tmpdir(), 'openspec-stat-cache');

    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    const tempDir = mkdtempSync(join(cacheDir, `${repo.name}-`));
    this.tempDirs.add(tempDir);

    console.log(chalk.cyan(t('multi.repo.cloning', { repo: repo.name })));

    const git: SimpleGit = simpleGit();

    const cloneArgs: string[] = [];

    if (repo.cloneOptions?.depth !== null && repo.cloneOptions?.depth !== undefined) {
      cloneArgs.push(`--depth=${repo.cloneOptions.depth}`);
    }

    if (repo.cloneOptions?.singleBranch) {
      cloneArgs.push('--single-branch');
    }

    const timeout = this.config.parallelism?.timeout || 600000;
    await this.withTimeout(git.clone(repo.url!, tempDir, cloneArgs), timeout, `Clone timeout for ${repo.name}`);

    console.log(chalk.green(t('multi.repo.cloned', { repo: repo.name })));
    return tempDir;
  }

  private resolveLocalPath(path: string): string {
    if (path.startsWith('/') || path.match(/^[A-Za-z]:\\/)) {
      return path;
    }
    return resolve(process.cwd(), path);
  }

  private async processInBatches<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchNumber = Math.floor(i / concurrency) + 1;
      const totalBatches = Math.ceil(items.length / concurrency);

      if (totalBatches > 1) {
        console.log(
          chalk.gray(t('multi.progress.batch', { current: String(batchNumber), total: String(totalBatches) }))
        );
      }

      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
    }

    return results;
  }

  private async withTimeout<T>(promise: Promise<T>, timeout: number, errorMessage: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeout)),
    ]);
  }

  async cleanupTempDirs() {
    if (this.tempDirs.size === 0) {
      return;
    }

    console.log(chalk.gray(t('multi.cleanup.start')));

    for (const dir of this.tempDirs) {
      try {
        if (existsSync(dir)) {
          rmSync(dir, { recursive: true, force: true });
        }
      } catch (error) {
        console.warn(`Failed to cleanup ${dir}:`, error);
      }
    }

    this.tempDirs.clear();
    console.log(chalk.green(t('multi.cleanup.done')));
  }

  registerCleanupHandlers() {
    const cleanup = async () => {
      if (this.config.remoteCache?.autoCleanup) {
        await this.cleanupTempDirs();
      }
    };

    // Only register handlers for interrupt signals
    // Using once() to ensure handlers don't prevent normal exit
    process.once('SIGINT', async () => {
      await cleanup();
      process.exit(130);
    });

    process.once('SIGTERM', async () => {
      await cleanup();
      process.exit(143);
    });

    // Note: We don't register uncaughtException handler as it prevents normal process exit
    // Cleanup will still happen via cleanupOnComplete in analyzeAll()
  }
}
