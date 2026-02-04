# openspec-stat

[![NPM version](https://img.shields.io/npm/v/openspec-stat.svg?style=flat)](https://npmjs.com/package/openspec-stat)
[![NPM downloads](http://img.shields.io/npm/dm/openspec-stat.svg?style=flat)](https://npmjs.com/package/openspec-stat)
[![Last commit](https://img.shields.io/github/last-commit/Orchardxyz/openspec-stat.svg?style=flat)](https://github.com/Orchardxyz/openspec-stat/commits/main)
[![CI](https://github.com/Orchardxyz/openspec-stat/actions/workflows/ci.yml/badge.svg)](https://github.com/Orchardxyz/openspec-stat/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/openspec-stat.svg?style=flat)](https://github.com/Orchardxyz/openspec-stat/blob/main/LICENSE)

English | [简体中文](./README.zh-CN.md)

A CLI tool for tracking team members' OpenSpec proposals and code changes in Git repositories.

## Install

```bash
# global install
npm install -g openspec-stat
# or local (dev dependency)
npm install -D openspec-stat
```

## Quick start

Default window: yesterday 20:00 → today 20:00.

```bash
# basic run
openspec-stat

# custom time range
openspec-stat --since "2024-01-01 00:00:00" --until "2024-01-31 23:59:59"

# multi-repo (uses config)
openspec-stat multi -c .openspec-stats.multi.json
```

## Key features

- Track Git commits in a time window and per-branch filters
- Detect commits containing both OpenSpec proposals and code changes
- Proposal-based aggregation to avoid merge-commit bias
- Author grouping with name mapping (multiple Git identities per person)
- Multi-branch wildcards and **multi-repository mode (BETA)**
- Outputs: table, JSON, CSV, Markdown; languages: en / zh-CN

## Common flags (full list: `openspec-stat --help`)

- `-r, --repo <path>`: repository path (default: current directory)
- `-b, --branches <list>`: comma-separated branches, supports wildcards
- `-s, --since <datetime>` / `-u, --until <datetime>`: time window
- `-a, --author <name>`: filter by author
- `-c, --config <path>`: config file
- `--json | --csv | --markdown`: output format
- `-l, --lang <language>`: `en` or `zh-CN`
- `-v, --verbose`: verbose output

## Multi-repo mode (BETA)

Analyze multiple local/remote repositories in one run.

```bash
openspec-stat init --multi                         # interactive setup
openspec-stat multi -c .openspec-stats.multi.json  # aggregated view
openspec-stat multi -c .openspec-stats.multi.json --show-contributors
```

See [Multi-Repository Guide](./MULTI_REPO_GUIDE.md) for full details.

**Remote cache**: remote repos are cloned once and reused under
`~/.openspec-stat/cached/repos/<repo-name>-<hash>`. Use `--cache-mode temporary`
to force one-off clones, or `--force-clone` to refresh a single run.

## Configuration (short)

Create `.openspec-stats.json` or `openspec-stats.config.json` in the repo root.

```json
{
  "defaultBranches": ["origin/master", "origin/main", "origin/release/*"],
  "defaultSinceHours": -30,
  "defaultUntilHours": 18,
  "authorMapping": {"john.doe@company.com": "John Doe"},
  "openspecDir": "openspec/",
  "excludeExtensions": [".md", ".txt", ".png", ".jpg", "..."],
  "activeUserWeeks": 2
}
```

Key fields: default branches/time window, author mapping (merge identities), OpenSpec directory, excluded extensions, active user window.

## Output

```
📊 OpenSpec Report
Time: 2024-01-01 00:00:00 ~ 2024-01-31 23:59:59
Branches: origin/master
Total Commits: 8

Proposal Summary
┌──────────────┬─────────┬───────────┬───────────┐
│ Proposal     │ Commits │ Files     │ Net Δ     │
├──────────────┼─────────┼───────────┼───────────┤
│ feature-123  │ 5       │ 30        │ +656      │
└──────────────┴─────────┴───────────┴───────────┘

Author Summary
┌─────────┬─────────┬───────────┬───────────┐
│ Author  │ Commits │ Proposals │ Net Δ     │
├─────────┼─────────┼───────────┼───────────┤
│ John D. │ 8       │ 3         │ +667      │
└─────────┴─────────┴───────────┴───────────┘
```

Use `--markdown`, `--json`, or `--csv` for other formats.

## Language

`--lang en` (default) or `--lang zh-CN`. Locale-based auto-detection is also supported.

## Development

```bash
pnpm install
pnpm dev
pnpm build
node dist/cjs/cli.js
```

## Contributing & Release Process

- See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and PR expectations.
- See [RELEASE.md](./RELEASE.md) for the Changesets-driven publishing workflow.

## License

MIT
