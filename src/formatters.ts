import Table from 'cli-table3';
import chalk from 'chalk';
import { StatsResult } from './types';
import { t } from './i18n/index';

export class OutputFormatter {
  formatTable(result: StatsResult, verbose: boolean = false, showContributors: boolean = true): string {
    let output = '';
    output += chalk.bold(t('output.title'));
    output += chalk.gray(
      t('output.timeRange', {
        since: result.timeRange.since.toLocaleString('zh-CN', { hour12: false }),
        until: result.timeRange.until.toLocaleString('zh-CN', { hour12: false }),
      })
    );
    output += chalk.gray(t('output.branches', { branches: result.branches.join(', ') }));
    output += chalk.gray(t('output.totalCommits', { count: String(result.totalCommits) }));

    // Proposal Summary Table
    if (result.proposals.size > 0) {
      output += chalk.bold.magenta(`\n${t('output.proposalSummary')}\n`);

      const proposalTable = new Table({
        head: [
          chalk.magenta(t('table.proposal')),
          chalk.magenta(t('table.commits')),
          chalk.magenta(t('table.contributors')),
          chalk.magenta(t('table.codeFiles')),
          chalk.magenta(t('table.additions')),
          chalk.magenta(t('table.deletions')),
          chalk.magenta(t('table.netChanges')),
        ],
        style: {
          head: [],
          border: [],
        },
      });

      const sortedProposals = Array.from(result.proposals.values()).sort((a, b) => b.netChanges - a.netChanges);

      for (const proposalStats of sortedProposals) {
        const contributors = Array.from(proposalStats.contributors).join(', ');
        const proposalName =
          proposalStats.multiProposalCommits > 0
            ? `${proposalStats.proposal} ${chalk.yellow('⚠')}`
            : proposalStats.proposal;
        proposalTable.push([
          proposalName,
          proposalStats.commits.toString(),
          contributors,
          proposalStats.codeFilesChanged.toString(),
          chalk.green(`+${proposalStats.additions}`),
          chalk.red(`-${proposalStats.deletions}`),
          proposalStats.netChanges >= 0
            ? chalk.green(`+${proposalStats.netChanges}`)
            : chalk.red(`${proposalStats.netChanges}`),
        ]);
      }

      output += proposalTable.toString() + '\n';

      const hasMultiProposalCommits = Array.from(result.proposals.values()).some((p) => p.multiProposalCommits > 0);
      if (hasMultiProposalCommits) {
        output += chalk.yellow(`\n⚠ ${t('output.multiProposalWarning')}\n`);
        const affectedProposals = Array.from(result.proposals.values())
          .filter((p) => p.multiProposalCommits > 0)
          .map(
            (p) => `  • ${p.proposal}: ${p.multiProposalCommits}/${p.commits} commits ${t('output.sharedWithOthers')}`
          )
          .join('\n');
        output += chalk.gray(affectedProposals + '\n');
      }

      // Proposal summary totals
      const totalProposals = result.proposals.size;
      const totalProposalCommits = Array.from(result.proposals.values()).reduce((sum, p) => sum + p.commits, 0);
      const totalProposalFiles = Array.from(result.proposals.values()).reduce((sum, p) => sum + p.codeFilesChanged, 0);
      const totalProposalAdditions = Array.from(result.proposals.values()).reduce((sum, p) => sum + p.additions, 0);
      const totalProposalDeletions = Array.from(result.proposals.values()).reduce((sum, p) => sum + p.deletions, 0);
      const totalProposalNetChanges = Array.from(result.proposals.values()).reduce((sum, p) => sum + p.netChanges, 0);

      output += chalk.cyan('─'.repeat(80)) + '\n';
      output += chalk.bold.cyan(
        t('output.proposalTotal', {
          count: totalProposals.toString(),
          commits: totalProposalCommits.toString(),
          files: totalProposalFiles.toString(),
          additions: totalProposalAdditions.toString(),
          deletions: totalProposalDeletions.toString(),
          netChanges: totalProposalNetChanges.toString(),
        })
      );
      output += chalk.cyan('─'.repeat(80)) + '\n';
    }

    output += chalk.bold.cyan(`\n${t('output.authorSummary')}\n`);
    const sortedAuthors = Array.from(result.authors.values()).sort((a, b) => b.commits - a.commits);

    if (!showContributors) {
      // Show only summary when showContributors is false
      const totalAuthors = sortedAuthors.length;
      const totalCommits = sortedAuthors.reduce((sum, s) => sum + s.commits, 0);
      const totalProposalsSet = new Set<string>();
      sortedAuthors.forEach((s) => s.openspecProposals.forEach((p) => totalProposalsSet.add(p)));
      const totalFiles = sortedAuthors.reduce((sum, s) => sum + s.codeFilesChanged, 0);
      const totalAdditions = sortedAuthors.reduce((sum, s) => sum + s.additions, 0);
      const totalDeletions = sortedAuthors.reduce((sum, s) => sum + s.deletions, 0);
      const totalNetChanges = sortedAuthors.reduce((sum, s) => sum + s.netChanges, 0);

      const summaryTable = new Table({
        head: [
          chalk.cyan(t('table.contributors')),
          chalk.cyan(t('table.commits')),
          chalk.cyan(t('table.proposals')),
          chalk.cyan(t('table.codeFiles')),
          chalk.cyan(t('table.additions')),
          chalk.cyan(t('table.deletions')),
          chalk.cyan(t('table.netChanges')),
        ],
        style: {
          head: [],
          border: [],
        },
      });

      summaryTable.push([
        totalAuthors.toString(),
        totalCommits.toString(),
        totalProposalsSet.size.toString(),
        totalFiles.toString(),
        chalk.green(`+${totalAdditions}`),
        chalk.red(`-${totalDeletions}`),
        totalNetChanges >= 0 ? chalk.green(`+${totalNetChanges}`) : chalk.red(`${totalNetChanges}`),
      ]);

      output += summaryTable.toString() + '\n';
      output += chalk.gray(t('output.contributorHint')) + '\n';
      return output;
    }

    for (const stats of sortedAuthors) {
      output += chalk.bold.cyan(`\n${stats.author}\n`);

      if (stats.branchStats && stats.branchStats.size > 0) {
        const branchTable = new Table({
          head: [
            chalk.cyan(t('table.branch')),
            chalk.cyan(t('table.commits')),
            chalk.cyan(t('table.proposals')),
            chalk.cyan(t('table.codeFiles')),
            chalk.cyan(t('table.additions')),
            chalk.cyan(t('table.deletions')),
            chalk.cyan(t('table.netChanges')),
          ],
          style: {
            head: [],
            border: [],
          },
        });

        const sortedBranches = Array.from(stats.branchStats.values()).sort((a, b) => b.commits - a.commits);

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
          chalk.bold.yellow(t('table.totalDeduplicated')),
          chalk.bold(stats.commits.toString()),
          chalk.bold(stats.openspecProposals.size.toString()),
          chalk.bold(stats.codeFilesChanged.toString()),
          chalk.bold.green(`+${stats.additions}`),
          chalk.bold.red(`-${stats.deletions}`),
          stats.netChanges >= 0 ? chalk.bold.green(`+${stats.netChanges}`) : chalk.bold.red(`${stats.netChanges}`),
        ]);

        output += branchTable.toString() + '\n';
      } else {
        const simpleTable = new Table({
          head: [
            chalk.cyan(t('table.period')),
            chalk.cyan(t('table.commits')),
            chalk.cyan(t('table.proposals')),
            chalk.cyan(t('table.codeFiles')),
            chalk.cyan(t('table.additions')),
            chalk.cyan(t('table.deletions')),
            chalk.cyan(t('table.netChanges')),
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
          stats.netChanges >= 0 ? chalk.green(`+${stats.netChanges}`) : chalk.red(`${stats.netChanges}`),
        ]);

        output += simpleTable.toString() + '\n';
      }

      if (verbose && stats.openspecProposals.size > 0) {
        output += chalk.gray(t('output.proposals', { proposals: Array.from(stats.openspecProposals).join(', ') }));
      }
    }

