# Forge DevKit CLI

**Package:** `@reumbra/forge`
**Role:** CLI tool for installing and managing Forge plugins for Claude Code

## Ecosystem

Forge DevKit is a commercial product by [Reumbra](https://reumbra.dev) — AI-powered project scaffolding tools for Claude Code.

```
┌──────────────────────────────────────────────────────────────────┐
│                     Forge DevKit Ecosystem                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  forge-devkit-cli (this repo)        PUBLIC                      │
│  └─ npm @reumbra/forge                                           │
│  └─ Commands: activate, install, update, list, status, doctor    │
│  └─ User-facing tool, distributed via npm                        │
│                                                                  │
│  forge-devkit-api                    PRIVATE                     │
│  └─ License validation, plugin delivery, webhooks                │
│  └─ Node.js (Fastify) + PostgreSQL (Supabase) + AWS S3          │
│                                                                  │
│  forge-devkit-landing                PUBLIC                      │
│  └─ reumbra.dev/forge — website, pricing, docs                   │
│  └─ Astro + Tailwind, hosted on Cloudflare Pages                 │
│                                                                  │
│  forge-devkit-plugins                PRIVATE (currently public)   │
│  └─ Plugin source code, tests, design docs                       │
│  └─ Currently: github.com/maselious/ai-marketplace               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Architecture

```
┌──────────────┐       ┌─────────────────┐
│  forge CLI   │──────▶│  Forge API      │
│  (this repo) │       │  (devkit-api)   │
│              │       │                 │
│  activate    │       │  /auth/activate │
│  install     │       │  /plugins/list  │
│  update      │       │  /plugins/down  │
│  list        │       │  /license/check │
└──────────────┘       └────────┬────────┘
                                │
                       ┌────────┴─────────┐
                       │  Plugin Storage   │
                       │  (AWS S3)        │
                       └───────────────────┘
```

## Commands

```
forge activate <license-key>     # Bind license to machine
forge deactivate                 # Unbind (for machine transfer)
forge install <plugin> [version] # Download and install plugin
forge update [plugin]            # Update all or specific plugin
forge list                       # Show installed + available
forge status                     # License: expiry, binding, limits
forge doctor                     # Diagnostics: Claude Code found? Plugins intact?
```

## Config Storage

```json
// ~/.forge/config.json
{
  "license_key": "FRG-XXXX-XXXX-XXXX",
  "machine_id": "a1b2c3...",
  "api_url": "https://api.reumbra.com/velvet",
  "installed_plugins": {
    "forge-core": { "version": "1.5.0", "installed_at": "2026-02-19T..." },
    "forge-product": { "version": "0.4.0", "installed_at": "2026-02-19T..." }
  }
}
```

## Install Flow

```
$ forge install core

1. Read config.json -> license_key, machine_id
2. POST /plugins/download {license_key, machine_id, plugin: "forge-core", version: "latest"}
3. API validates license, expiry, machine_id, plugin access
4. Returns signed download URL (R2 presigned, 5 min TTL)
5. CLI downloads .zip via signed URL
6. Unpacks to ~/.forge/cache/forge-core@1.5.0/
7. Links into Claude Code plugin directory
8. Updates config.json -> installed_plugins
9. "forge-core@1.5.0 installed. Run /forge:setup in your project"
```

## Machine ID & Limits

License bound to N devices (default: 3). Machine ID = SHA256 hash of hostname + OS + username.

```
Activate flow:
  CLI: POST /auth/activate {license_key, machine_id}
  API: validate key -> check slots (3 max) -> register machine_id -> 200 OK
       or 403 "All device slots used. Run forge deactivate on another machine"
```

## Offline Behavior

- Already installed plugins: work forever (just .md files on disk)
- Install/update: requires API connection
- After license expiry: installed versions continue working, updates blocked

## Tech Stack

- **Runtime:** Node.js >=20
- **Package:** `@reumbra/forge` (public, scoped npm)
- **Dependencies:** Commander.js (routing), @clack/prompts (interactive UI)
- **Build:** TypeScript (strict), Biome (lint + format)
- **Tests:** Vitest (112 tests, 17 suites)

## Installation

```bash
npm install -g @reumbra/forge
```

Or run without installing:

```bash
npx @reumbra/forge doctor
```

## Development

```bash
pnpm install          # Install dev dependencies
pnpm dev -- doctor    # Run any command in dev mode (via tsx)
pnpm build            # Compile TypeScript → dist/
pnpm check            # Lint + format (Biome)
pnpm test             # Run tests
```

### Project Structure

```
src/
├── cli.ts                  # Entry point, arg parser, command dispatch
├── types.ts                # Shared types (config, API responses)
├── commands/
│   ├── activate.ts         # forge activate <key>
│   ├── deactivate.ts       # forge deactivate
│   ├── install.ts          # forge install <plugin> [version]
│   ├── update.ts           # forge update [plugin]
│   ├── list.ts             # forge list
│   ├── status.ts           # forge status
│   └── doctor.ts           # forge doctor (local only)
└── lib/
    ├── api.ts              # HTTP client (fetch), ApiError
    ├── config.ts           # ~/.forge/config.json management
    ├── logger.ts           # CLI output (colors, tables, icons)
    ├── machine-id.ts       # SHA256-based device fingerprint
    ├── paths.ts            # ~/.forge/ path constants
    └── zip.ts              # ZIP extraction (Node.js built-ins)
```
