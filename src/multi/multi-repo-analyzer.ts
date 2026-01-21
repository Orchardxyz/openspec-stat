import simpleGit, { SimpleGit } from 'simple-git';
import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import chalk from 'chalk';
import { GitAnalyzer } from '../git-analyzer';
import { MultiRepoConfig, RepositoryConfig, RepositoryResult, CommitAnalysis } from '../types';
import { t } from '../i18n/index';
import { SpinnerManager } from '../ui/spinner';

interface AnalyzerOptions {
  quiet?: boolean;
}

interface BatchContext {
  batchNumber: number;
  totalBatches: number;
  indexInBatch: number;
  batchSize: number;
  totalItems: number;
}

export class MultiRepoAnalyzer {
  private config: MultiRepoConfig;
  private tempDirs: Set<string> = new Set();
  private isQuiet: boolean;
  private cloneOrder: Map<string, number> = new Map();
  private totalCloneTargets = 0;
  private nextCloneIndex = 1;

  constructor(config: MultiRepoConfig, options?: AnalyzerOptions) {
    this.config = config;
    this.isQuiet = options?.quiet ?? false;
  }

  async analyzeAll(since: Date, until: Date): Promise<RepositoryResult[]> {
    const repos = this.config.repositories || [];
    const enabledRepos = repos.filter((r) => r.enabled !== false);
    this.cloneOrder.clear();
    this.nextCloneIndex = 1;
    this.totalCloneTargets = enabledRepos.filter((repo) => repo.type === 'remote').length;

    try {
      const results = await this.processInBatches(
        enabledRepos,
        (repo, context) => this.analyzeRepository(repo, since, until, context),
        this.config.parallelism?.maxConcurrent || 3
      );

      return results;
    } finally {
      if (this.config.remoteCache?.cleanupOnComplete) {
        await this.cleanupTempDirs();
      }
    }
  }

  private async analyzeRepository(
    repo: RepositoryConfig,
    since: Date,
    until: Date,
    context: BatchContext
  ): Promise<RepositoryResult> {
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

      const typeSuffix = repo.type === 'remote' ? t('multi.repo.type.remote') : '';
      console.log(
        chalk.blue(
          t('multi.repo.header', {
            current: String(context.indexInBatch + 1),
            total: String(context.batchSize),
            repo: repo.name,
            typeSuffix,
          })
        )
      );

      if (repo.type === 'local') {
        repoPath = this.resolveLocalPath(repo.path!);

        if (!existsSync(join(repoPath, '.git'))) {
          throw new Error(`Not a git repository: ${repoPath}`);
        }
      } else {
        repoPath = await this.cloneRemoteRepository(repo);
      }

      const analyzer = new GitAnalyzer(repoPath, this.config);

      // Fetch remote branches for local repositories to ensure data is up-to-date
      if (repo.type === 'local' && this.config.autoFetch !== false) {
        console.log(chalk.cyan(t('multi.repo.fetching')));
        await analyzer.fetchRemote();
      }

      console.log(chalk.gray(t('multi.repo.analyzing')));

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

    const progressSuffix = this.getProgressSuffix(repo.name);
    const cloneSpinner = this.isQuiet ? undefined : new SpinnerManager(false);
    this.reportCloneStatus('start', repo.name, progressSuffix, cloneSpinner);

    const git: SimpleGit = simpleGit();

    const cloneArgs: string[] = [];

    if (repo.cloneOptions?.depth !== null && repo.cloneOptions?.depth !== undefined) {
      cloneArgs.push(`--depth=${repo.cloneOptions.depth}`);
    }

    if (repo.cloneOptions?.singleBranch) {
      cloneArgs.push('--single-branch');
    }

    const timeout = this.config.parallelism?.timeout || 600000;
    try {
      await this.withTimeout(git.clone(repo.url!, tempDir, cloneArgs), timeout, `Clone timeout for ${repo.name}`);
      this.reportCloneStatus('success', repo.name, progressSuffix, cloneSpinner);
      return tempDir;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.reportCloneStatus('fail', repo.name, progressSuffix, cloneSpinner, errorMessage);
      throw error;
    }
  }

  private resolveLocalPath(path: string): string {
    if (path.startsWith('/') || path.match(/^[A-Za-z]:\\/)) {
      return path;
    }
    return resolve(process.cwd(), path);
  }

  private async processInBatches<T, R>(
    items: T[],
    processor: (item: T, context: BatchContext) => Promise<R>,
    concurrency: number
  ): Promise<R[]> {
    const results: R[] = [];
    const divider = '-'.repeat(64);

    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchNumber = Math.floor(i / concurrency) + 1;
      const totalBatches = Math.ceil(items.length / concurrency);

      console.log(chalk.gray(divider));
      console.log(
        chalk.gray(
          t('multi.progress.batch', {
            current: String(batchNumber),
            total: String(totalBatches),
            count: String(batch.length),
          })
        )
      );
      console.log(chalk.gray(divider));

      const batchResults = await Promise.all(
        batch.map((item, index) =>
          processor(item, {
            batchNumber,
            totalBatches,
            indexInBatch: index,
            batchSize: batch.length,
            totalItems: items.length,
          })
        )
      );
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

  private getProgressSuffix(repoName: string): string {
    if (this.totalCloneTargets === 0) {
      return '';
    }
    let order = this.cloneOrder.get(repoName);
    if (!order) {
      order = this.nextCloneIndex;
      this.cloneOrder.set(repoName, order);
      this.nextCloneIndex += 1;
    }
    return ` (${order}/${this.totalCloneTargets})`;
  }

  private reportCloneStatus(
    status: 'start' | 'success' | 'fail',
    repoName: string,
    progressSuffix: string,
    spinner?: SpinnerManager,
    errorMessage?: string
  ): void {
    const messageKey =
      status === 'start' ? 'multi.repo.cloning' : status === 'success' ? 'multi.repo.cloned' : 'multi.repo.cloneFailed';
    const messageParams: Record<string, string | number> = { repo: repoName };
    if (status === 'fail') {
      messageParams.error = errorMessage || '';
    }
    const text = `${t(messageKey, messageParams)}${progressSuffix}`;

    if (spinner) {
      if (status === 'start') {
        spinner.start(text);
      } else if (status === 'success') {
        spinner.succeed(text);
      } else {
        spinner.fail(text);
      }
      return;
    }

    if (status === 'start') {
      console.log(chalk.cyan(text));
    } else if (status === 'success') {
      console.log(chalk.green(text));
    } else {
      console.log(chalk.red(text));
    }
  }
}
