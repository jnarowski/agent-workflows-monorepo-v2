# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-19

### Added
- Initial 1.0 stable release
- Claude CLI adapter with full session support via `createSession()`
- Codex CLI adapter with basic execution (session management via `execute()` with sessionId)
- Structured output support with Zod validation
- Comprehensive event streaming for real-time execution monitoring
- Execution logging with automatic file organization
- Multi-modal support (images) for both adapters
- Token usage tracking and model metadata extraction
- Comprehensive E2E and unit test suite
- Type-safe adapter interfaces with TypeScript
- Proper error handling with custom error types
- Session abort functionality (prevents new messages)
- Timeout handling with race condition protection

### Changed
- Package renamed from `agent-cli-sdk` to `agent-cli-sdk-three`
- Improved type safety by removing `any` types in favor of explicit interfaces
- Deduplicated logging code into shared BaseAdapter method
- Codex adapter capabilities accurately reflect feature support

### Fixed
- Removed unsupported `approvalPolicy` option from Codex types
- Fixed timeout race conditions in CLI wrappers
- Clarified session abort behavior in documentation
- Added missing .gitignore patterns for test artifacts

### Removed
- Dead code and temporary test files (.mjs, .log files)
- Duplicate logging implementations

### Documentation
- Added comprehensive JSDoc comments
- Created CHANGELOG.md and CONTRIBUTING.md
- Updated README with feature comparison table
- Clarified version numbering in MIGRATION.md

### Notes
- Codex adapter does not support `createSession()` method in 1.0 (planned for 1.1)
- Session `abort()` only prevents new messages, does not kill in-flight executions
- Both adapters support session resumption via sessionId parameter

## [0.1.19] - 2025-10-19
- Pre-release version
- Development and testing phase

---

[1.0.0]: https://github.com/sourceborn/agent-cli-sdk-three/releases/tag/v1.0.0
[0.1.19]: https://github.com/sourceborn/agent-cli-sdk-three/releases/tag/v0.1.19
