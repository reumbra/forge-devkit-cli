# Forge DevKit CLI — Backlog

## Phase 1: MVP ✅

- [x] Project scaffold (package.json, tsconfig, biome, .gitignore)
- [x] 7 commands: activate, deactivate, install, update, list, status, doctor
- [x] HTTP client via fetch, ZIP extraction via built-in zlib
- [x] Config management (~/.forge/config.json)
- [x] Machine ID fingerprint (SHA256)
- [x] Plugin install flow: download → cache → link to Claude Code
- [x] Unit tests (30 tests, 6 suites)
- [x] CLAUDE.md with dev workflow + gotchas

## Phase 2: Commands & Tests ✅

### New Commands
- [x] `forge uninstall <plugin>` — remove plugin from Claude Code + config + cache
- [x] `forge config` — show current config (masked license key)

### Improve Existing
- [x] Version from package.json (remove hardcoded `"0.1.0"`)
- [x] `doctor`: Node.js version check (>=20)
- [x] `doctor`: API connectivity probe (GET /health with 5s timeout)
- [x] `doctor`: cache size (recursive disk usage, formatted)
- [x] `doctor`: return exit code 1 when issues found
- [x] `uninstall`/`remove` alias in CLI dispatch

### Tests (76 total, 12 suites)
- [x] doctor: 10 tests (filesystem mock, API probe, plugin integrity, cache stats)
- [x] CLI dispatch: 12 tests (routing, aliases, --help, --version, error exits)
- [x] uninstall: 4 tests (removes from disk + config, shorthand, not-installed, no cache)
- [x] config command: 5 tests (masked key, null key, plugins, no config)
- [x] update: 6 tests (single vs all, shorthand, no license, not installed)
- [x] logger: 9 tests (all methods + table formatting)

## Phase 3: Integration

- [ ] End-to-end tests against running API (Docker)
- [ ] `forge activate` → `forge install` → `forge list` → `forge uninstall` flow
- [ ] Error scenarios: expired license, machine limit, network failure
- [ ] Rate limiting handling (retry with backoff)

## Phase 4: Publish

- [ ] GitHub Actions CI (lint + test on push)
- [ ] npm publish workflow
- [ ] `npx @reumbra/forge` support
- [ ] Changelog generation
- [ ] `forge self-update` (or defer to npm)