    return output;
  }

  formatJSON(result: StatsResult, showContributors: boolean = true): string {
    const sortedAuthors = Array.from(result.authors.values());

    const data: any = {
      timeRange: {
        since: result.timeRange.since.toISOString(),
        until: result.timeRange.until.toISOString(),
      },
      branches: result.branches,
      totalCommits: result.totalCommits,
      proposals: {
        items: Array.from(result.proposals.values()).map((stats) => ({
          proposal: stats.proposal,
          commits: stats.commits,
          contributors: Array.from(stats.contributors),
          contributorCount: stats.contributors.size,
          codeFilesChanged: stats.codeFilesChanged,
          additions: stats.additions,
          deletions: stats.deletions,
          netChanges: stats.netChanges,
          multiProposalCommits: stats.multiProposalCommits,
          hasSharedCommits: stats.multiProposalCommits > 0,
          sharedCommitHashes: Array.from(stats.sharedCommitHashes),
        })),
        summary: {
          totalProposals: result.proposals.size,
          totalCommits: Array.from(result.proposals.values()).reduce((sum, p) => sum + p.commits, 0),
          totalCodeFiles: Array.from(result.proposals.values()).reduce((sum, p) => sum + p.codeFilesChanged, 0),
          totalAdditions: Array.from(result.proposals.values()).reduce((sum, p) => sum + p.additions, 0),
          totalDeletions: Array.from(result.proposals.values()).reduce((sum, p) => sum + p.deletions, 0),
          totalNetChanges: Array.from(result.proposals.values()).reduce((sum, p) => sum + p.netChanges, 0),
        },
      },
    };

    if (showContributors) {
      data.authors = sortedAuthors.map((stats) => ({
        author: stats.author,
        commits: stats.commits,
        openspecProposals: Array.from(stats.openspecProposals),
        proposalCount: stats.openspecProposals.size,
        codeFilesChanged: stats.codeFilesChanged,
        additions: stats.additions,
        deletions: stats.deletions,
        netChanges: stats.netChanges,
        lastCommitDate: stats.lastCommitDate?.toISOString(),
      }));
    } else {
      const totalProposalsSet = new Set<string>();
      sortedAuthors.forEach((s) => s.openspecProposals.forEach((p) => totalProposalsSet.add(p)));

      data.authorsSummary = {
        totalContributors: sortedAuthors.length,
        totalCommits: sortedAuthors.reduce((sum, s) => sum + s.commits, 0),
        totalProposals: totalProposalsSet.size,
        totalCodeFiles: sortedAuthors.reduce((sum, s) => sum + s.codeFilesChanged, 0),
        totalAdditions: sortedAuthors.reduce((sum, s) => sum + s.additions, 0),
        totalDeletions: sortedAuthors.reduce((sum, s) => sum + s.deletions, 0),
        totalNetChanges: sortedAuthors.reduce((sum, s) => sum + s.netChanges, 0),
      };
    }

    return JSON.stringify(data, null, 2);
  }

  formatCSV(result: StatsResult, showContributors: boolean = true): string {
    const rows: string[] = [];

    // Proposal summary section
    rows.push(`\n# ${t('output.proposalSummary')}`);
    rows.push(
      `${t('table.proposal')},${t('table.commits')},${t('table.contributors')},${t('table.codeFiles')},${t('table.additions')},${t('table.deletions')},${t('table.netChanges')}`
    );

    const sortedProposals = Array.from(result.proposals.values()).sort((a, b) => b.netChanges - a.netChanges);

    for (const stats of sortedProposals) {
      const contributors = Array.from(stats.contributors).join(';');
      rows.push(
        [
          stats.proposal,
          stats.commits,
          `"${contributors}"`,
          stats.codeFilesChanged,
          stats.additions,
          stats.deletions,
          stats.netChanges,
        ].join(',')
      );
    }

    // Proposal totals
    const totalProposals = result.proposals.size;
    const totalProposalCommits = Array.from(result.proposals.values()).reduce((sum, p) => sum + p.commits, 0);
    const totalProposalFiles = Array.from(result.proposals.values()).reduce((sum, p) => sum + p.codeFilesChanged, 0);
    const totalProposalAdditions = Array.from(result.proposals.values()).reduce((sum, p) => sum + p.additions, 0);
    const totalProposalDeletions = Array.from(result.proposals.values()).reduce((sum, p) => sum + p.deletions, 0);
    const totalProposalNetChanges = Array.from(result.proposals.values()).reduce((sum, p) => sum + p.netChanges, 0);

    rows.push('');
    rows.push(`# ${t('output.proposalTotalLabel')}`);
    rows.push(`${t('table.proposals')},${totalProposals}`);
    rows.push(`${t('table.commits')},${totalProposalCommits}`);
    rows.push(`${t('table.codeFiles')},${totalProposalFiles}`);
    rows.push(`${t('table.additions')},${totalProposalAdditions}`);
    rows.push(`${t('table.deletions')},${totalProposalDeletions}`);
    rows.push(`${t('table.netChanges')},${totalProposalNetChanges}`);

    // Author summary section
    rows.push(`\n# ${t('output.authorSummary')}`);

    const sortedAuthors = Array.from(result.authors.values()).sort((a, b) => b.commits - a.commits);

    if (showContributors) {
      rows.push(
        `${t('table.author')},${t('table.period')},${t('table.commits')},${t('table.proposalsCount')},${t('table.proposalsList')},${t('table.codeFiles')},${t('table.additions')},${t('table.deletions')},${t('table.netChanges')},${t('table.lastCommitDate')}`
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
    } else {
      rows.push(
        `${t('table.contributors')},${t('table.commits')},${t('table.proposals')},${t('table.codeFiles')},${t('table.additions')},${t('table.deletions')},${t('table.netChanges')}`
      );

      const totalProposalsSet = new Set<string>();
      sortedAuthors.forEach((s) => s.openspecProposals.forEach((p) => totalProposalsSet.add(p)));

      rows.push(
        [
          sortedAuthors.length,
          sortedAuthors.reduce((sum, s) => sum + s.commits, 0),
          totalProposalsSet.size,
          sortedAuthors.reduce((sum, s) => sum + s.codeFilesChanged, 0),
          sortedAuthors.reduce((sum, s) => sum + s.additions, 0),
          sortedAuthors.reduce((sum, s) => sum + s.deletions, 0),
          sortedAuthors.reduce((sum, s) => sum + s.netChanges, 0),
        ].join(',')
      );

      rows.push('');
      rows.push(`# ${t('output.contributorHint')}`);
    }

    return rows.join('\n');
  }

  formatMarkdown(result: StatsResult, showContributors: boolean = true): string {
    let md = '';
    md += t('markdown.title');
    md += t('markdown.timeRange', {
      since: result.timeRange.since.toLocaleString('zh-CN', { hour12: false }),
      until: result.timeRange.until.toLocaleString('zh-CN', { hour12: false }),
    });
    md += t('markdown.branches', { branches: result.branches.join(', ') });
    md += t('markdown.totalCommits', { count: String(result.totalCommits) });

    // Proposal summary
    md += `\n## ${t('output.proposalSummary')}\n\n`;
    md += `| ${t('table.proposal')} | ${t('table.commits')} | ${t('table.contributors')} | ${t('table.codeFiles')} | ${t('table.additions')} | ${t('table.deletions')} | ${t('table.netChanges')} |\n`;
    md += '|--------|---------|-------------|------------|-----------|-----------|-------------|\n';

    const sortedProposals = Array.from(result.proposals.values()).sort((a, b) => b.netChanges - a.netChanges);

    for (const stats of sortedProposals) {
      const contributors = Array.from(stats.contributors).join(', ');
      const proposalName = stats.multiProposalCommits > 0 ? `${stats.proposal} ⚠️` : stats.proposal;
      md += `| ${proposalName} | ${stats.commits} | ${contributors} | ${stats.codeFilesChanged} | +${stats.additions} | -${stats.deletions} | ${stats.netChanges >= 0 ? '+' : ''}${stats.netChanges} |\n`;
    }

    // Proposal totals
    const totalProposals = result.proposals.size;
    const totalProposalCommits = Array.from(result.proposals.values()).reduce((sum, p) => sum + p.commits, 0);
    const totalProposalFiles = Array.from(result.proposals.values()).reduce((sum, p) => sum + p.codeFilesChanged, 0);
    const totalProposalAdditions = Array.from(result.proposals.values()).reduce((sum, p) => sum + p.additions, 0);
    const totalProposalDeletions = Array.from(result.proposals.values()).reduce((sum, p) => sum + p.deletions, 0);
    const totalProposalNetChanges = Array.from(result.proposals.values()).reduce((sum, p) => sum + p.netChanges, 0);

    md += `\n**${t('output.proposalTotalLabel')}**\n`;
    md += `- ${t('table.proposals')}: ${totalProposals}\n`;
    md += `- ${t('table.commits')}: ${totalProposalCommits}\n`;
    md += `- ${t('table.codeFiles')}: ${totalProposalFiles}\n`;
    md += `- ${t('table.additions')}: +${totalProposalAdditions}\n`;
    md += `- ${t('table.deletions')}: -${totalProposalDeletions}\n`;
    md += `- ${t('table.netChanges')}: ${totalProposalNetChanges >= 0 ? '+' : ''}${totalProposalNetChanges}\n`;

    const hasMultiProposalCommits = Array.from(result.proposals.values()).some((p) => p.multiProposalCommits > 0);
    if (hasMultiProposalCommits) {
      md += `\n> ⚠️ **${t('output.multiProposalWarning')}**\n>\n`;
      const affectedProposals = Array.from(result.proposals.values()).filter((p) => p.multiProposalCommits > 0);
      for (const p of affectedProposals) {
        md += `> - ${p.proposal}: ${p.multiProposalCommits}/${p.commits} commits ${t('output.sharedWithOthers')}\n`;
      }
      md += '\n';
    }

    // Author summary
    md += `\n## ${t('output.authorSummary')}\n\n`;

    const sortedAuthors = Array.from(result.authors.values()).sort((a, b) => b.commits - a.commits);

    if (showContributors) {
      md += `| ${t('table.author')} | ${t('table.period')} | ${t('table.commits')} | ${t('table.proposals')} | ${t('table.codeFiles')} | ${t('table.additions')} | ${t('table.deletions')} | ${t('table.netChanges')} |\n`;
      md += '|--------|--------|---------|-----------|------------|-----------|-----------|-------------|\n';

      for (const stats of sortedAuthors) {
        md += `| ${stats.author} | ${stats.statisticsPeriod || '-'} | ${stats.commits} | ${stats.openspecProposals.size} | ${stats.codeFilesChanged} | +${stats.additions} | -${stats.deletions} | ${stats.netChanges >= 0 ? '+' : ''}${stats.netChanges} |\n`;
      }

      md += t('markdown.proposalDetails');
      for (const stats of sortedAuthors) {
        if (stats.openspecProposals.size > 0) {
          md += `### ${stats.author}\n\n`;
          for (const proposal of Array.from(stats.openspecProposals)) {
            md += `- ${proposal}\n`;
          }
          md += '\n';
        }
      }
    } else {
      md += `| ${t('table.contributors')} | ${t('table.commits')} | ${t('table.proposals')} | ${t('table.codeFiles')} | ${t('table.additions')} | ${t('table.deletions')} | ${t('table.netChanges')} |\n`;
      md += '|------------|---------|-----------|------------|-----------|-----------|-------------|\n';

      const totalProposalsSet = new Set<string>();
      sortedAuthors.forEach((s) => s.openspecProposals.forEach((p) => totalProposalsSet.add(p)));

      const totalAuthors = sortedAuthors.length;
      const totalCommits = sortedAuthors.reduce((sum, s) => sum + s.commits, 0);
      const totalFiles = sortedAuthors.reduce((sum, s) => sum + s.codeFilesChanged, 0);
      const totalAdditions = sortedAuthors.reduce((sum, s) => sum + s.additions, 0);
      const totalDeletions = sortedAuthors.reduce((sum, s) => sum + s.deletions, 0);
      const totalNetChanges = sortedAuthors.reduce((sum, s) => sum + s.netChanges, 0);

      md += `| ${totalAuthors} | ${totalCommits} | ${totalProposalsSet.size} | ${totalFiles} | +${totalAdditions} | -${totalDeletions} | ${totalNetChanges >= 0 ? '+' : ''}${totalNetChanges} |\n`;
      md += `\n*${t('output.contributorHint')}*\n`;
    }

    return md;
  }
}
