import simpleGit, { SimpleGit, DefaultLogFields } from 'simple-git';
import { CommitInfo, FileChange, CommitAnalysis, Config } from './types.js';
import { normalizeAuthor } from './config.js';

export class GitAnalyzer {
  private git: SimpleGit;
  private config: Config;

  constructor(repoPath: string, config: Config) {
    this.git = simpleGit(repoPath);
    this.config = config;
  }

  async getCommits(since: Date, until: Date, branches: string[]): Promise<CommitInfo[]> {
    const sinceStr = since.toISOString();
    const untilStr = until.toISOString();

    const logOptions: any = {
      '--since': sinceStr,
      '--until': untilStr,
      '--all': null,
    };

    if (branches.length > 0) {
      for (const branch of branches) {
        logOptions[`--remotes=${branch}`] = null;
      }
    }

    const log = await this.git.log(logOptions);

    const commits: CommitInfo[] = [];
    for (const commit of log.all) {
      const commitBranches = await this.getCommitBranches(commit.hash, branches);
      commits.push({
        hash: commit.hash,
        author: commit.author_name,
        email: commit.author_email,
        date: new Date(commit.date),
        message: commit.message,
        branches: commitBranches,
      });
    }

    return commits;
  }

  async getCommitBranches(commitHash: string, targetBranches: string[]): Promise<string[]> {
    try {
      const result = await this.git.raw(['branch', '-r', '--contains', commitHash]);
      const allBranches = result
        .split('\n')
        .map((b) => b.trim())
        .filter((b) => b && !b.includes('HEAD'));

      if (targetBranches.length === 0) {
        return allBranches;
      }

      return allBranches.filter((branch) =>
        targetBranches.some((target) => branch === target || branch.includes(target))
      );
    } catch (error) {
      return [];
    }
  }

  async analyzeCommit(commit: CommitInfo): Promise<CommitAnalysis | null> {
    try {
      const show = await this.git.show(['--numstat', '--format=', commit.hash]);

      const lines = show.split('\n').filter((line) => line.trim());
      const fileChanges: FileChange[] = [];
      const openspecProposals = new Set<string>();
      let hasCodeChanges = false;

      const openspecDir = this.config.openspecDir || 'openspec/';
      const excludeExts = this.config.excludeExtensions || [];

      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length < 3) continue;

        const [addStr, delStr, ...pathParts] = parts;
        const path = pathParts.join(' ');

        const additions = addStr === '-' ? 0 : parseInt(addStr, 10);
        const deletions = delStr === '-' ? 0 : parseInt(delStr, 10);

        if (path.startsWith(openspecDir)) {
          const proposalMatch = path.match(new RegExp(`^${openspecDir}changes/([^/]+)`));
          if (proposalMatch) {
            openspecProposals.add(proposalMatch[1]);
          }
        }

        const isExcluded = excludeExts.some((ext) => path.endsWith(ext));
        const isInOpenspec = path.startsWith(openspecDir);

        if (!isExcluded && !isInOpenspec) {
          hasCodeChanges = true;
          fileChanges.push({
            path,
            additions,
            deletions,
            status: 'M',
          });
        }
      }

      if (openspecProposals.size > 0 && hasCodeChanges) {
        const totalAdditions = fileChanges.reduce((sum, f) => sum + f.additions, 0);
        const totalDeletions = fileChanges.reduce((sum, f) => sum + f.deletions, 0);

        return {
          commit,
          openspecProposals,
          codeFiles: fileChanges,
          totalAdditions,
          totalDeletions,
          netChanges: totalAdditions - totalDeletions,
        };
      }

      return null;
    } catch (error) {
      console.error(`Error analyzing commit ${commit.hash}:`, error);
      return null;
    }
  }

  async getActiveAuthors(weeks: number = 2): Promise<Set<string>> {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const log = await this.git.log({
      '--since': since.toISOString(),
      '--all': null,
    });

    const authors = new Set<string>();
    for (const commit of log.all) {
      const normalizedAuthor = normalizeAuthor(commit.author_name, this.config.authorMapping);
      authors.add(normalizedAuthor);
    }

    return authors;
  }
}
