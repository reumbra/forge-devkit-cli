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

## Phase 3: UX & Interactive Mode

### Pretty Output ✅
- [x] Box-рамки для секций (license status, plugin list) — unicode box drawing
- [x] Spinners при загрузке (download, API calls) — `\r` + ANSI перезапись строки
- [x] Progress bar для скачивания ZIP (bytes received / total)
- [x] Цветные бейджи статусов: `✓ active` / `⚠ expiring` / `✗ expired`
- [x] Красивые таблицы с разделителями и выравниванием колонок
- [x] Gradient/bold заголовки команд (Forge branding)

### CLI Framework Migration ✅
- [x] Добавить `commander` — роутинг команд, auto-help, subcommands, флаги
- [x] Добавить `@clack/prompts` — интерактивные промпты, спиннеры, select, confirm
- [x] Переписать `cli.ts` с commander: программы, субкоманды, опции
- [x] Обновить тесты CLI dispatch под новый роутинг (77 tests)

### Interactive Dashboard ✅
- [x] При запуске без аргументов (TTY) — интерактивный dashboard
- [x] Статус-строка: лицензия (masked key), количество плагинов
- [x] Меню действий: Status / Browse / Install / Update / Uninstall / Doctor / Config / Deactivate / Exit
- [x] Навигация стрелками + Enter (@clack/prompts select)
- [x] Dashboard loop — после действия возвращается к меню
- [x] Non-TTY fallback → показывает help (backward compatible)

### Interactive Flows ✅
- [x] `forge activate` без ключа (TTY) → text input с FRG-key validation
- [x] `forge install` без плагина (TTY) → text input для имени плагина
- [x] `forge uninstall` без плагина (TTY) → select из установленных плагинов
- [x] `forge deactivate` (TTY) → confirmation prompt
- [x] `forge uninstall <plugin>` (TTY) → confirmation prompt
- [x] Non-TTY fallback → Usage error messages (scripts/CI compatible)

## Phase 4: Integration

- [ ] End-to-end tests against running API (Docker)
- [ ] `forge activate` → `forge install` → `forge list` → `forge uninstall` flow
- [ ] Error scenarios: expired license, machine limit, network failure
- [ ] Rate limiting handling (retry with backoff)

## Phase 5: Publish

- [ ] GitHub Actions CI (lint + test on push)
- [ ] npm publish workflow
- [ ] `npx @reumbra/forge` support
- [ ] Changelog generation
- [ ] `forge self-update` (or defer to npm)

## Phase 6: GDPR Compliance [epic:gdpr]

> Local data protection. CLI stores license key + machine ID + email in plaintext.

### Secure Storage
- [ ] Replace plaintext `~/.forge/config.json` with OS keychain (node `keytar` or `@aspect-build/rules_js` keychain)
- [ ] Fallback: encrypted config with machine-derived key (for headless/CI environments)
- [ ] Stop caching email from API response (fetch fresh on `forge account`, don't persist)

### Privacy & Transparency
- [ ] `forge privacy` command — display link to Privacy Policy + summary of data collected
- [ ] `forge export` command — dump config + installed plugins as JSON (Right to Portability)
- [ ] `forge delete-account` command — call API `DELETE /velvet/auth/delete-account`, then clear local config
- [ ] Show privacy policy link during `forge activate` (first interaction)

### Data Minimization
- [ ] Audit: do we need to send machine_id on every request? Consider session token after activation
- [ ] `forge deactivate` — confirm it triggers server-side machine removal (verify current behavior)
