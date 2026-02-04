export interface Config {
  defaultBranches?: string[];
  defaultSinceHours?: number;
  defaultUntilHours?: number;
  authorMapping?: Record<string, string>;
  openspecDir?: string;
  codeFileExtensions?: string[];
  excludeExtensions?: string[];
  activeUserWeeks?: number;
  autoFetch?: boolean;
}

export interface CliOptions {
  repo: string;
  branches?: string;
  since?: string;
  until?: string;
  author?: string;
  json?: boolean;
  csv?: boolean;
  markdown?: boolean;
  config?: string;
  verbose?: boolean;
  interactive?: boolean;
  lang?: string;
  noFetch?: boolean;
}

export interface CommitInfo {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  branches?: string[];
}

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  status: string;
}

export interface CommitAnalysis {
  commit: CommitInfo;
  openspecProposals: Set<string>;
  codeFiles: FileChange[];
  totalAdditions: number;
  totalDeletions: number;
  netChanges: number;
}

export interface AuthorStats {
  author: string;
  commits: number;
  openspecProposals: Set<string>;
  codeFilesChanged: number;
  additions: number;
  deletions: number;
  netChanges: number;
  lastCommitDate?: Date;
  firstCommitDate?: Date;
  statisticsPeriod?: string;
  branchStats?: Map<string, BranchStats>;
}

export interface BranchStats {
  branch: string;
  commits: number;
  openspecProposals: Set<string>;
  codeFilesChanged: number;
  additions: number;
  deletions: number;
  netChanges: number;
}

export interface ProposalStats {
  proposal: string;
  commits: number;
  contributors: Set<string>;
  codeFilesChanged: number;
  additions: number;
  deletions: number;
  netChanges: number;
  commitHashes: Set<string>;
  multiProposalCommits: number;
  sharedCommitHashes: Set<string>;
}

export interface StatsResult {
  timeRange: {
    since: Date;
    until: Date;
  };
  branches: string[];
  authors: Map<string, AuthorStats>;
  proposals: Map<string, ProposalStats>;
  totalCommits: number;
}

export interface RepositoryConfig {
  name: string;
  type: 'local' | 'remote';
  path?: string;
  url?: string;
  cloneOptions?: {
    depth?: number | null;
    singleBranch?: boolean;
  };
  branches: string[];
  enabled?: boolean;
  cacheMode?: 'persistent' | 'temporary';
}

export interface RemoteCacheConfig {
  autoCleanup: boolean;
  cleanupOnComplete: boolean;
  cleanupOnError: boolean;
  mode: 'persistent' | 'temporary';
  maxAge?: number;
}

export interface ParallelismConfig {
  maxConcurrent: number;
  timeout: number;
}

export interface MultiRepoConfig extends Config {
  mode: 'single-repo' | 'multi-repo';
  repositories?: RepositoryConfig[];
  remoteCache?: RemoteCacheConfig;
  parallelism?: ParallelismConfig;
}

export interface RepositoryResult {
  repository: string;
  type: 'local' | 'remote';
  path: string;
  analyses: CommitAnalysis[];
  success: boolean;
  error?: string;
}

export interface MultiRepoStatsResult extends StatsResult {
  repositories: string[];
  repositoryDetails: Map<
    string,
    {
      type: 'local' | 'remote';
      commits: number;
      error?: string;
    }
  >;
}
