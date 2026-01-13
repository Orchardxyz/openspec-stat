# Contributing to openspec-stat

Thanks for your interest in improving **openspec-stat**! This document explains how to set up your environment, propose changes, and get them merged smoothly.

## Development Prerequisites

- Node.js 20.x (matching the GitHub Actions workflow)
- [pnpm](https://pnpm.io/) `10.12.1`
- Git 2.40+

Install dependencies once:

```bash
pnpm install
```

Useful commands:

| Task | Command |
| --- | --- |
| Development build with watch | `pnpm dev` |
| Production build | `pnpm build` |
| Lint source files | `pnpm lint` |
| Format staged files (husky hook runs automatically) | `pnpm format` |

## Branching & Pull Requests

We follow a lightweight GitHub Flow style:

1. Branch from `main` using a descriptive name, e.g. `feature/multi-repo-summary` or `fix/merge-dedup`.
2. Keep branches focused on a single issue/feature.
3. Rebase on top of `main` if the branch lives for more than a day to avoid drift.
4. Push early and often to open a Draft PR—visibility helps reviewers prepare.

Each PR should:

- Contain tests or manual verification steps when relevant.
- Pass linting (`pnpm lint`) and build checks locally before pushing.
- Include a [changeset](#changesets-are-required) unless explicitly exempted.

## Changesets are Required

This repository uses [Changesets](https://github.com/changesets/changesets) to manage versions and changelog entries.

1. While on your feature branch, run:
   ```bash
   pnpm changeset add
   ```
2. Select the packages affected (usually the default) and choose the correct bump type (patch/minor/major).
3. Provide a concise summary—the text appears in `CHANGELOG.md`.
4. Commit the generated `.changeset/*.md` file(s).

### When you can skip a changeset

- Pure documentation/configuration updates that do not affect runtime behavior.
- Administrative changes (CI tweaks, label updates, etc.).

If you believe your PR qualifies, add the GitHub label `skip-changeset`. The CI workflow (`.github/workflows/pr-check.yml`) enforces this rule and will fail otherwise.

## Commit Style

We do not enforce a strict conventional commit format, but keep messages informative:

- Use the imperative mood: `fix: handle merge commits`
- Explain *why* when the diff is non-obvious.

## Pull Request Template

Include the following information in your PR description:

- **Summary**: what changed and why.
- **Testing**: commands run or manual verification steps.
- **Screenshots**: when touching user-visible output/UX.
- **Checklist**:
  - [ ] `pnpm lint`
  - [ ] `pnpm build`
  - [ ] Added/updated tests or described manual testing
  - [ ] Added a changeset (or labeled `skip-changeset` and justified it)

## Review & Merge

- Maintainers aim to review small PRs quickly. Consider splitting large efforts into multiple PRs.
- Address review comments via follow-up commits (squashing happens when merging).
- Once approvals and CI checks are green, maintainers will merge using the **Squash & Merge** strategy so the main branch stays linear.

## Need Help?

Open a GitHub Discussion or Issue if something is unclear. We appreciate every contribution—thank you for helping make openspec-stat better!
