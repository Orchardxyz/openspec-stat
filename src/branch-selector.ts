import { select, checkbox, input } from '@inquirer/prompts';
import simpleGit from 'simple-git';
import chalk from 'chalk';

export interface BranchInfo {
  name: string;
  lastCommitDate: Date;
  commitCount: number;
}

export async function getActiveBranches(
  repoPath: string,
  limit: number = 10
): Promise<BranchInfo[]> {
  const git = simpleGit(repoPath);
  
  const branches = await git.branch(['-r']);
  const branchNames = branches.all.filter(b => !b.includes('HEAD'));

  const branchInfos: BranchInfo[] = [];

  for (const branchName of branchNames) {
    try {
      const log = await git.log({
        '--max-count': '1',
        [branchName]: null,
      });

      if (log.latest) {
        branchInfos.push({
          name: branchName,
          lastCommitDate: new Date(log.latest.date),
          commitCount: 0,
        });
      }
    } catch (error) {
      continue;
    }
  }

  branchInfos.sort((a, b) => b.lastCommitDate.getTime() - a.lastCommitDate.getTime());

  return branchInfos.slice(0, limit);
}

export async function selectBranches(
  repoPath: string,
  defaultBranches?: string[]
): Promise<string[]> {
  console.log(chalk.blue('\n🔍 Fetching active branches...'));
  const activeBranches = await getActiveBranches(repoPath, 10);

  if (activeBranches.length === 0) {
    console.log(chalk.yellow('⚠️  No remote branches found'));
    return defaultBranches || [];
  }

  const choices = activeBranches.map((branch) => ({
    name: `${branch.name} (last commit: ${branch.lastCommitDate.toLocaleDateString()})`,
    value: branch.name,
    checked: false,
  }));

  choices.push({
    name: chalk.gray('--- Custom input ---'),
    value: '__custom__',
    checked: false,
  });

  const mode = await select({
    message: 'How would you like to select branches?',
    choices: [
      { name: 'Select from active branches', value: 'select' },
      { name: 'Use default branches from config', value: 'default' },
      { name: 'Custom input', value: 'custom' },
    ],
  });

  if (mode === 'default') {
    return defaultBranches || [];
  }

  if (mode === 'custom') {
    const customInput = await input({
      message: 'Enter branch names (comma-separated):',
      default: defaultBranches?.join(', ') || '',
    });
    return customInput.split(',').map((b) => b.trim()).filter((b) => b);
  }

  const selected = await checkbox({
    message: 'Select branches to analyze:',
    choices: choices.slice(0, -1),
    pageSize: 15,
  });

  if (selected.length > 0) {
    console.log(chalk.green('\n✓ Selected branches:'));
    selected.forEach((branch) => {
      console.log(chalk.green(`  • ${branch}`));
    });
  }

  if (selected.includes('__custom__')) {
    const customInput = await input({
      message: 'Enter additional branch names (comma-separated):',
    });
    const customBranches = customInput.split(',').map((b) => b.trim()).filter((b) => b);
    return [...selected.filter((b) => b !== '__custom__'), ...customBranches];
  }

  return selected.length > 0 ? selected : defaultBranches || [];
}
