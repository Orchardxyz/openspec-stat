# Multi-Repository Mode Guide (BETA)

⚠️ **BETA**: Multi-repository mode is an experimental feature. Please report issues at: https://github.com/Orchardxyz/openspec-stat/issues

## Overview

Multi-repository mode allows you to analyze OpenSpec proposals and code changes across multiple repositories in a single run. This is useful for team managers who need to track contributions across frontend and backend repositories.

## Features

- ✅ Support for both **local** and **remote** repositories
- ✅ Local repos: Analyze repositories already on your machine
- ✅ Remote repos: Automatically clone and analyze remote repositories
- ✅ Full clone support (no depth limit) for accurate statistics
- ✅ Automatic cleanup of temporary directories
- ✅ Parallel processing with configurable concurrency
- ✅ Cross-repository author mapping
- ✅ Combined statistics across all repositories

## Quick Start

### 1. Initialize Configuration

**Interactive wizard (recommended):**
```bash
openspec-stat init --multi
```

**Generate template:**
```bash
openspec-stat init --template multi -o my-config.json
```

### 2. Run Analysis

```bash
openspec-stat multi -c .openspec-stats.multi.json
```

## Configuration Structure

```json
{
  "mode": "multi-repo",
  "repositories": [
    {
      "name": "backend-main",
      "type": "local",
      "path": "/path/to/backend",
      "branches": ["origin/master"],
      "enabled": true
    },
    {
      "name": "frontend-web",
      "type": "remote",
      "url": "git@github.com:org/frontend.git",
      "branches": ["origin/master"],
      "cloneOptions": {
        "depth": null,
        "singleBranch": false
      }
    }
  ],
  "defaultSinceHours": -30,
  "defaultUntilHours": 20,
  "authorMapping": {
    "john@email1.com": "John Doe",
    "john@email2.com": "John Doe"
  },
  "parallelism": {
    "maxConcurrent": 3,
    "timeout": 600000
  },
  "remoteCache": {
    "dir": "/tmp/openspec-stat-cache",
    "autoCleanup": true,
    "cleanupOnComplete": true,
    "cleanupOnError": true
  }
}
```

## Repository Types

### Local Repository

Use for repositories already on your machine:

```json
{
  "name": "backend-main",
  "type": "local",
  "path": "/absolute/path/to/repo",
  "branches": ["origin/master", "origin/develop"]
}
```

- `path`: Can be absolute or relative path
- No cloning needed, uses existing repository
- Fast analysis

### Remote Repository

Use for repositories to clone from remote:

```json
{
  "name": "frontend-web",
  "type": "remote",
  "url": "git@github.com:org/repo.git",
  "branches": ["origin/master"],
  "cloneOptions": {
    "depth": null,
    "singleBranch": false
  }
}
```

- `url`: Git URL (supports `git@` and `https://`)
- `cloneOptions.depth`: `null` for full clone (recommended), or number for shallow clone
- `cloneOptions.singleBranch`: Whether to clone only one branch
- Automatically cleaned up after analysis

## Command Options

```bash
openspec-stat multi [options]

Options:
  -c, --config <path>        Configuration file path (default: .openspec-stats.multi.json)
  -s, --since <datetime>     Override start time
  -u, --until <datetime>     Override end time
  -a, --author <name>        Filter by specific author
  --json                     Output in JSON format
  --csv                      Output in CSV format
  --markdown                 Output in Markdown format
  -v, --verbose              Verbose output mode
  -l, --lang <language>      Language (en, zh-CN)
  --no-cleanup               Do not cleanup temporary directories
  --show-contributors        Show detailed contributor statistics
```

### Output Control

By default, multi-repository mode only shows **aggregated summary statistics** to avoid information overload when analyzing multiple repositories. This shows total commits, proposals, and code changes across all contributors.

To see **detailed statistics for each contributor**, use the `--show-contributors` flag:

```bash
# Default: Show only aggregated summary
openspec-stat multi -c config.json

# Show detailed per-contributor statistics
openspec-stat multi -c config.json --show-contributors
```

**When to use `--show-contributors`:**
- When analyzing a small team (< 10 contributors)
- When you need detailed breakdown by contributor
- When generating reports that require individual statistics

**Default behavior (without `--show-contributors`):**
- Shows total number of contributors
- Shows aggregated commits, proposals, and code changes
- Keeps output concise and readable

## Use Cases

### Case 1: Backend Manager with Local Repos

