# AGENTS

This document provides guidance for human and AI agents working in this repository.

## Purpose

- Keep changes focused, minimal, and easy to review.
- Prefer root-cause fixes over temporary workarounds.
- Preserve existing project conventions unless a change is explicitly requested.

## Working Rules

1. Make small, scoped changes.
2. Avoid unrelated refactors in the same update.
3. Add or update documentation when behavior changes.
4. Do not remove or rewrite existing history.
5. Keep commit messages clear and descriptive.

## Code Quality

- Follow the existing style and structure in the codebase.
- Add comments only when logic is not self-evident.
- Prioritize readability and maintainability.
- Add tests for bug fixes or behavior changes when possible.

## Safety

- Never hardcode secrets, tokens, or private keys.
- Highlight any required environment variables in docs.
- Ask before destructive operations.

## PR / Review Checklist

- [ ] Scope is limited to the requested change.
- [ ] Documentation is updated if needed.
- [ ] Tests are added/updated when applicable.
- [ ] No unrelated files were modified.
