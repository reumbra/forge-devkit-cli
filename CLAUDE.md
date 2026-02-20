# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**@reumbra/forge** — public npm CLI for installing and managing commercial Forge plugins for Claude Code. Part of the Forge DevKit ecosystem by Reumbra.

### Ecosystem Context

This CLI is one of four repos. Understanding the boundaries matters:

| Repo | Visibility | Role |
|------|-----------|------|
| **forge-devkit-cli** (this) | PUBLIC | npm CLI — user-facing tool |
| **forge-devkit-api** | PRIVATE | License validation, plugin delivery (Fastify + Supabase + R2) |
| **forge-devkit-landing** | PUBLIC | Website at reumbra.dev/forge (Astro + Tailwind) |
| **forge-devkit-plugins** | PRIVATE | Plugin source code (currently at github.com/maselious/ai-marketplace) |

**This repo only talks to the API.** It never accesses R2 or the database directly. All plugin downloads go through presigned URLs returned by the API.

## Architecture

### CLI Commands → API Endpoints

```
forge activate <license-key>      → POST /auth/activate
forge deactivate                  → POST /auth/deactivate
forge install <plugin> [version]  → POST /plugins/download → presigned R2 URL
forge update [plugin]             → POST /plugins/download
forge list                        → POST /plugins/list
forge status                      → GET  /license/check
forge doctor                      → Local diagnostics only (no API)
```

### Key Data Flows

- **Config:** `~/.forge/config.json` stores license_key, machine_id, api_url, installed_plugins
- **Cache:** `~/.forge/cache/<plugin>@<version>/` holds downloaded plugin archives
- **Plugin linking:** Installed plugins are linked into the Claude Code plugin directory
- **Machine ID:** SHA256(hostname + OS + username), bound to license (max 3 devices)
- **Offline:** Installed plugins work forever (they're just .md files). Install/update requires API.

### Install Flow

1. Read `~/.forge/config.json` for credentials
2. POST to API with license_key, machine_id, plugin name, version
3. API validates → returns presigned R2 download URL (5 min TTL)
4. CLI downloads .zip, unpacks to cache, links into Claude Code
5. Updates config.json

## Tech Decisions

- **Minimal runtime dependencies** — Commander (routing), @clack/prompts (interactive UI), plus Node.js built-ins
- **Node.js CLI** distributed as public scoped npm package
- **License format:** `FRG-XXXX-XXXX-XXXX`
- **API base URL:** `https://api.reumbra.dev`

## Development

- `pnpm dev -- <command>` — run CLI in dev mode (tsx)
- `pnpm build` — TypeScript → dist/
- `pnpm test` — vitest (77 tests, 12 suites)
- `pnpm check` — Biome lint + format
- `node bin/forge.js` — run built CLI directly

## Code Style

- **Biome 2.4** — double quotes, sorted imports, 2-space indent, 100 char line width
- No non-null assertions (`!`) — use `as T` cast in tests
- Plugin name normalization: shorthand "core" → "forge-core" (prefix `forge-` if missing)

## Testing

- Tests in `tests/` mirror `src/` structure
- Config tests use `vi.mock()` to override paths → tmpdir isolation
- ZIP tests build real zip buffers with `buildZipBuffer()` helper
- vitest gotcha: `await import()` inside non-async callbacks fails at esbuild transform

## Gotchas

- ZIP extraction uses `createInflateRaw()` not `createUnzip()` — ZIP method 8 is raw deflate without zlib header
- Biome schema version must match installed CLI version — run `pnpm biome migrate --write` after upgrades

## CLI Architecture

- **Commander.js** — command routing, auto-help, subcommands, aliases (ls, remove)
- **@clack/prompts** — interactive mode: select, text, confirm, cancel handling
- **TTY detection** — `process.stdin.isTTY` gates interactive vs non-interactive behavior
  - TTY: dashboard, prompts, confirmations
  - Non-TTY (pipes/CI): help text, error messages, no interactivity
- **Dashboard loop** — `forge` (no args, TTY) → status line + action menu → execute → repeat
- **styles.ts + ui.ts** — zero-dep ANSI styling and box/table/badge/spinner components

## Implementation Phases

| Phase | Scope |
|-------|-------|
| 1. MVP | activate + install + basic error handling ✅ |
| 2. Commands & Tests | uninstall, config, enhanced doctor, 77 tests ✅ |
| 3. UX & Interactive | Commander, @clack/prompts, dashboard, pretty output ✅ |
| 4. Integration | Test against real API, end-to-end flows |
| 5. Publish | npm publish, CLI global install, versioning |

## Security Notes

- This is a PUBLIC repo — never commit API secrets, license keys, or internal endpoints
- License keys are stored locally in `~/.forge/config.json`, not in the repo
- Plugin downloads use short-lived presigned URLs (5 min TTL)
