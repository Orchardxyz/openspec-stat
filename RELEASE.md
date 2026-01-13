# Release Guide

This document describes how releases are produced for **openspec-stat**.

The project uses [Changesets](https://github.com/changesets/changesets) plus two GitHub Actions workflows:

- `.github/workflows/version.yml` – generates a “Version PR” that bumps the package version and updates `CHANGELOG.md`.
- `.github/workflows/publish.yml` – publishes to npm once the Version PR is merged.

## Release cadence

- Feature/bug-fix PRs land on `main` continuously.
- Maintainers decide when to cut a release (e.g., weekly or when a feature set is ready) by merging the Version PR.

## Step-by-step

1. **Merge feature PRs with changesets**:
   - Every meaningful change must include a `.changeset/*.md` file created via `pnpm changeset add`.
   - These files accumulate on `main`.

2. **Version PR automation**:
   - Every push to `main` triggers `version.yml`.
   - If pending changesets exist, the workflow runs `pnpm changeset version` and opens/updates a PR titled `chore: version packages`.
   - The PR contains:
     - Updated `package.json` / `pnpm-lock.yaml` versions.
     - Updated `CHANGELOG.md` entries generated from the queued changesets.
     - Removal of processed `.changeset/*.md` files.

3. **Review & merge Version PR**:
   - Verify the generated changelog looks correct and the version bump matches expectations (patch/minor/major).
   - Once approved, merge the PR using **Squash & Merge** (default).

4. **Publish to npm**:
   - Merging the Version PR triggers `publish.yml` (because the commit message contains `version packages`).
   - The workflow builds the package and runs `pnpm changeset publish`, which tags the release, publishes to npm, and creates a GitHub release.

5. **Post-release**:
   - Confirm that the npm package is available and that the GitHub release notes look correct.
   - Communicate the release in project channels if needed.

## Hotfixes

- For urgent issues, create a branch from the latest `main`, include a changeset, and merge as usual.
- Run through the same Version PR process; Changesets guarantees the correct bump type.

## Troubleshooting

| Issue | Resolution |
| --- | --- |
| Version PR not created | Ensure at least one changeset exists on `main`. Check `version.yml` logs. |
| Publish workflow skipped | Only runs when the merge commit message contains `version packages`. Use the auto-generated Version PR. |
| Incorrect version bump | Update or add a changeset with the desired bump type, then re-run `pnpm changeset version` locally (or trigger workflow by pushing to `main`). |

For questions, open an issue or discussion. Happy releasing! 🚀
