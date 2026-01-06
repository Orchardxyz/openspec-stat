export interface Config {
  defaultBranches?: string[];
  defaultSinceHours?: number;
  defaultUntilHours?: number;
  authorMapping?: Record<string, string>;
  openspecDir?: string;
  codeFileExtensions?: string[];
  excludeExtensions?: string[];
  activeUserWeeks?: number;
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

export interface StatsResult {
  timeRange: {
    since: Date;
    until: Date;
  };
  branches: string[];
  authors: Map<string, AuthorStats>;
  totalCommits: number;
}