You have all backend repositories on your machine but not frontend:

```json
{
  "repositories": [
    {
      "name": "backend-api",
      "type": "local",
      "path": "~/projects/backend-api",
      "branches": ["origin/master"]
    },
    {
      "name": "backend-service",
      "type": "local",
      "path": "~/projects/backend-service",
      "branches": ["origin/main"]
    },
    {
      "name": "frontend-web",
      "type": "remote",
      "url": "git@github.com:company/frontend.git",
      "branches": ["origin/master"]
    }
  ]
}
```

### Case 2: Daily Team Statistics

Run daily at 20:00 to collect yesterday's statistics:

```bash
# In crontab
0 20 * * * cd /path/to/config && openspec-stat multi -c team-stats.json --json > daily-report-$(date +\%Y\%m\%d).json
```

### Case 3: Weekly Cross-Team Report

```bash
# Summary report (for management)
openspec-stat multi -c config.json \
  --since "2024-01-01 20:00:00" \
  --until "2024-01-08 20:00:00" \
  --markdown > weekly-summary.md

# Detailed report (with per-contributor breakdown)
openspec-stat multi -c config.json \
  --since "2024-01-01 20:00:00" \
  --until "2024-01-08 20:00:00" \
  --show-contributors \
  --markdown > weekly-detailed.md
```

## Performance Tips

1. **Parallelism**: Adjust `maxConcurrent` based on your network and machine:
   - Fast network + powerful machine: 5-10
   - Normal: 3 (default)
   - Slow network: 1-2

2. **Clone Strategy**:
   - Use `depth: null` for accuracy (recommended)
   - Use `depth: 100` if you only need recent commits
   - Daily statistics with `depth: 100` is usually sufficient

3. **Cache Directory**:
   - Use `/tmp` for automatic OS cleanup
   - Use custom path if you have specific disk requirements
   - Enable `autoCleanup` to save disk space

## Cleanup Behavior

Temporary directories for remote repositories are automatically cleaned up:

- ✅ After successful analysis (`cleanupOnComplete: true`)
- ✅ After errors (`cleanupOnError: true`)
- ✅ On process exit (Ctrl+C, SIGTERM)
- ✅ On uncaught exceptions

Disable cleanup for debugging:
```bash
openspec-stat multi -c config.json --no-cleanup
```

## Troubleshooting

### Clone Timeout

If cloning takes too long:

```json
{
  "parallelism": {
    "maxConcurrent": 2,
    "timeout": 1200000
  }
}
```

### Permission Denied

Ensure your SSH keys have access to all remote repositories:

```bash
ssh -T git@github.com
```

### Disk Space

Check available space before running:

```bash
df -h /tmp
```

Each full clone typically uses 50-500MB depending on repository size.

## Limitations

- Git protocol limitation: Cannot read remote repositories without cloning
- Requires network access for remote repositories
- First run is slower (cloning), subsequent runs with local repos are fast

## Backward Compatibility

Single-repository mode remains unchanged:

```bash
# Still works as before
openspec-stat
openspec-stat -r ./path
openspec-stat -c config.json
```

## Example Output

```
⚠️  BETA: Multi-repository mode is experimental
   Please report issues at: https://github.com/Orchardxyz/openspec-stat/issues

🔍 Loading multi-repository configuration...
📋 Configuration Summary

Repositories:
  1. 📁 backend-main (local)
     /Users/manager/projects/backend-main
     Branches: origin/master
  2. ☁️  frontend-web (remote)
     git@github.com:company/frontend.git
     Branches: origin/master

📅 Time Range: 1/7/2024, 8:00:00 PM ~ 1/8/2024, 8:00:00 PM

📊 Analyzing backend-main (local)...
✅ Completed backend-main: 15 commits
☁️  Cloning frontend-web...
✅ Successfully cloned frontend-web
📊 Analyzing frontend-web (remote)...
✅ Completed frontend-web: 23 commits
🧹 Cleaning up temporary directories...
✅ Cleanup completed

📦 Multi-Repository Summary
Repositories: 2 (2 succeeded, 0 failed)

✅ Found 38 qualifying commits (containing OpenSpec proposals and code changes)

[Statistics tables follow...]
```

## Feedback

This is a BETA feature. Please report:
- Bugs and issues
- Feature requests
- Performance problems
- Documentation improvements

GitHub: https://github.com/Orchardxyz/openspec-stat/issues
