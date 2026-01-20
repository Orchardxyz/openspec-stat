import { describe, it, expect, beforeEach } from 'vitest';
import { OutputFormatter } from '../../formatters';
import { StatsResult, AuthorStats, ProposalStats } from '../../types';

describe('OutputFormatter', () => {
  let formatter: OutputFormatter;
  let mockResult: StatsResult;

  beforeEach(() => {
    formatter = new OutputFormatter();

    const authorStats1: AuthorStats = {
      author: 'John Doe',
      commits: 5,
      openspecProposals: new Set(['proposal-1', 'proposal-2']),
      codeFilesChanged: 10,
      additions: 100,
      deletions: 50,
      netChanges: 50,
      branchStats: new Map(),
      firstCommitDate: new Date('2024-01-10'),
      lastCommitDate: new Date('2024-01-20'),
      statisticsPeriod: '11 days',
    };

    const authorStats2: AuthorStats = {
      author: 'Jane Smith',
      commits: 3,
      openspecProposals: new Set(['proposal-1']),
      codeFilesChanged: 5,
      additions: 50,
      deletions: 25,
      netChanges: 25,
      branchStats: new Map(),
      firstCommitDate: new Date('2024-01-15'),
      lastCommitDate: new Date('2024-01-18'),
      statisticsPeriod: '4 days',
    };

    const proposalStats1: ProposalStats = {
      proposal: 'proposal-1',
      commits: 6,
      contributors: new Set(['John Doe', 'Jane Smith']),
      codeFilesChanged: 12,
      additions: 120,
      deletions: 60,
      netChanges: 60,
      commitHashes: new Set(['hash1', 'hash2', 'hash3']),
      multiProposalCommits: 0,
      sharedCommitHashes: new Set(),
    };

    const proposalStats2: ProposalStats = {
      proposal: 'proposal-2',
      commits: 2,
      contributors: new Set(['John Doe']),
      codeFilesChanged: 3,
      additions: 30,
      deletions: 15,
      netChanges: 15,
      commitHashes: new Set(['hash4', 'hash5']),
      multiProposalCommits: 0,
      sharedCommitHashes: new Set(),
    };

    mockResult = {
      timeRange: {
        since: new Date('2024-01-01'),
        until: new Date('2024-01-31'),
      },
      branches: ['origin/master'],
      authors: new Map([
        ['John Doe', authorStats1],
        ['Jane Smith', authorStats2],
      ]),
      proposals: new Map([
        ['proposal-1', proposalStats1],
        ['proposal-2', proposalStats2],
      ]),
      totalCommits: 8,
    };
  });

  describe('formatJSON', () => {
    it('should format result as JSON with contributors', () => {
      const output = formatter.formatJSON(mockResult, true);
      const parsed = JSON.parse(output);

      expect(parsed.timeRange).toBeDefined();
      expect(parsed.branches).toEqual(['origin/master']);
      expect(parsed.totalCommits).toBe(8);
      expect(parsed.authors).toBeDefined();
      expect(parsed.authors.length).toBe(2);
      expect(parsed.proposals).toBeDefined();
      expect(parsed.proposals.items.length).toBe(2);
    });

    it('should include author details when showContributors is true', () => {
      const output = formatter.formatJSON(mockResult, true);
      const parsed = JSON.parse(output);

      expect(parsed.authors).toBeDefined();
      expect(parsed.authors[0].author).toBeDefined();
      expect(parsed.authors[0].commits).toBeDefined();
      expect(parsed.authorsSummary).toBeUndefined();
    });

    it('should include summary when showContributors is false', () => {
      const output = formatter.formatJSON(mockResult, false);
      const parsed = JSON.parse(output);

      expect(parsed.authors).toBeUndefined();
      expect(parsed.authorsSummary).toBeDefined();
      expect(parsed.authorsSummary.totalContributors).toBe(2);
      expect(parsed.authorsSummary.totalCommits).toBe(8);
    });

    it('should include proposal statistics', () => {
      const output = formatter.formatJSON(mockResult, true);
      const parsed = JSON.parse(output);

      expect(parsed.proposals.items).toBeDefined();
      expect(parsed.proposals.items.length).toBe(2);
      expect(parsed.proposals.summary).toBeDefined();
      expect(parsed.proposals.summary.totalProposals).toBe(2);
    });

    it('should mark multi-proposal commits', () => {
      mockResult.proposals.get('proposal-1')!.multiProposalCommits = 2;
      mockResult.proposals.get('proposal-1')!.sharedCommitHashes = new Set(['hash1', 'hash2']);

      const output = formatter.formatJSON(mockResult, true);
      const parsed = JSON.parse(output);

      const proposal1 = parsed.proposals.items.find((p: { proposal: string }) => p.proposal === 'proposal-1');
      expect(proposal1.hasSharedCommits).toBe(true);
      expect(proposal1.multiProposalCommits).toBe(2);
      expect(proposal1.sharedCommitHashes).toEqual(['hash1', 'hash2']);
    });
  });

  describe('formatCSV', () => {
    it('should format result as CSV with contributors', () => {
      const output = formatter.formatCSV(mockResult, true);

      expect(output).toContain('proposal-1');
      expect(output).toContain('proposal-2');
      expect(output).toContain('John Doe');
      expect(output).toContain('Jane Smith');
    });

    it('should include proposal summary section', () => {
      const output = formatter.formatCSV(mockResult, true);

      expect(output).toContain('proposal-1,6');
      expect(output).toContain('proposal-2,2');
    });

    it('should include author details when showContributors is true', () => {
      const output = formatter.formatCSV(mockResult, true);

      expect(output).toContain('John Doe');
      expect(output).toContain('11 days');
      expect(output).toContain('Jane Smith');
      expect(output).toContain('4 days');
    });

    it('should include summary when showContributors is false', () => {
      const output = formatter.formatCSV(mockResult, false);

      expect(output).toContain('2,8');
      expect(output).not.toContain('11 days');
    });

    it('should escape contributors with semicolons', () => {
      const output = formatter.formatCSV(mockResult, true);

      expect(output).toContain('"proposal-1;proposal-2"');
    });
  });

  describe('formatMarkdown', () => {
    it('should format result as Markdown with contributors', () => {
      const output = formatter.formatMarkdown(mockResult, true);

      expect(output).toContain('##');
      expect(output).toContain('|');
      expect(output).toContain('proposal-1');
      expect(output).toContain('John Doe');
    });

    it('should include proposal table', () => {
      const output = formatter.formatMarkdown(mockResult, true);

      expect(output).toContain('| proposal-1 |');
      expect(output).toContain('| proposal-2 |');
    });

    it('should include author details when showContributors is true', () => {
      const output = formatter.formatMarkdown(mockResult, true);

      expect(output).toContain('| John Doe |');
      expect(output).toContain('| Jane Smith |');
      expect(output).toContain('11 days');
    });

    it('should include summary when showContributors is false', () => {
      const output = formatter.formatMarkdown(mockResult, false);

      expect(output).toContain('| 2 |');
      expect(output).not.toContain('11 days');
    });

    it('should mark multi-proposal commits with warning marker', () => {
      mockResult.proposals.get('proposal-1')!.multiProposalCommits = 2;

      const output = formatter.formatMarkdown(mockResult, true);

      expect(output).toContain('proposal-1 !');
    });

    it('should include proposal details section', () => {
      const output = formatter.formatMarkdown(mockResult, true);

      expect(output).toContain('### John Doe');
      expect(output).toContain('- proposal-1');
      expect(output).toContain('- proposal-2');
    });
  });

  describe('formatTable', () => {
    it('should format result as table with contributors', () => {
      const output = formatter.formatTable(mockResult, false, true);

      expect(output).toContain('John Doe');
      expect(output).toContain('Jane Smith');
      expect(output).toContain('proposal-1');
    });

    it('should include proposal summary', () => {
      const output = formatter.formatTable(mockResult, false, true);

      expect(output).toContain('proposal-1');
      expect(output).toContain('proposal-2');
    });

    it('should show author details when showContributors is true', () => {
      const output = formatter.formatTable(mockResult, false, true);

      expect(output).toContain('John Doe');
      expect(output).toContain('5');
    });

    it('should show summary when showContributors is false', () => {
      const output = formatter.formatTable(mockResult, false, false);

      expect(output).toContain('2');
      expect(output).toContain('8');
    });

    it('should mark multi-proposal commits with warning marker', () => {
      mockResult.proposals.get('proposal-1')!.multiProposalCommits = 2;

      const output = formatter.formatTable(mockResult, false, true);

      expect(output).toContain('proposal-1 !');
    });

    it('should show verbose proposal details when verbose is true', () => {
      const output = formatter.formatTable(mockResult, true, true);

      expect(output).toContain('proposal-1');
      expect(output).toContain('proposal-2');
    });

    it('should handle branch statistics when available', () => {
      const branchStats = new Map();
      branchStats.set('origin/main', {
        branch: 'origin/main',
        commits: 3,
        openspecProposals: new Set(['proposal-1']),
        codeFilesChanged: 5,
        additions: 50,
        deletions: 25,
        netChanges: 25,
      });

      mockResult.authors.get('John Doe')!.branchStats = branchStats;

      const output = formatter.formatTable(mockResult, false, true);

      expect(output).toContain('origin/main');
    });
  });

  describe('edge cases', () => {
    it('should handle empty result', () => {
      const emptyResult: StatsResult = {
        timeRange: {
          since: new Date('2024-01-01'),
          until: new Date('2024-01-31'),
        },
        branches: [],
        authors: new Map(),
        proposals: new Map(),
        totalCommits: 0,
      };

      expect(() => formatter.formatJSON(emptyResult)).not.toThrow();
      expect(() => formatter.formatCSV(emptyResult)).not.toThrow();
      expect(() => formatter.formatMarkdown(emptyResult)).not.toThrow();
      expect(() => formatter.formatTable(emptyResult)).not.toThrow();
    });

    it('should handle negative net changes', () => {
      mockResult.authors.get('John Doe')!.netChanges = -50;
      mockResult.proposals.get('proposal-1')!.netChanges = -30;

      const jsonOutput = formatter.formatJSON(mockResult);
      expect(jsonOutput).toContain('-50');
      expect(jsonOutput).toContain('-30');

      const csvOutput = formatter.formatCSV(mockResult);
      expect(csvOutput).toContain('-50');

      const mdOutput = formatter.formatMarkdown(mockResult);
      expect(mdOutput).toContain('-50');
    });

    it('should handle zero values', () => {
      mockResult.authors.get('John Doe')!.additions = 0;
      mockResult.authors.get('John Doe')!.deletions = 0;
      mockResult.authors.get('John Doe')!.netChanges = 0;

      expect(() => formatter.formatJSON(mockResult)).not.toThrow();
      expect(() => formatter.formatCSV(mockResult)).not.toThrow();
      expect(() => formatter.formatMarkdown(mockResult)).not.toThrow();
      expect(() => formatter.formatTable(mockResult)).not.toThrow();
    });
  });
});
