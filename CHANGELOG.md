# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-03-27

### Added
- Initial release
- Automatic L0/L1/L2 model routing
- Budget tracking with JSONL logging
- CLI commands: stats, test, config, help
- One-command installer
- Configurable models per tier
- Comprehensive documentation

### Features
- L0: Routes simple queries to Gemini Flash Lite ($0.10/M)
- L1: Routes general queries to Kimi K2.5 ($0.60/M)
- L2: Routes complex tasks to Claude Sonnet 4.5 ($3.00/M)
- Automatic cost tracking and statistics
- Pattern-based classification with confidence scores
