import { describe, it, expect, beforeEach } from 'vitest';
import { StatsAggregator } from '../../stats-aggregator.js';
import { CommitAnalysis, Config, FileChange, CommitInfo } from '../../types.js';

describe('StatsAggregator', () => {
  let config: Config;
  let activeAuthors: Set<string>;

  beforeEach(() => {
    config = {
      defaultBranches: ['origin/master'],
      defaultSinceHours: -30,
      defaultUntilHours: 20,
      authorMapping: {
        'john.doe': 'John Doe',
        'jane.smith': 'Jane Smith',
      },
      openspecDir: 'openspec/',
      excludeExtensions: ['.md'],
      activeUserWeeks: 2,
    };

    activeAuthors = new Set(['John Doe', 'Jane Smith']);
  });

  const createMockCommit = (author: string, date: Date, hash: string): CommitInfo => ({
    hash,
    author,
    email: `${author.toLowerCase().replace(' ', '.')}@example.com`,
    date,
    message: 'Test commit',
    branches: ['origin/master'],
  });

  const createMockFileChange = (path: string, additions: number, deletions: number): FileChange => ({
    path,
    additions,
    deletions,
    status: 'M',
  });

  const createMockAnalysis = (
    author: string,
    proposals: string[],
    files: FileChange[],
    date: Date,
    hash: string
  ): CommitAnalysis => {
    const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
    const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

    return {
      commit: createMockCommit(author, date, hash),
      openspecProposals: new Set(proposals),
      codeFiles: files,
      totalAdditions,
      totalDeletions,
      netChanges: totalAdditions - totalDeletions,
    };
  };

  describe('aggregate', () => {
    it('should aggregate stats for single author and proposal', () => {
      const aggregator = new StatsAggregator(config, activeAuthors);
      const since = new Date('2024-01-01');
      const until = new Date('2024-01-31');

      const analyses: CommitAnalysis[] = [
        createMockAnalysis(
          'John Doe',
          ['proposal-1'],
          [createMockFileChange('src/file1.ts', 10, 5)],
          new Date('2024-01-15'),
          'hash1'
        ),
      ];

      const result = aggregator.aggregate(analyses, since, until, ['origin/master']);

      expect(result.authors.size).toBe(1);
      expect(result.proposals.size).toBe(1);

      const authorStats = result.authors.get('John Doe');
      expect(authorStats).toBeDefined();
      expect(authorStats?.commits).toBe(1);
      expect(authorStats?.additions).toBe(10);
      expect(authorStats?.deletions).toBe(5);
      expect(authorStats?.netChanges).toBe(5);
      expect(authorStats?.openspecProposals.size).toBe(1);
      expect(authorStats?.openspecProposals.has('proposal-1')).toBe(true);

      const proposalStats = result.proposals.get('proposal-1');
      expect(proposalStats).toBeDefined();
      expect(proposalStats?.commits).toBe(1);
      expect(proposalStats?.contributors.size).toBe(1);
      expect(proposalStats?.additions).toBe(10);
      expect(proposalStats?.deletions).toBe(5);
    });

    it('should aggregate stats for multiple authors', () => {
      const aggregator = new StatsAggregator(config, activeAuthors);
      const since = new Date('2024-01-01');
      const until = new Date('2024-01-31');

      const analyses: CommitAnalysis[] = [
        createMockAnalysis(
          'John Doe',
          ['proposal-1'],
          [createMockFileChange('src/file1.ts', 10, 5)],
          new Date('2024-01-15'),
          'hash1'
        ),
        createMockAnalysis(
          'Jane Smith',
          ['proposal-1'],
          [createMockFileChange('src/file2.ts', 20, 10)],
          new Date('2024-01-16'),
          'hash2'
        ),
      ];

      const result = aggregator.aggregate(analyses, since, until, ['origin/master']);

      expect(result.authors.size).toBe(2);
      expect(result.proposals.size).toBe(1);

      const johnStats = result.authors.get('John Doe');
      expect(johnStats?.commits).toBe(1);
      expect(johnStats?.additions).toBe(10);

      const janeStats = result.authors.get('Jane Smith');
      expect(janeStats?.commits).toBe(1);
      expect(janeStats?.additions).toBe(20);

      const proposalStats = result.proposals.get('proposal-1');
      expect(proposalStats?.contributors.size).toBe(2);
      expect(proposalStats?.commits).toBe(2);
    });

    it('should normalize author names using mapping', () => {
      const aggregator = new StatsAggregator(config, activeAuthors);
      const since = new Date('2024-01-01');
      const until = new Date('2024-01-31');

      const analyses: CommitAnalysis[] = [
        createMockAnalysis(
          'john.doe',
          ['proposal-1'],
          [createMockFileChange('src/file1.ts', 10, 5)],
          new Date('2024-01-15'),
          'hash1'
        ),
      ];

      const result = aggregator.aggregate(analyses, since, until, ['origin/master']);

      expect(result.authors.has('John Doe')).toBe(true);
      expect(result.authors.has('john.doe')).toBe(false);
    });

    it('should filter out inactive authors when activeAuthors is provided', () => {
      const aggregator = new StatsAggregator(config, activeAuthors);
      const since = new Date('2024-01-01');
      const until = new Date('2024-01-31');

      const analyses: CommitAnalysis[] = [
        createMockAnalysis(
          'John Doe',
          ['proposal-1'],
          [createMockFileChange('src/file1.ts', 10, 5)],
          new Date('2024-01-15'),
          'hash1'
        ),
        createMockAnalysis(
          'Inactive User',
          ['proposal-2'],
          [createMockFileChange('src/file2.ts', 20, 10)],
          new Date('2024-01-16'),
          'hash2'
        ),
      ];

      const result = aggregator.aggregate(analyses, since, until, ['origin/master']);

      expect(result.authors.size).toBe(1);
      expect(result.authors.has('John Doe')).toBe(true);
      expect(result.authors.has('Inactive User')).toBe(false);
    });

    it('should filter by author when filterAuthor is provided', () => {
      const aggregator = new StatsAggregator(config, activeAuthors);
      const since = new Date('2024-01-01');
      const until = new Date('2024-01-31');

      const analyses: CommitAnalysis[] = [
        createMockAnalysis(
          'John Doe',
          ['proposal-1'],
          [createMockFileChange('src/file1.ts', 10, 5)],
          new Date('2024-01-15'),
          'hash1'
        ),
        createMockAnalysis(
          'Jane Smith',
          ['proposal-2'],
          [createMockFileChange('src/file2.ts', 20, 10)],
          new Date('2024-01-16'),
          'hash2'
        ),
      ];

      const result = aggregator.aggregate(analyses, since, until, ['origin/master'], 'John Doe');

      expect(result.authors.size).toBe(1);
      expect(result.authors.has('John Doe')).toBe(true);
      expect(result.authors.has('Jane Smith')).toBe(false);
    });

    it('should handle multi-proposal commits correctly', () => {
      const aggregator = new StatsAggregator(config, activeAuthors);
      const since = new Date('2024-01-01');
      const until = new Date('2024-01-31');

      const analyses: CommitAnalysis[] = [
        createMockAnalysis(
          'John Doe',
          ['proposal-1', 'proposal-2'],
          [createMockFileChange('src/file1.ts', 100, 50), createMockFileChange('src/file2.ts', 200, 100)],
          new Date('2024-01-15'),
          'hash1'
        ),
      ];

      const result = aggregator.aggregate(analyses, since, until, ['origin/master']);

      const proposal1Stats = result.proposals.get('proposal-1');
      const proposal2Stats = result.proposals.get('proposal-2');

      expect(proposal1Stats?.multiProposalCommits).toBe(1);
      expect(proposal2Stats?.multiProposalCommits).toBe(1);

      expect(proposal1Stats?.additions).toBe(150);
      expect(proposal2Stats?.additions).toBe(150);

      expect(proposal1Stats?.codeFilesChanged).toBe(1);
      expect(proposal2Stats?.codeFilesChanged).toBe(1);
    });

    it('should track commit dates correctly', () => {
      const aggregator = new StatsAggregator(config, activeAuthors);
      const since = new Date('2024-01-01');
      const until = new Date('2024-01-31');

      const analyses: CommitAnalysis[] = [
        createMockAnalysis(
          'John Doe',
          ['proposal-1'],
          [createMockFileChange('src/file1.ts', 10, 5)],
          new Date('2024-01-10'),
          'hash1'
        ),
        createMockAnalysis(
          'John Doe',
          ['proposal-1'],
          [createMockFileChange('src/file2.ts', 20, 10)],
          new Date('2024-01-20'),
          'hash2'
        ),
      ];

      const result = aggregator.aggregate(analyses, since, until, ['origin/master']);

      const authorStats = result.authors.get('John Doe');
      expect(authorStats?.firstCommitDate).toEqual(new Date('2024-01-10'));
      expect(authorStats?.lastCommitDate).toEqual(new Date('2024-01-20'));
      expect(authorStats?.statisticsPeriod).toBe('11 days');
    });

    it('should calculate statistics period correctly for single day', () => {
      const aggregator = new StatsAggregator(config, activeAuthors);
      const since = new Date('2024-01-01');
      const until = new Date('2024-01-31');

      const analyses: CommitAnalysis[] = [
        createMockAnalysis(
          'John Doe',
          ['proposal-1'],
          [createMockFileChange('src/file1.ts', 10, 5)],
          new Date('2024-01-15T10:00:00Z'),
          'hash1'
        ),
        createMockAnalysis(
          'John Doe',
          ['proposal-1'],
          [createMockFileChange('src/file2.ts', 20, 10)],
          new Date('2024-01-15T10:00:00Z'),
          'hash2'
        ),
      ];

      const result = aggregator.aggregate(analyses, since, until, ['origin/master']);

      const authorStats = result.authors.get('John Doe');
      expect(authorStats?.statisticsPeriod).toBe('1 day');
    });

    it('should aggregate branch statistics when branches are provided', () => {
      const aggregator = new StatsAggregator(config, activeAuthors);
      const since = new Date('2024-01-01');
      const until = new Date('2024-01-31');

      const commit1 = createMockCommit('John Doe', new Date('2024-01-15'), 'hash1');
      commit1.branches = ['origin/main', 'origin/develop'];

      const analyses: CommitAnalysis[] = [
        {
          commit: commit1,
          openspecProposals: new Set(['proposal-1']),
          codeFiles: [createMockFileChange('src/file1.ts', 10, 5)],
          totalAdditions: 10,
          totalDeletions: 5,
          netChanges: 5,
        },
      ];

      const result = aggregator.aggregate(analyses, since, until, ['origin/main', 'origin/develop']);

      const authorStats = result.authors.get('John Doe');
      expect(authorStats?.branchStats?.size).toBe(2);

      const mainBranchStats = authorStats?.branchStats?.get('origin/main');
      expect(mainBranchStats?.commits).toBe(1);
      expect(mainBranchStats?.additions).toBe(10);

      const developBranchStats = authorStats?.branchStats?.get('origin/develop');
      expect(developBranchStats?.commits).toBe(1);
      expect(developBranchStats?.additions).toBe(10);
    });

    it('should handle empty analyses array', () => {
      const aggregator = new StatsAggregator(config, activeAuthors);
      const since = new Date('2024-01-01');
      const until = new Date('2024-01-31');

      const result = aggregator.aggregate([], since, until, ['origin/master']);

      expect(result.authors.size).toBe(0);
      expect(result.proposals.size).toBe(0);
      expect(result.totalCommits).toBe(0);
    });

    it('should not count same commit twice for same proposal', () => {
      const aggregator = new StatsAggregator(config, activeAuthors);
      const since = new Date('2024-01-01');
      const until = new Date('2024-01-31');

      const analyses: CommitAnalysis[] = [
        createMockAnalysis(
          'John Doe',
          ['proposal-1'],
          [createMockFileChange('src/file1.ts', 10, 5)],
          new Date('2024-01-15'),
          'hash1'
        ),
        createMockAnalysis(
          'John Doe',
          ['proposal-1'],
          [createMockFileChange('src/file1.ts', 10, 5)],
          new Date('2024-01-15'),
          'hash1'
        ),
      ];

      const result = aggregator.aggregate(analyses, since, until, ['origin/master']);

      const proposalStats = result.proposals.get('proposal-1');
      expect(proposalStats?.commits).toBe(1);
    });
  });
});
