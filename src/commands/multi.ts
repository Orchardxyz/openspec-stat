import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { initI18n, t } from '../i18n/index';
import { MultiRepoAnalyzer } from '../multi/multi-repo-analyzer';
import { validateAndFillDefaults, printConfigSummary } from '../multi/config-validator';
import { StatsAggregator } from '../stats-aggregator';
import { OutputFormatter } from '../formatters';
import { getDefaultTimeRange, parseDateTime } from '../time-utils';
import { CommitAnalysis, MultiRepoConfig, RepositoryResult, RemoteCacheConfig } from '../types';
import { SpinnerManager } from '../ui/spinner';

interface MultiCommandOptions {
  config: string;
  since?: string;
  until?: string;
  author?: string;
  json?: boolean;
  csv?: boolean;
  markdown?: boolean;
  verbose?: boolean;
  lang?: string;
  cleanup?: boolean;
  showContributors?: boolean;
  noFetch?: boolean;
  cacheMode?: 'persistent' | 'temporary';
  cacheMaxAge?: string;
  forceClone?: boolean;
}

export async function runMultiRepoCommand(options: MultiCommandOptions) {
  try {
    initI18n(options.lang || 'en');
    const isQuiet = Boolean(options.json || options.csv || options.markdown);
    const rerunKey = 'r';
    const quitKey = 'q';

    console.log(chalk.yellow.bold(t('multi.beta.warning')));
    console.log(chalk.gray(t('multi.beta.feedback')));
    console.log();

    const runAnalysis = async () => {
      const spinner = new SpinnerManager(isQuiet);

      if (isQuiet) {
        console.log(chalk.blue(t('multi.loading.config')));
      } else {
        spinner.start(t('multi.loading.config'));
      }

      const configPath = resolve(process.cwd(), options.config);
      if (!existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }

      const rawConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      const config = validateAndFillDefaults(rawConfig);

      const ensureCacheConfig = (): RemoteCacheConfig => {
        if (!config.remoteCache) {
          config.remoteCache = {
            autoCleanup: true,
            cleanupOnComplete: false,
            cleanupOnError: true,
            mode: 'persistent',
          };
        }
        return config.remoteCache;
      };

      if (options.cacheMode) {
        const cacheCfg = ensureCacheConfig();
        cacheCfg.mode = options.cacheMode;
        if (options.cacheMode === 'temporary') {
          cacheCfg.cleanupOnComplete = true;
        }
      }

      if (options.cacheMaxAge !== undefined) {
        const parsed = Number(options.cacheMaxAge);
        if (!Number.isNaN(parsed)) {
          const cacheCfg = ensureCacheConfig();
          cacheCfg.maxAge = parsed;
        }
      }

      if (!isQuiet) {
        spinner.succeed();
      }

      if (options.verbose) {
        printConfigSummary(config);
      }

      let since: Date;
      let until: Date;

      if (options.since || options.until) {
        since = options.since
          ? parseDateTime(options.since)
          : getDefaultTimeRange(config.defaultSinceHours, config.defaultUntilHours).since;
        until = options.until
          ? parseDateTime(options.until)
          : getDefaultTimeRange(config.defaultSinceHours, config.defaultUntilHours).until;
      } else {
        const defaultRange = getDefaultTimeRange(config.defaultSinceHours, config.defaultUntilHours);
        since = defaultRange.since;
        until = defaultRange.until;
      }

      console.log(
        chalk.blue(
          t('info.timeRange', {
            since: since.toLocaleString(),
            until: until.toLocaleString(),
          })
        )
      );

      if (options.cleanup === false) {
        const cacheCfg = ensureCacheConfig();
        cacheCfg.autoCleanup = false;
        cacheCfg.cleanupOnComplete = false;
        cacheCfg.cleanupOnError = false;
      }

      // Handle --no-fetch option
      if (options.noFetch) {
        config.autoFetch = false;
      }

      const analyzer = new MultiRepoAnalyzer(config, { quiet: isQuiet, forceClone: options.forceClone });
      analyzer.registerCleanupHandlers();

      const repoResults = await analyzer.analyzeAll(since, until);

      const successResults = repoResults.filter((r) => r.success);
      const failedResults = repoResults.filter((r) => !r.success);

      const summaryDivider = '-'.repeat(64);
      console.log(chalk.gray(summaryDivider));
      console.log(chalk.blue(t('multi.summary.title')));
      console.log(chalk.gray(summaryDivider));
      console.log(
        chalk.blue(
          t('multi.summary.repos', {
            total: String(repoResults.length),
            success: String(successResults.length),
            failed: String(failedResults.length),
          })
        )
      );

      if (failedResults.length > 0) {
        console.log(chalk.yellow(`\n${t('multi.summary.failedTitle')}`));
        failedResults.forEach((r) => {
          console.log(chalk.red(`  - ${r.repository}: ${r.error}`));
        });
        console.log();
      }

      const allAnalyses = successResults.flatMap((r) => r.analyses);

      if (allAnalyses.length === 0) {
        console.log(chalk.yellow(t('warning.noQualifyingCommits')));
        return;
      }

      console.log(chalk.blue(t('info.qualifyingCommits', { count: String(allAnalyses.length) })));

      if (isQuiet) {
        console.log(chalk.blue(t('loading.activeUsers')));
      } else {
        spinner.start(t('loading.activeUsers'));
      }
      const activeAuthors = await getActiveAuthorsFromMultiRepo(config, repoResults);
      if (!isQuiet) {
        spinner.succeed();
      }

      if (options.verbose && activeAuthors.size > 0) {
        console.log(
          chalk.gray(
            t('info.activeUsers', {
              weeks: String(config.activeUserWeeks || 2),
              users: Array.from(activeAuthors).join(', '),
            })
          )
        );
      }

      const aggregator = new StatsAggregator(config, activeAuthors);
      const allBranches = [
        ...new Set(
          repoResults.flatMap((r) => config.repositories?.find((repo) => repo.name === r.repository)?.branches || [])
        ),
      ];
      const result = aggregator.aggregate(allAnalyses, since, until, allBranches, options.author);

      const formatter = new OutputFormatter();
      const showContributors = options.showContributors || false;

      if (options.json) {
        console.log(formatter.formatJSON(result, showContributors));
      } else if (options.csv) {
        console.log(formatter.formatCSV(result, showContributors));
      } else if (options.markdown) {
        console.log(formatter.formatMarkdown(result, showContributors));
      } else {
        console.log(formatter.formatTable(result, options.verbose, showContributors));
      }
    };

    await runAnalysis();

    if (isQuiet || !process.stdin.isTTY) {
      return;
    }

    const stdin = process.stdin;
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.setRawMode?.(true);

    const cleanupStdin = () => {
      stdin.setRawMode?.(false);
      stdin.pause();
    };

    const prompt = () => {
      console.log(chalk.bgGreen.black(` ${t('multi.rerun.finished')} `));
      const formattedRerunKey = chalk.bold(rerunKey);
      const formattedQuitKey = chalk.bold(quitKey);
      console.log(chalk.gray(t('multi.rerun.prompt', { rerunKey: formattedRerunKey, quitKey: formattedQuitKey })));
    };

    const waitKeyPress = () =>
      new Promise<string>((resolve) => {
        const onData = (data: Buffer | string) => {
          stdin.off('data', onData);
          resolve(data.toString());
        };
        stdin.on('data', onData);
      });

    console.log();
    prompt();
    let running = false;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const keyRaw = await waitKeyPress();
      const key = keyRaw[0];
      if (!key) {
        continue;
      }

      if (key === '\u0003') {
        cleanupStdin();
        process.exit(130);
      }

      const normalized = key.toLowerCase();

      if (normalized === quitKey) {
        cleanupStdin();
        process.exit(130);
        return;
      }
      if (normalized === rerunKey) {
        if (running) {
          continue;
        }
        running = true;
        console.log(chalk.blue(t('multi.rerun.running')));
        try {
          await runAnalysis();
        } catch (error) {
          cleanupStdin();
          throw error;
        } finally {
          running = false;
          console.log();
          prompt();
        }
      }
    }
  } catch (error) {
    console.error(chalk.red(t('error.prefix')), error);
    process.exit(1);
  }
}

async function getActiveAuthorsFromMultiRepo(
  config: MultiRepoConfig,
  repoResults: RepositoryResult[]
): Promise<Set<string>> {
  const allAuthors = new Set<string>();

  for (const result of repoResults) {
    if (result.success && result.analyses) {
      result.analyses.forEach((analysis: CommitAnalysis) => {
        allAuthors.add(analysis.commit.author);
      });
    }
  }

  return allAuthors;
}
