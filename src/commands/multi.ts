import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { initI18n, t } from '../i18n/index';
import { MultiRepoAnalyzer } from '../multi/multi-repo-analyzer';
import { validateAndFillDefaults, printConfigSummary } from '../multi/config-validator';
import { StatsAggregator } from '../stats-aggregator';
import { OutputFormatter } from '../formatters';
import { getDefaultTimeRange, parseDateTime } from '../time-utils';
import { MultiRepoConfig } from '../types';

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
}

export async function runMultiRepoCommand(options: MultiCommandOptions) {
  try {
    initI18n(options.lang || 'en');

    console.log(chalk.yellow.bold(t('multi.beta.warning')));
    console.log(chalk.gray(t('multi.beta.feedback')));
    console.log();

    console.log(chalk.blue(t('multi.loading.config')));

    const configPath = resolve(process.cwd(), options.config);
    if (!existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    const rawConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    const config = validateAndFillDefaults(rawConfig);

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

    const analyzer = new MultiRepoAnalyzer(config);
    analyzer.registerCleanupHandlers();

    if (options.cleanup === false) {
      config.remoteCache = config.remoteCache || {
        dir: '/tmp/openspec-stat-cache',
        autoCleanup: false,
        cleanupOnComplete: false,
        cleanupOnError: false,
      };
      config.remoteCache.cleanupOnComplete = false;
    }

    // Handle --no-fetch option
    if (options.noFetch) {
      config.autoFetch = false;
    }

    const repoResults = await analyzer.analyzeAll(since, until);

    const successResults = repoResults.filter((r) => r.success);
    const failedResults = repoResults.filter((r) => !r.success);

    console.log(
      chalk.blue(
        t('multi.summary.title') +
          t('multi.summary.repos', {
            total: String(repoResults.length),
            success: String(successResults.length),
            failed: String(failedResults.length),
          })
      )
    );

    if (failedResults.length > 0) {
      console.log(chalk.yellow('\nFailed repositories:'));
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

    console.log(chalk.blue(t('loading.activeUsers')));
    const activeAuthors = await getActiveAuthorsFromMultiRepo(config, repoResults);

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
  } catch (error) {
    console.error(chalk.red(t('error.prefix')), error);
    process.exit(1);
  }
}

async function getActiveAuthorsFromMultiRepo(config: MultiRepoConfig, repoResults: any[]): Promise<Set<string>> {
  const allAuthors = new Set<string>();

  for (const result of repoResults) {
    if (result.success && result.analyses) {
      result.analyses.forEach((analysis: any) => {
        if (analysis.commit?.author) {
          allAuthors.add(analysis.commit.author);
        }
      });
    }
  }

  return allAuthors;
}
