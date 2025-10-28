# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-XX

### Added

- **Core API**: Unified interface for AI CLI tools with `execute()` and `loadMessages()` functions
- **Claude Support**: Full implementation for Claude Code CLI integration
  - Session loading and parsing from JSONL files
  - Real-time command execution with callbacks
  - Automatic CLI detection with fallback to environment variables
- **Type Safety**: Complete TypeScript definitions with strict typing
  - `UnifiedMessage` format for cross-tool compatibility
  - Comprehensive content block types (text, thinking, tool_use, tool_result, slash_command)
  - Generic type support for JSON extraction
- **Session Management**: Load and parse historical Claude sessions
  - Automatic timestamp sorting
  - Message filtering and processing
  - Support for slash commands and special content blocks
- **JSON Extraction**: Smart JSON parsing from AI responses
  - Multiple extraction strategies (direct parse, code blocks, regex)
  - Optional Zod schema validation
  - Generic type support for type-safe extraction
- **Execution Features**:
  - Real-time event streaming with callbacks
  - Permission modes (default, plan, acceptEdits, bypassPermissions)
  - Timeout support
  - Verbose logging mode
  - Session resumption and continuation
  - Model selection
  - Tool usage restrictions
  - Image attachment support
- **Token Usage Tracking**: Detailed usage statistics including cache tokens
- **Cross-platform Support**: Works on macOS, Linux, and Windows
- **Comprehensive Documentation**:
  - Full API reference with JSDoc comments
  - Usage examples for all major features
  - Troubleshooting guide
  - Development instructions

### Technical Details

- **Node.js 22+** required
- **Dependencies**:
  - `boxen` (formatted output)
  - `chalk` (colored output)
  - `cross-spawn` (cross-platform process spawning)
- **Peer Dependencies**:
  - `zod` (optional, for schema validation)
- **Build System**: bunchee for ESM output
- **Testing**: Vitest with unit and E2E tests
- **Package Size**: ~56KB

### Known Limitations

- Claude Code CLI support only (Codex, Gemini, Cursor planned for future releases)
- Node.js 22.0.0 or higher required
- Automatic CLI detection works best on macOS and Linux

### Migration Notes

This is the initial 1.0.0 release. Future breaking changes will be documented here.

---

## Future Roadmap

- Support for OpenAI Codex
- Support for Google Gemini
- Support for Cursor AI
- Enhanced streaming capabilities
- Improved error handling and recovery
- CLI installation helpers
- Additional permission modes
- Plugin system for custom tools
