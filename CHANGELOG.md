# Changelog

## 1.3.1

### Bug Fixes

- **🐛 Multi-Repo Time Range Options**: Fixed critical issue where `--since` and `--until` options were not working in multi-repository mode
  - Root cause: Commander.js option conflict between parent command and `multi` subcommand
  - Solution: Added `.enablePositionalOptions()` and `.passThroughOptions()` to properly handle subcommand options
  - Now `--since` and `--until` work correctly for custom time ranges in multi-repo mode
  - Both long form (`--since`, `--until`) and short form (`-s`, `-u`) now work as expected

### Internal Improvements

- **⚡ Build-time Version Injection**: Optimized version number handling by injecting it at build time instead of runtime
  - Added `define` configuration in `.fatherrc.ts` to inject version from `package.json` during build
  - Removed runtime file I/O operations for reading `package.json` in `cli.ts`
  - Version is now injected as `process.env.CLI_VERSION` at build time, improving startup performance
  - Build output now contains the version string directly, eliminating runtime overhead

## 1.3.0

### Major Features

- **🆕 Multi-Repository Mode (BETA)**: Analyze multiple repositories in a single run
  - Support for both local and remote repositories
  - Local repos: Direct analysis of repositories on your machine
  - Remote repos: Automatic cloning and cleanup
  - Full clone support (no depth limit) for accurate statistics
  - Automatic cleanup of temporary directories
  - Parallel processing with configurable concurrency
  - Cross-repository author mapping
  - Combined statistics across all repositories
  - Interactive configuration wizard with `openspec-stat init --multi`
  - New commands: `openspec-stat multi` and `openspec-stat init`
  - Complete i18n support (English and Chinese)
  - Comprehensive documentation in MULTI_REPO_GUIDE.md

### Enhancements

- **🎯 Multi-Repo Output Control**: Add `--show-contributors` option for multi-repository mode
  - Default behavior now shows aggregated summary only (to avoid information overload)
  - Use `--show-contributors` flag to see detailed per-contributor statistics
  - Improves readability when analyzing large teams across multiple repositories
  - Applies to all output formats: table, JSON, CSV, and Markdown

### Documentation

- **📚 Multi-Repo Time Range Options**: Clarified `--since` and `--until` support in multi-repository mode
  - Added examples in README.md and README.zh-CN.md showing time range usage
  - Created MULTI_REPO_TIME_RANGE_EXAMPLE.md with comprehensive usage examples
  - Note: This functionality was already implemented, just not well documented

### Bug Fixes

- **🐛 Auto-Fetch Remote Branches**: Fixed issue where local repositories were not fetching remote branches before analysis
  - Added automatic `git fetch` for local repositories to ensure data is up-to-date
  - Applies to both single-repo and multi-repo modes
  - Can be disabled with `--no-fetch` CLI option or `autoFetch: false` in config
  - Prevents stale data when analyzing local repositories
- **🐛 Multi-Repo Process Exit**: Fixed issue where multi-repository mode didn't exit automatically after completion
  - Removed `uncaughtException` listener that prevented normal process exit
  - Changed event listeners to use `once()` instead of `on()` for SIGINT/SIGTERM
  - Process now exits cleanly after displaying statistics

### Breaking Changes

- None - Single-repository mode remains fully backward compatible

## 1.2.0

### Minor Changes

- Add proposal-based statistics summary

## 1.1.0

### Minor Changes

- Fix bugs and update docs.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - Initial Release

### Added

- Initial release of openspec-stat
- Track team members' OpenSpec proposals and code changes in Git repositories
