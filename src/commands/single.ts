import chalk from 'chalk';
import { loadConfig } from '../config';
import { GitAnalyzer } from '../git-analyzer';
import { StatsAggregator } from '../stats-aggregator';
import { OutputFormatter } from '../formatters';
import { getDefaultTimeRange, parseDateTime, parseBranches } from '../time-utils';
import { selectBranches } from '../branch-selector';
import { CliOptions } from '../types';
import { initI18n, t } from '../i18n/index';
import { SpinnerManager } from '../ui/spinner';

export async function runSingleRepoCommand(options: CliOptions) {
  try {
    initI18n(options.lang);
    const isQuiet = Boolean(options.json || options.csv || options.markdown);
    const spinner = new SpinnerManager(isQuiet);

    if (isQuiet) {
      console.log(chalk.blue(t('loading.config')));
    } else {
      spinner.start(t('loading.config'));
    }
    const config = await loadConfig(options.config, options.repo);
    if (!isQuiet) {
      spinner.succeed();
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
      if (isQuiet) {
        console.log(chalk.blue(t('loading.fetching')));
      } else {
        spinner.start(t('loading.fetching'));
      }
      await analyzer.fetchRemote();
      if (!isQuiet) {
        spinner.succeed();
      }
    }

    if (isQuiet) {
      console.log(chalk.blue(t('loading.activeUsers')));
    } else {
      spinner.start(t('loading.activeUsers'));
    }
    const activeAuthors = await analyzer.getActiveAuthors(config.activeUserWeeks || 2);
    if (!isQuiet) {
      spinner.succeed();
    }

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

    if (isQuiet) {
      console.log(chalk.blue(t('loading.analyzing')));
    } else {
      spinner.start(t('loading.analyzing'));
    }
    const commits = await analyzer.getCommits(since, until, branches);

    if (commits.length === 0) {
      if (isQuiet) {
        console.log(chalk.yellow(t('warning.noCommits')));
      } else {
        spinner.warn(t('warning.noCommits'));
      }
      return;
    }

    if (isQuiet) {
      console.log(chalk.blue(t('info.foundCommits', { count: String(commits.length) })));
    } else {
      spinner.update(t('info.foundCommits', { count: String(commits.length) }));
    }

    const analyses = [];
    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      if (options.verbose && i % 10 === 0) {
        const progressText = t('info.analysisProgress', {
          current: String(i + 1),
          total: String(commits.length),
        });
        if (isQuiet) {
          console.log(chalk.gray(progressText));
        } else {
          spinner.update(progressText);
        }
      }
      const analysis = await analyzer.analyzeCommit(commit);
      if (analysis) {
        analyses.push(analysis);
      }
    }

    if (analyses.length === 0) {
      if (isQuiet) {
        console.log(chalk.yellow(t('warning.noQualifyingCommits')));
      } else {
        spinner.warn(t('warning.noQualifyingCommits'));
      }
      return;
    }

    if (isQuiet) {
      console.log(chalk.blue(t('info.qualifyingCommits', { count: String(analyses.length) })));
    } else {
      spinner.succeed(t('info.qualifyingCommits', { count: String(analyses.length) }));
    }

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
