import Table from 'cli-table3';
import chalk from 'chalk';
import { StatsResult, AuthorStats } from './types.js';

export class OutputFormatter {
  formatTable(result: StatsResult, verbose: boolean = false): string {
    let output = '';
    output += chalk.bold('\n📊 OpenSpec Statistics Report\n');
    output += chalk.gray(
      `Time Range: ${result.timeRange.since.toLocaleString('en-US')} ~ ${result.timeRange.until.toLocaleString('en-US')}\n`
    );
    output += chalk.gray(`Branches: ${result.branches.join(', ')}\n`);
    output += chalk.gray(`Total Commits: ${result.totalCommits}\n\n`);

    const sortedAuthors = Array.from(result.authors.values()).sort(
      (a, b) => b.commits - a.commits
    );

    for (const stats of sortedAuthors) {
      output += chalk.bold.cyan(`\n${stats.author}\n`);

      if (stats.branchStats && stats.branchStats.size > 0) {
        const branchTable = new Table({
          head: [
            chalk.cyan('Branch'),
            chalk.cyan('Commits'),
            chalk.cyan('Proposals'),
            chalk.cyan('Code Files'),
            chalk.cyan('Additions'),
            chalk.cyan('Deletions'),
            chalk.cyan('Net Changes'),
          ],
          style: {
            head: [],
            border: [],
          },
        });

        const sortedBranches = Array.from(stats.branchStats.values()).sort(
          (a, b) => b.commits - a.commits
        );

        for (const branchStat of sortedBranches) {
          branchTable.push([
            branchStat.branch,
            branchStat.commits.toString(),
            branchStat.openspecProposals.size.toString(),
            branchStat.codeFilesChanged.toString(),
            chalk.green(`+${branchStat.additions}`),
            chalk.red(`-${branchStat.deletions}`),
            branchStat.netChanges >= 0
              ? chalk.green(`+${branchStat.netChanges}`)
              : chalk.red(`${branchStat.netChanges}`),
          ]);
        }

        branchTable.push([
          chalk.bold.yellow('TOTAL (Deduplicated)'),
          chalk.bold(stats.commits.toString()),
          chalk.bold(stats.openspecProposals.size.toString()),
          chalk.bold(stats.codeFilesChanged.toString()),
          chalk.bold.green(`+${stats.additions}`),
          chalk.bold.red(`-${stats.deletions}`),
          stats.netChanges >= 0
            ? chalk.bold.green(`+${stats.netChanges}`)
            : chalk.bold.red(`${stats.netChanges}`),
        ]);

        output += branchTable.toString() + '\n';
      } else {
        const simpleTable = new Table({
          head: [
            chalk.cyan('Period'),
            chalk.cyan('Commits'),
            chalk.cyan('Proposals'),
            chalk.cyan('Code Files'),
            chalk.cyan('Additions'),
            chalk.cyan('Deletions'),
            chalk.cyan('Net Changes'),
          ],
          style: {
            head: [],
            border: [],
          },
        });

        simpleTable.push([
          stats.statisticsPeriod || '-',
          stats.commits.toString(),
          stats.openspecProposals.size.toString(),
          stats.codeFilesChanged.toString(),
          chalk.green(`+${stats.additions}`),
          chalk.red(`-${stats.deletions}`),
          stats.netChanges >= 0
            ? chalk.green(`+${stats.netChanges}`)
            : chalk.red(`${stats.netChanges}`),
        ]);

        output += simpleTable.toString() + '\n';
      }

      if (verbose && stats.openspecProposals.size > 0) {
        output += chalk.gray(`  Proposals: ${Array.from(stats.openspecProposals).join(', ')}\n`);
      }
    }

    return output;
  }

  formatJSON(result: StatsResult): string {
    const data = {
      timeRange: {
        since: result.timeRange.since.toISOString(),
        until: result.timeRange.until.toISOString(),
      },
      branches: result.branches,
      totalCommits: result.totalCommits,
      authors: Array.from(result.authors.values()).map((stats) => ({
        author: stats.author,
        commits: stats.commits,
        openspecProposals: Array.from(stats.openspecProposals),
        proposalCount: stats.openspecProposals.size,
        codeFilesChanged: stats.codeFilesChanged,
        additions: stats.additions,
        deletions: stats.deletions,
        netChanges: stats.netChanges,
        lastCommitDate: stats.lastCommitDate?.toISOString(),
      })),
    };

    return JSON.stringify(data, null, 2);
  }

  formatCSV(result: StatsResult): string {
    const rows: string[] = [];
    rows.push(
      'Author,Period,Commits,Proposals Count,Proposals List,Code Files,Additions,Deletions,Net Changes,Last Commit Date'
    );

    const sortedAuthors = Array.from(result.authors.values()).sort(
      (a, b) => b.commits - a.commits
    );

    for (const stats of sortedAuthors) {
      const proposals = Array.from(stats.openspecProposals).join(';');
      rows.push(
        [
          stats.author,
          stats.statisticsPeriod || '-',
          stats.commits,
          stats.openspecProposals.size,
          `"${proposals}"`,
          stats.codeFilesChanged,
          stats.additions,
          stats.deletions,
          stats.netChanges,
          stats.lastCommitDate?.toISOString() || '',
        ].join(',')
      );
    }

    return rows.join('\n');
  }

  formatMarkdown(result: StatsResult): string {
    let md = '';
    md += '# OpenSpec Statistics Report\n\n';
    md += `**Time Range**: ${result.timeRange.since.toLocaleString('en-US')} ~ ${result.timeRange.until.toLocaleString('en-US')}\n\n`;
    md += `**Branches**: ${result.branches.join(', ')}\n\n`;
    md += `**Total Commits**: ${result.totalCommits}\n\n`;

    md += '## Statistics\n\n';
    md +=
      '| Author | Period | Commits | Proposals | Code Files | Additions | Deletions | Net Changes |\n';
    md +=
      '|--------|--------|---------|-----------|------------|-----------|-----------|-------------|\n';

    const sortedAuthors = Array.from(result.authors.values()).sort(
      (a, b) => b.commits - a.commits
    );

    for (const stats of sortedAuthors) {
      md += `| ${stats.author} | ${stats.statisticsPeriod || '-'} | ${stats.commits} | ${stats.openspecProposals.size} | ${stats.codeFilesChanged} | +${stats.additions} | -${stats.deletions} | ${stats.netChanges >= 0 ? '+' : ''}${stats.netChanges} |\n`;
    }

    md += '\n## Proposal Details\n\n';
    for (const stats of sortedAuthors) {
      if (stats.openspecProposals.size > 0) {
        md += `### ${stats.author}\n\n`;
        for (const proposal of Array.from(stats.openspecProposals)) {
          md += `- ${proposal}\n`;
        }
        md += '\n';
      }
    }

    return md;
  }
}
