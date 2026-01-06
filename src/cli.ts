#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from './config.js';
import { GitAnalyzer } from './git-analyzer.js';
import { StatsAggregator } from './stats-aggregator.js';
import { OutputFormatter } from './formatters.js';
import { getDefaultTimeRange, parseDateTime, parseBranches } from './time-utils.js';
import { selectBranches } from './branch-selector.js';
import { CliOptions } from './types.js';

const program = new Command();

program
  .name('openspec-stat')
  .description('Track team members\' OpenSpec proposals and code changes in Git repositories')
  .version('0.0.1')
  .option('-r, --repo <path>', 'Repository path', '.')
  .option('-b, --branches <branches>', 'Branch list, comma-separated')
  .option('--no-interactive', 'Disable interactive branch selection')
  .option('-s, --since <datetime>', 'Start time (default: yesterday 18:00)')
  .option('-u, --until <datetime>', 'End time (default: today 18:00)')
  .option('-a, --author <name>', 'Filter by specific author')
  .option('--json', 'Output in JSON format')
  .option('--csv', 'Output in CSV format')
  .option('--markdown', 'Output in Markdown format')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-v, --verbose', 'Verbose output mode')
  .action(async (options: CliOptions) => {
    try {
      console.log(chalk.blue('🔍 Loading configuration...'));
      const config = await loadConfig(options.config, options.repo);

      let since: Date;
      let until: Date;

      if (options.since || options.until) {
        since = options.since
          ? parseDateTime(options.since)
          : getDefaultTimeRange(
              config.defaultSinceHours,
              config.defaultUntilHours
            ).since;
        until = options.until
          ? parseDateTime(options.until)
          : getDefaultTimeRange(
              config.defaultSinceHours,
              config.defaultUntilHours
            ).until;
      } else {
        const defaultRange = getDefaultTimeRange(
          config.defaultSinceHours,
          config.defaultUntilHours
        );
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
          `📅 Time Range: ${since.toLocaleString('en-US')} ~ ${until.toLocaleString('en-US')}`
        )
      );
      console.log(chalk.blue(`🌿 Branches: ${branches.join(', ') || 'All branches'}`));

      const analyzer = new GitAnalyzer(options.repo, config);

      console.log(chalk.blue('🔍 Fetching active users...'));
      const activeAuthors = await analyzer.getActiveAuthors(
        config.activeUserWeeks || 2
      );

      if (options.verbose) {
        console.log(
          chalk.gray(
            `   Active users (within ${config.activeUserWeeks || 2} weeks): ${Array.from(activeAuthors).join(', ')}`
          )
        );
      }

      console.log(chalk.blue('🔍 Analyzing commit history...'));
      const commits = await analyzer.getCommits(since, until, branches);

      if (commits.length === 0) {
        console.log(chalk.yellow('⚠️  No commits found matching the criteria'));
        return;
      }

      console.log(chalk.blue(`📝 Found ${commits.length} commits, analyzing...`));

      const analyses = [];
      for (let i = 0; i < commits.length; i++) {
        const commit = commits[i];
        if (options.verbose && i % 10 === 0) {
          console.log(
            chalk.gray(`   Analysis progress: ${i + 1}/${commits.length}`)
          );
        }
        const analysis = await analyzer.analyzeCommit(commit);
        if (analysis) {
          analyses.push(analysis);
        }
      }

      if (analyses.length === 0) {
        console.log(
          chalk.yellow(
            '⚠️  No commits found containing both OpenSpec proposals and code changes'
          )
        );
        return;
      }

      console.log(
        chalk.blue(
          `✅ Found ${analyses.length} qualifying commits (containing OpenSpec proposals and code changes)`
        )
      );

      const aggregator = new StatsAggregator(config, activeAuthors);
      const result = aggregator.aggregate(
        analyses,
        since,
        until,
        branches,
        options.author
      );

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
      console.error(chalk.red('❌ Error:'), error);
      process.exit(1);
    }
  });

program.parse();
