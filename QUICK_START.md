# OpenSpec-Stat Quick Start

## Installation & Build

```bash
# Install dependencies
pnpm install

# Build project
pnpm build
```

## Local Testing

```bash
# Test in any Git repository
node dist/cjs/cli.js

# Or link globally
npm link
openspec-stat
```

## Common Use Cases

### Scenario 1: Daily Statistics (Default: yesterday 18:00 ~ today 18:00)

```bash
openspec-stat
```

### Scenario 2: Weekly Statistics

```bash
openspec-stat --since "2024-01-01 00:00:00" --until "2024-01-07 23:59:59"
```

### Scenario 3: Specific Branch Statistics

```bash
openspec-stat --branches "origin/master,origin/release/v1.0"
```

### Scenario 4: Generate Weekly Report

```bash
# Markdown format
openspec-stat --since "2024-01-01" --until "2024-01-07" --markdown > weekly-report.md

# JSON format (for further processing)
openspec-stat --since "2024-01-01" --until "2024-01-07" --json > stats.json
```

### Scenario 5: View Detailed Contributions for a Team Member

```bash
openspec-stat --author "John Doe" --verbose
```

## Configuration Example

Create `.openspec-stats.json`:

```json
{
  "defaultBranches": ["origin/master"],
  "authorMapping": {
    "johndoe": "John Doe",
    "john.doe@company.com": "John Doe",
    "John D": "John Doe"
  },
  "activeUserWeeks": 2
}
```

## Output Example

### Table Output
```
📊 OpenSpec Statistics Report
Time Range: 2024-01-05 18:00:00 ~ 2024-01-06 18:00:00
Branches: origin/master
Total Commits: 5

┌──────────┬─────────┬──────────────────┬────────────┬───────────┬───────────┬─────────────┐
│ Author   │ Commits │ OpenSpec Proposals│ Code Files │ Additions │ Deletions │ Net Changes │
├──────────┼─────────┼──────────────────┼────────────┼───────────┼───────────┼─────────────┤
│ John Doe │ 3       │ 2                │ 15         │ +234      │ -56       │ +178        │
│ Jane S.  │ 2       │ 1                │ 8          │ +123      │ -34       │ +89         │
└──────────┴─────────┴──────────────────┴────────────┴───────────┴───────────┴─────────────┘
```

## FAQ

### Q: How to track all branches?
A: Don't specify the `--branches` parameter, the tool will track all branches.

### Q: How to handle multiple Git accounts for the same person?
A: Use the `authorMapping` field in the configuration file to map to the same name.

### Q: Why are some commits not being tracked?
A: The tool only tracks commits that contain both OpenSpec proposals and code changes. Ensure the commit meets both conditions:
   1. Modified files in the `openspec/` directory
   2. Modified code files (non-documentation files)

### Q: How to customize the tracking time?
A: Use the `--since` and `--until` parameters, supports multiple date formats:
   - `2024-01-01`
   - `2024-01-01 18:00:00`
   - ISO 8601 format
