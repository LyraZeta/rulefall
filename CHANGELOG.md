# Changelog

All notable changes to Rulefall are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Versioned semantic fixtures and richer frontmatter/glob evaluation.
- Machine-readable trace export.

## [0.1.0] - 2026-08-14

### Added

- Interactive lifecycle waterfall for startup, discovery, and edit phases.
- Side-by-side simulation for OpenAI Codex, Claude Code, Cursor, and GitHub Copilot.
- Local folder access, ZIP import fallback, and a built-in demonstration workspace.
- Target file and working-directory controls.
- Explainable resolution events with action, reason, source, timing, and confidence.
- Loaded-file, byte, token-estimate, event, and portability summaries.
- Client-side PNG export for sharing a visible trace.
- Local-only static architecture with no backend, telemetry, account, or model calls.
- English and Simplified Chinese project documentation.

### Changed

- Replaced `latest` dependency specifiers with bounded version ranges represented by the lockfile and removed the unused `clsx` dependency.
- Aligned the documented Cursor legacy-rule confidence, import completeness limits, and PNG privacy boundary with the implementation.
- Made the Pages workflow run the full project check before deployment.

[Unreleased]: https://github.com/LyraZeta/rulefall/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/LyraZeta/rulefall/releases/tag/v0.1.0
