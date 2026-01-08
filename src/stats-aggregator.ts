import { CommitAnalysis, AuthorStats, StatsResult, Config, ProposalStats } from './types.js';
import { normalizeAuthor } from './config.js';

export class StatsAggregator {
  private config: Config;
  private activeAuthors?: Set<string>;

  constructor(config: Config, activeAuthors?: Set<string>) {
    this.config = config;
    this.activeAuthors = activeAuthors;
  }

  aggregate(
    analyses: CommitAnalysis[],
    since: Date,
    until: Date,
    branches: string[],
    filterAuthor?: string
  ): StatsResult {
    const authorStatsMap = new Map<string, AuthorStats>();
    const proposalStatsMap = new Map<string, ProposalStats>();

    for (const analysis of analyses) {
      const normalizedAuthor = normalizeAuthor(analysis.commit.author, this.config.authorMapping);

      if (this.activeAuthors && !this.activeAuthors.has(normalizedAuthor)) {
        continue;
      }

      if (filterAuthor && normalizedAuthor !== filterAuthor) {
        continue;
      }

      let stats = authorStatsMap.get(normalizedAuthor);
      if (!stats) {
        stats = {
          author: normalizedAuthor,
          commits: 0,
          openspecProposals: new Set<string>(),
          codeFilesChanged: 0,
          additions: 0,
          deletions: 0,
          netChanges: 0,
          branchStats: new Map(),
        };
        authorStatsMap.set(normalizedAuthor, stats);
      }

      stats.commits++;
      stats.additions += analysis.totalAdditions;
      stats.deletions += analysis.totalDeletions;
      stats.netChanges += analysis.netChanges;
      stats.codeFilesChanged += analysis.codeFiles.length;

      for (const proposal of analysis.openspecProposals) {
        stats.openspecProposals.add(proposal);

        // Aggregate by proposal
        let proposalStats = proposalStatsMap.get(proposal);
        if (!proposalStats) {
          proposalStats = {
            proposal,
            commits: 0,
            contributors: new Set<string>(),
            codeFilesChanged: 0,
            additions: 0,
            deletions: 0,
            netChanges: 0,
            commitHashes: new Set<string>(),
          };
          proposalStatsMap.set(proposal, proposalStats);
        }

        // Only count each commit once per proposal
        if (!proposalStats.commitHashes.has(analysis.commit.hash)) {
          proposalStats.commitHashes.add(analysis.commit.hash);
          proposalStats.commits++;
          proposalStats.contributors.add(normalizedAuthor);
          proposalStats.codeFilesChanged += analysis.codeFiles.length;
          proposalStats.additions += analysis.totalAdditions;
          proposalStats.deletions += analysis.totalDeletions;
          proposalStats.netChanges += analysis.netChanges;
        }
      }

      if (!stats.lastCommitDate || analysis.commit.date > stats.lastCommitDate) {
        stats.lastCommitDate = analysis.commit.date;
      }

      if (!stats.firstCommitDate || analysis.commit.date < stats.firstCommitDate) {
        stats.firstCommitDate = analysis.commit.date;
      }

      if (analysis.commit.branches && stats.branchStats) {
        for (const branch of analysis.commit.branches) {
          let branchStat = stats.branchStats.get(branch);
          if (!branchStat) {
            branchStat = {
              branch,
              commits: 0,
              openspecProposals: new Set<string>(),
              codeFilesChanged: 0,
              additions: 0,
              deletions: 0,
              netChanges: 0,
            };
            stats.branchStats.set(branch, branchStat);
          }

          branchStat.commits++;
          branchStat.additions += analysis.totalAdditions;
          branchStat.deletions += analysis.totalDeletions;
          branchStat.netChanges += analysis.netChanges;
          branchStat.codeFilesChanged += analysis.codeFiles.length;

          for (const proposal of analysis.openspecProposals) {
            branchStat.openspecProposals.add(proposal);
          }
        }
      }
    }

    for (const stats of authorStatsMap.values()) {
      if (stats.firstCommitDate && stats.lastCommitDate) {
        const days = Math.ceil(
          (stats.lastCommitDate.getTime() - stats.firstCommitDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        stats.statisticsPeriod = days === 0 ? '1 day' : `${days + 1} days`;
      }
    }

    const actualBranches = new Set<string>();
    for (const stats of authorStatsMap.values()) {
      if (stats.branchStats) {
        for (const branch of stats.branchStats.keys()) {
          actualBranches.add(branch);
        }
      }
    }

    return {
      timeRange: { since, until },
      branches: actualBranches.size > 0 ? Array.from(actualBranches) : branches,
      authors: authorStatsMap,
      proposals: proposalStatsMap,
      totalCommits: analyses.length,
    };
  }
}
