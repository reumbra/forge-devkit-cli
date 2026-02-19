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
│  └─ Node.js (Fastify) + PostgreSQL (Supabase) + Cloudflare R2   │
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
                       │  (Cloudflare R2)  │
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
  "api_url": "https://api.reumbra.dev",
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

- Node.js CLI
- npm package: `@reumbra/forge` (public, scoped)
- Zero runtime dependencies (goal)

## Implementation Roadmap

| Phase | Scope |
|-------|-------|
| 1. MVP | activate + install + basic error handling |
| 3. Polish | update, doctor, status, expiry handling |
| 4. Rename | Align with forge-* naming across ecosystem |
