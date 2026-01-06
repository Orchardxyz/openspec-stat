# openspec-stat

[![NPM version](https://img.shields.io/npm/v/openspec-stat.svg?style=flat)](https://npmjs.com/package/openspec-stat)
[![NPM downloads](http://img.shields.io/npm/dm/openspec-stat.svg?style=flat)](https://npmjs.com/package/openspec-stat)

A CLI tool for tracking team members' OpenSpec proposals and code changes in Git repositories.

## Features

- ✅ Track Git commits within specified time ranges
- ✅ Identify commits containing both OpenSpec proposals and code changes
- ✅ Group statistics by author (commits, proposals, code changes)
- ✅ Support multiple branches and wildcard filtering
- ✅ Author name mapping (handle multiple Git accounts for the same person)
- ✅ Track only recently active members (default: 2 weeks)
- ✅ Multiple output formats: Table, JSON, CSV, Markdown
- ✅ Internationalization support: English and Chinese (简体中文)

## Installation

### Global Installation

```bash
npm install -g openspec-stat
# or
pnpm add -g openspec-stat
```

### Local Project Installation

```bash
npm install openspec-stat --save-dev
# or
pnpm add -D openspec-stat
```

## Usage

### Basic Usage

Run in a Git repository directory:

```bash
openspec-stat
```

This will track commits in the default time range (yesterday 20:00 ~ today 20:00).

### Command Line Options

```bash
openspec-stat [options]

Options:
  -r, --repo <path>           Repository path (default: current directory)
  -b, --branches <branches>   Branch list, comma-separated (e.g., origin/master,origin/release/v1.0)
  -s, --since <datetime>      Start time (default: yesterday 20:00)
  -u, --until <datetime>      End time (default: today 20:00)
  -a, --author <name>         Filter by specific author
  --json                      Output in JSON format
  --csv                       Output in CSV format
  --markdown                  Output in Markdown format
  -c, --config <path>         Configuration file path
  -v, --verbose               Verbose output mode
  -l, --lang <language>       Language for output (en, zh-CN) (default: "en")
  -V, --version               Display version number
  -h, --help                  Display help information
```

### Examples

```bash
# Track default time range
openspec-stat

# Track specific time range
openspec-stat --since "2024-01-01 00:00:00" --until "2024-01-31 23:59:59"

# Track specific branches
openspec-stat --branches "origin/master,origin/release/v1.0"

# Track specific author
openspec-stat --author "John Doe"

# Output JSON format
openspec-stat --json > stats.json

# Output Markdown report
openspec-stat --markdown > report.md

# Verbose output mode
openspec-stat --verbose

# Use custom configuration file
openspec-stat --config ./my-config.json

# Use Chinese output
openspec-stat --lang zh-CN

# Combine with other options
openspec-stat --lang zh-CN --verbose
```

## Configuration File

Create `.openspec-stats.json` or `openspec-stats.config.json` in the project root:

```json
{
  "defaultBranches": [
    "origin/master",
    "origin/main",
    "origin/release/*"
  ],
  "defaultSinceHours": -30,
  "defaultUntilHours": 18,
  "authorMapping": {
    "John Doe": "John Doe",
    "john.doe@company.com": "John Doe",
    "johnd": "John Doe"
  },
  "openspecDir": "openspec/",
  "excludeExtensions": [
    ".md",
    ".txt",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".webp"
  ],
  "activeUserWeeks": 2
}
```

### Configuration Options

- **defaultBranches**: Default branches to track (supports wildcards)
- **defaultSinceHours**: Default start time offset (hours, negative means going back)
- **defaultUntilHours**: Default end time (hour of the day)
- **authorMapping**: Author name mapping to unify multiple Git accounts for the same person
- **openspecDir**: OpenSpec proposals directory (default: `openspec/`)
- **excludeExtensions**: File extensions to exclude (not counted as code changes)
- **activeUserWeeks**: Active user time window (weeks, default: 2)

## Statistics Logic

The tool identifies commits that meet both conditions:

1. Contains file changes in the `openspec/` directory (OpenSpec proposals)
2. Contains code file changes (excluding documentation files)

Statistics include:

- **Commits**: Total number of qualifying commits
- **OpenSpec Proposals**: Counted by `openspec/changes/{proposal-name}` directories
- **Code Files**: Number of modified code files
- **Additions**: Lines of code added
- **Deletions**: Lines of code deleted
- **Net Changes**: Additions - Deletions

## Output Formats

### Table Format (Default)

```
📊 OpenSpec Statistics Report
Time Range: 2024-01-01 00:00:00 ~ 2024-01-31 23:59:59
Branches: origin/master
Total Commits: 15

┌──────────┬─────────┬──────────────────┬────────────┬───────────┬───────────┬─────────────┐
│ Author   │ Commits │ OpenSpec Proposals│ Code Files │ Additions │ Deletions │ Net Changes │
├──────────┼─────────┼──────────────────┼────────────┼───────────┼───────────┼─────────────┤
│ John Doe │ 8       │ 3                │ 45         │ +1234     │ -567      │ +667        │
│ Jane S.  │ 7       │ 2                │ 32         │ +890      │ -234      │ +656        │
└──────────┴─────────┴──────────────────┴────────────┴───────────┴───────────┴─────────────┘
```

### JSON Format

```bash
openspec-stat --json
```

### CSV Format

```bash
openspec-stat --csv > stats.csv
```

### Markdown Format

```bash
openspec-stat --markdown > report.md
```

## Language Support

The tool supports both English and Chinese output. You can specify the language using the `--lang` option:

```bash
# English output (default)
openspec-stat --lang en

# Chinese output
openspec-stat --lang zh-CN
```

The tool will also automatically detect your system language. If your system locale is set to Chinese, the output will default to Chinese.

For a Chinese version of this README, see [README.zh-CN.md](./README.zh-CN.md).

## Development

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build
pnpm build

# Local testing
node dist/esm/cli.js
```

## LICENSE

MIT
