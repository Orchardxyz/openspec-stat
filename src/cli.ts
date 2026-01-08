#!/usr/bin/env node
import { Command } from 'commander';
import { runSingleRepoCommand } from './commands/single.js';
import { runMultiRepoCommand } from './commands/multi.js';
import { runInitCommand } from './commands/init.js';
import { CliOptions } from './types.js';

const program = new Command();

program
  .name('openspec-stat')
  .description("Track team members' OpenSpec proposals and code changes in Git repositories")
  .version('0.0.1');

program
  .option('-r, --repo <path>', 'Repository path', '.')
  .option('-b, --branches <branches>', 'Branch list, comma-separated')
  .option('--no-interactive', 'Disable interactive branch selection')
  .option('-s, --since <datetime>', 'Start time (default: yesterday 20:00)')
  .option('-u, --until <datetime>', 'End time (default: today 20:00)')
  .option('-a, --author <name>', 'Filter by specific author')
  .option('--json', 'Output in JSON format')
  .option('--csv', 'Output in CSV format')
  .option('--markdown', 'Output in Markdown format')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-v, --verbose', 'Verbose output mode')
  .option('-l, --lang <language>', 'Language for output (en, zh-CN)', 'en')
  .action(async (options: CliOptions) => {
    await runSingleRepoCommand(options);
  });

program
  .command('multi')
  .description('Multi-repository analysis mode (BETA)')
  .option('-c, --config <path>', 'Configuration file path', '.openspec-stats.multi.json')
  .option('-s, --since <datetime>', 'Override start time')
  .option('-u, --until <datetime>', 'Override end time')
  .option('-a, --author <name>', 'Filter by specific author')
  .option('--json', 'Output in JSON format')
  .option('--csv', 'Output in CSV format')
  .option('--markdown', 'Output in Markdown format')
  .option('-v, --verbose', 'Verbose output mode')
  .option('-l, --lang <language>', 'Language (en, zh-CN)', 'en')
  .option('--no-cleanup', 'Do not cleanup temporary directories')
  .action(async (options) => {
    await runMultiRepoCommand(options);
  });

program
  .command('init')
  .description('Initialize configuration file')
  .option('--multi', 'Create multi-repository configuration (interactive)')
  .option('--template <type>', 'Generate template (single|multi)')
  .option('-o, --output <path>', 'Output file path')
  .action(async (options) => {
    await runInitCommand(options);
  });

program.parse();
