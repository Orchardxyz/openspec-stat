export function getDefaultTimeRange(
  sinceHours: number = -30,
  untilHours: number = 20
): { since: Date; until: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const since = new Date(yesterday);
  since.setHours(untilHours, 0, 0, 0);

  const until = new Date(today);
  until.setHours(untilHours, 0, 0, 0);

  return { since, until };
}

export function parseDateTime(dateStr: string): Date {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return date;
}

export function parseBranches(branchesStr?: string): string[] {
  if (!branchesStr) return [];
  return branchesStr.split(',').map((b) => b.trim()).filter((b) => b);
}
