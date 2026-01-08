# Changelog

## 1.3.0 (Upcoming)

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
