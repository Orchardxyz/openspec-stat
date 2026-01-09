import chalk from 'chalk';
import { loadConfig } from '../config.js';
import { GitAnalyzer } from '../git-analyzer.js';
import { StatsAggregator } from '../stats-aggregator.js';
import { OutputFormatter } from '../formatters.js';
import { getDefaultTimeRange, parseDateTime, parseBranches } from '../time-utils.js';
import { selectBranches } from '../branch-selector.js';
import { CliOptions } from '../types.js';
import { initI18n, t } from '../i18n/index.js';

export async function runSingleRepoCommand(options: CliOptions) {
  try {
    initI18n(options.lang);

    console.log(chalk.blue(t('loading.config')));
    const config = await loadConfig(options.config, options.repo);

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

    let branches: string[];
    if (options.branches) {
      branches = parseBranches(options.branches);
    } else if (options.interactive !== false) {
      branches = await selectBranches(options.repo, config.defaultBranches);
    } else {
      branches = config.defaultBranches || [];
    }

    console.log(
      chalk.blue(
        t('info.timeRange', {
          since: since.toLocaleString(),
          until: until.toLocaleString(),
        })
      )
    );
    console.log(
      chalk.blue(
        t('info.branches', {
          branches: branches.join(', ') || t('info.allBranches'),
        })
      )
    );

    const analyzer = new GitAnalyzer(options.repo, config);

    // Fetch remote branches to ensure data is up-to-date
    if (!options.noFetch && config.autoFetch !== false) {
      console.log(chalk.blue(t('loading.fetching')));
      await analyzer.fetchRemote();
    }

    console.log(chalk.blue(t('loading.activeUsers')));
    const activeAuthors = await analyzer.getActiveAuthors(config.activeUserWeeks || 2);

    if (options.verbose) {
      console.log(
        chalk.gray(
          t('info.activeUsers', {
            weeks: String(config.activeUserWeeks || 2),
            users: Array.from(activeAuthors).join(', '),
          })
        )
      );
    }

    console.log(chalk.blue(t('loading.analyzing')));
    const commits = await analyzer.getCommits(since, until, branches);

    if (commits.length === 0) {
      console.log(chalk.yellow(t('warning.noCommits')));
      return;
    }

    console.log(chalk.blue(t('info.foundCommits', { count: String(commits.length) })));

    const analyses = [];
    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      if (options.verbose && i % 10 === 0) {
        console.log(
          chalk.gray(
            t('info.analysisProgress', {
              current: String(i + 1),
              total: String(commits.length),
            })
          )
        );
      }
      const analysis = await analyzer.analyzeCommit(commit);
      if (analysis) {
        analyses.push(analysis);
      }
    }

    if (analyses.length === 0) {
      console.log(chalk.yellow(t('warning.noQualifyingCommits')));
      return;
    }

    console.log(chalk.blue(t('info.qualifyingCommits', { count: String(analyses.length) })));

    const aggregator = new StatsAggregator(config, activeAuthors);
    const result = aggregator.aggregate(analyses, since, until, branches, options.author);

    const formatter = new OutputFormatter();

    if (options.json) {
      console.log(formatter.formatJSON(result));
    } else if (options.csv) {
      console.log(formatter.formatCSV(result));
    } else if (options.markdown) {
      console.log(formatter.formatMarkdown(result));
    } else {
      console.log(formatter.formatTable(result, options.verbose));
    }
  } catch (error) {
    console.error(chalk.red(t('error.prefix')), error);
    process.exit(1);
  }
}
