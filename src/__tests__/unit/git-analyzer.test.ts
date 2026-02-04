import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitAnalyzer } from '../../git-analyzer';
import { CommitInfo, Config } from '../../types';

type SimpleGitMock = {
  fetch: ReturnType<typeof vi.fn>;
  raw: ReturnType<typeof vi.fn>;
  log: ReturnType<typeof vi.fn>;
  show: ReturnType<typeof vi.fn>;
};

const simpleGitMockImpl = vi.hoisted<SimpleGitMock>(() => ({
  fetch: vi.fn(),
  raw: vi.fn(),
  log: vi.fn(),
  show: vi.fn(),
}));

const simpleGitFactory = vi.hoisted(() => vi.fn(() => simpleGitMockImpl));

vi.mock('simple-git', () => ({
  __esModule: true,
  default: simpleGitFactory,
}));

const baseConfig: Config = {
  defaultSinceHours: 0,
  defaultUntilHours: 0,
  excludeExtensions: ['.md'],
  openspecDir: 'openspec/',
  authorMapping: { A: 'Alias' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GitAnalyzer', () => {
  it('fetchRemote ignores errors', async () => {
    const analyzer = new GitAnalyzer('/tmp/repo', baseConfig);
    simpleGitMockImpl.fetch.mockRejectedValueOnce(new Error('network'));

    await expect(analyzer.fetchRemote()).resolves.toBeUndefined();
    expect(simpleGitMockImpl.fetch).toHaveBeenCalled();
  });

  it('getCommitBranches filters by targets', async () => {
    const analyzer = new GitAnalyzer('/tmp/repo', baseConfig);
    simpleGitMockImpl.raw.mockResolvedValue('  origin/main\n  origin/feature\n  origin/HEAD -> origin/main');

    const branches = await analyzer.getCommitBranches('hash', ['origin/main']);

    expect(branches).toEqual(['origin/main']);
    expect(simpleGitMockImpl.raw).toHaveBeenCalled();
  });

  it('analyzeCommit returns null when missing code changes', async () => {
    const analyzer = new GitAnalyzer('/tmp/repo', baseConfig);
    const commit: CommitInfo = {
      hash: '1',
      author: 'author',
      email: 'a@example.com',
      date: new Date(),
      message: 'message',
    };
    simpleGitMockImpl.show.mockResolvedValue('1\t0\topenspec/changes/abc/file.txt');

    const result = await analyzer.analyzeCommit(commit);

    expect(result).toBeNull();
  });

  it('analyzeCommit builds analysis when proposal and code changes exist', async () => {
    const analyzer = new GitAnalyzer('/tmp/repo', baseConfig);
    const commit: CommitInfo = {
      hash: '2',
      author: 'author',
      email: 'a@example.com',
      date: new Date(),
      message: 'message',
    };
    simpleGitMockImpl.show.mockResolvedValue(
      '5\t1\topenspec/changes/abc/file.ts\n2\t0\tsrc/index.ts\n1\t0\tsrc/ignored.md\n'
    );

    const result = await analyzer.analyzeCommit(commit);

    expect(result).not.toBeNull();
    expect(result?.openspecProposals.has('abc')).toBe(true);
    expect(result?.codeFiles).toEqual([
      {
        path: 'src/index.ts',
        additions: 2,
        deletions: 0,
        status: 'M',
      },
    ]);
    expect(result?.totalAdditions).toBe(2);
    expect(result?.totalDeletions).toBe(0);
    expect(result?.netChanges).toBe(2);
  });

  it('getActiveAuthors normalizes names using mapping', async () => {
    const analyzer = new GitAnalyzer('/tmp/repo', baseConfig);
    simpleGitMockImpl.log.mockResolvedValue({
      all: [
        { author_name: 'A', hash: '1', date: new Date().toISOString() },
        { author_name: 'B', hash: '2', date: new Date().toISOString() },
      ],
    });

    const authors = await analyzer.getActiveAuthors(1);

    expect(authors.has('Alias')).toBe(true);
    expect(authors.has('B')).toBe(true);
  });
});
