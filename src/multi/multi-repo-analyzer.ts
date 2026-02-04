import simpleGit, { SimpleGit, SimpleGitProgressEvent } from 'simple-git';
import { mkdtempSync, rmSync, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';
import chalk from 'chalk';
import { GitAnalyzer } from '../git-analyzer';
import { MultiRepoConfig, RepositoryConfig, RepositoryResult, CommitAnalysis } from '../types';
import { t } from '../i18n/index';
import { SpinnerManager } from '../ui/spinner';
import { ensureGlobalCacheDir } from './cache-path';

interface AnalyzerOptions {
  quiet?: boolean;
  forceClone?: boolean;
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
  private forceClone: boolean;
  private shouldCleanupTemps = false;
  private cloneOrder: Map<string, number> = new Map();
  private totalCloneTargets = 0;
  private nextCloneIndex = 1;

  constructor(config: MultiRepoConfig, options?: AnalyzerOptions) {
    this.config = config;
    this.isQuiet = options?.quiet ?? false;
    this.forceClone = options?.forceClone ?? false;
  }

  async analyzeAll(since: Date, until: Date): Promise<RepositoryResult[]> {
    const repos = this.config.repositories || [];
    const enabledRepos = repos.filter((r) => r.enabled !== false);
    this.cloneOrder.clear();
    this.nextCloneIndex = 1;
    this.totalCloneTargets = enabledRepos.filter((repo) => repo.type === 'remote').length;
    let hadError = false;

    try {
      const localRepos = enabledRepos.filter((repo) => repo.type === 'local');
      const remoteRepos = enabledRepos.filter((repo) => repo.type === 'remote');
      const maxConcurrent = this.config.parallelism?.maxConcurrent || 3;

      const localResults = await this.processInBatches(
        localRepos,
        (repo, context) => this.analyzeRepository(repo, since, until, context),
        maxConcurrent
      );
      const remoteResults = await this.processInBatches(
        remoteRepos,
        (repo, context) => this.analyzeRepository(repo, since, until, context),
        maxConcurrent
      );

      return [...localResults, ...remoteResults];
    } catch (error) {
      hadError = true;
      throw error;
    } finally {
      const shouldCleanup = Boolean(
        this.config.remoteCache?.cleanupOnComplete ||
        (this.config.remoteCache?.cleanupOnError && hadError) ||
        this.shouldCleanupTemps
      );
      if (shouldCleanup) {
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
    const cacheMode = repo.cacheMode || this.config.remoteCache?.mode || 'persistent';

    if (cacheMode === 'temporary') {
      this.shouldCleanupTemps = true;
      return this.cloneToTempDirectory(repo);
    }

    const cachePath = this.getCacheRepoPath(repo);
    const timeout = this.config.parallelism?.timeout || 600000;

    const validCache = this.forceClone ? false : await this.isCacheValid(cachePath, repo.url!);

    if (validCache) {
      console.log(chalk.cyan(t('multi.repo.updating', { repo: repo.name })));
      await this.withTimeout(this.updateCachedRepository(cachePath, repo), timeout, `Update timeout for ${repo.name}`);
      return cachePath;
    }

    if (existsSync(cachePath)) {
      rmSync(cachePath, { recursive: true, force: true });
    }

    return this.cloneToPath(cachePath, repo, false);
  }

  private ensureCacheDir(): string {
    return ensureGlobalCacheDir();
  }

  private getCacheRepoPath(repo: RepositoryConfig): string {
    const baseDir = this.ensureCacheDir();
    const safeName = this.getSafeRepoName(repo);
    const hash = createHash('sha256')
      .update(repo.url || repo.name)
      .digest('hex');
    const id = hash.slice(0, 12);
    return join(baseDir, `${safeName}-${id}`);
  }

  private getSafeRepoName(repo: RepositoryConfig): string {
    const sanitize = (value: string): string => {
      return value
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    const fromName = repo.name ? sanitize(repo.name) : '';
    if (fromName) return fromName;

    const rawUrl = repo.url || '';
    const normalizedUrl = rawUrl.startsWith('git@') ? `ssh://${rawUrl.replace(':', '/')}` : rawUrl;
    try {
      const parsed = new URL(normalizedUrl);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const repoPart = parts.pop();
      const ownerPart = parts.pop();
      const base = repoPart ? repoPart.replace(/\.git$/, '') : ownerPart;
      const combined = ownerPart && base ? `${ownerPart}-${base}` : base;
      const cleaned = combined ? sanitize(combined) : '';
      if (cleaned) return cleaned;
    } catch {
      // ignore parsing errors and fallback
    }

    return 'repo';
  }

  private async isCacheValid(cachePath: string, repoUrl: string): Promise<boolean> {
    if (!existsSync(cachePath)) return false;
    if (!existsSync(join(cachePath, '.git'))) return false;

    const maxAge = this.config.remoteCache?.maxAge;
    if (maxAge !== undefined) {
      try {
        const stats = statSync(cachePath);
        if (Date.now() - stats.mtimeMs > maxAge) {
          return false;
        }
      } catch {
        return false;
      }
    }

    try {
      const git = simpleGit(cachePath);
      const remotes = await git.getRemotes(true);
      const originUrl = remotes.find((r) => r.name === 'origin')?.refs?.fetch;
      return originUrl === repoUrl;
    } catch {
      return false;
    }
  }

  private buildCloneArgs(repo: RepositoryConfig): string[] {
    const cloneArgs: string[] = ['--progress'];
    if (repo.cloneOptions?.depth !== null && repo.cloneOptions?.depth !== undefined) {
      cloneArgs.push(`--depth=${repo.cloneOptions.depth}`);
    }
    if (repo.cloneOptions?.singleBranch) {
      cloneArgs.push('--single-branch');
    }
    return cloneArgs;
  }

  private async cloneToTempDirectory(repo: RepositoryConfig): Promise<string> {
    const cacheDir = this.ensureCacheDir();
    const safeName = this.getSafeRepoName(repo);
    const tempDir = mkdtempSync(join(cacheDir, `${safeName}-tmp-`));
    this.tempDirs.add(tempDir);
    return this.cloneToPath(tempDir, repo, true);
  }

  private async cloneToPath(targetPath: string, repo: RepositoryConfig, trackTemp: boolean): Promise<string> {
    const progressSuffix = this.getProgressSuffix(repo.name);
    const cloneSpinner = this.isQuiet ? undefined : new SpinnerManager(false);
    this.reportCloneStatus('start', repo.name, progressSuffix, cloneSpinner);

    const progressReporter = ({ method, stage, progress }: SimpleGitProgressEvent) => {
      if (this.isQuiet) return;
      const pct = Number.isFinite(progress) ? `${progress.toFixed(1)}%` : '';
      const text = `${t('multi.repo.cloning', { repo: repo.name })}${progressSuffix} ${method} ${stage}${pct ? ` ${pct}` : ''}`;
      if (cloneSpinner) {
        cloneSpinner.update(text);
      } else {
        console.log(chalk.cyan(text));
      }
    };

    const git: SimpleGit = simpleGit({ progress: progressReporter });
    const cloneArgs = this.buildCloneArgs(repo);
    const timeout = this.config.parallelism?.timeout || 600000;

    try {
      await this.withTimeout(git.clone(repo.url!, targetPath, cloneArgs), timeout, `Clone timeout for ${repo.name}`);
      this.reportCloneStatus('success', repo.name, progressSuffix, cloneSpinner);
      if (trackTemp) {
        this.tempDirs.add(targetPath);
      }
      return targetPath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.reportCloneStatus('fail', repo.name, progressSuffix, cloneSpinner, errorMessage);
      throw error;
    }
  }

  private async updateCachedRepository(cachePath: string, repo: RepositoryConfig): Promise<void> {
    const git = simpleGit(cachePath);
    const timeout = this.config.parallelism?.timeout || 600000;

    await this.withTimeout(git.fetch(['--all', '--prune']), timeout, `Fetch timeout for ${repo.name}`);

    if (repo.branches.length > 0) {
      const mainBranch = repo.branches[0].replace(/^origin\//, '');
      try {
        await git.checkout(mainBranch);
        await git.reset(['--hard', `origin/${mainBranch}`]);
      } catch {
        // If branch checkout fails, continue with fetched state
      }
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
