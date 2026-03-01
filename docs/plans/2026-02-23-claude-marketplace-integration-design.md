# Claude Code Marketplace Integration

**Date:** 2026-02-23
**Status:** Approved + Experimentally Verified
**Approach:** A+B — Local marketplace with auto-enable, Claude Code handles install on restart

## Problem

Forge CLI installs plugins to `~/.claude/plugins/<name>/` — a path Claude Code ignores.
Claude Code uses a marketplace-based system: `known_marketplaces.json` → `installed_plugins.json` → `settings.json` → `cache/`.
Result: plugins appear installed in Forge but don't load in Claude Code.

## Solution

Forge CLI creates and maintains a **local marketplace** (`reumbra`) at `~/.forge/marketplace/`,
registers it in Claude Code's `known_marketplaces.json`, and pre-enables plugins in `settings.json`.

Claude Code auto-installs enabled plugins from the marketplace on next restart.

Fallback: user can always `/plugin marketplace add ~/.forge/marketplace` and `/plugin install` manually.

## Experimental Verification (2026-02-23)

Three tests confirmed the approach works end-to-end:

| Test | Method | Result |
|------|--------|--------|
| forge-test | Manual `/plugin install` after marketplace add | ✓ |
| forge-test2 | `/plugin marketplace update` (no restart) | ✓ |
| forge-test3 | Cold restart — auto-install on startup | ✓ |

### Key Findings

1. **`"source": "directory"`** is the correct source type for local marketplaces (not `"local"` or `"path"`)
2. **`installed_plugins.json` writes are ignored** — Claude Code re-validates on startup and doesn't trust external entries. DO NOT write to this file.
3. **`cache/` writes are overwritten** — Claude Code copies files from marketplace to cache on install. DO NOT pre-populate cache.
4. **`known_marketplaces.json` writes ARE respected** — marketplace registration works programmatically
5. **`settings.json` → `enabledPlugins` writes ARE respected** — pre-enabling works
6. **Auto-install on restart works** — Claude Code detects new enabled plugins in a registered marketplace and installs them automatically

### What Forge CLI MUST do

1. Place plugin files in `~/.forge/marketplace/plugins/<name>/`
2. Update `~/.forge/marketplace/.claude-plugin/marketplace.json`
3. Register marketplace in `~/.claude/plugins/known_marketplaces.json` (first time only)
4. Pre-enable plugin in `~/.claude/settings.json` → `enabledPlugins`

### What Forge CLI MUST NOT do

1. ~~Write to `~/.claude/plugins/installed_plugins.json` (ignored by Claude Code)~~ — **Updated:** Forge now **deletes** stale entries from `installed_plugins.json` to force Claude Code to re-install from the updated marketplace. This is deletion, not creation — Claude Code ignores externally-created entries but stale existing entries cause it to load old cached versions.
2. ~~Copy files to `~/.claude/plugins/cache/` (overwritten by Claude Code)~~ — **Updated:** Forge now **removes** `cache/reumbra/<plugin>/` to ensure Claude Code re-copies from the marketplace on next restart. Again, this is cleanup, not pre-population.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Marketplace name | `reumbra` | Brand-tied, plugins show as `forge-core@reumbra` |
| Marketplace source type | `"directory"` | Experimentally verified, only valid type for local paths |
| Registration | Auto (write to known_marketplaces.json + settings.json) | Zero-friction UX |
| Auto-enable | Yes, write to settings.json → enabledPlugins | Plugin auto-installs on next Claude Code restart |
| Plugin naming | `forge-*` names (forge-core, forge-product) | CLI manages names independently of plugin.json |
| Conflicts with other marketplaces | Ignore | Not Forge's concern |
| Uninstall scope | Full cleanup (marketplace + Claude Code files) | Clean state |
| Auto-update via Claude Code | Not supported (directory marketplace has no remote) | Updates go through `forge update` (requires license validation) |
| Backward compatibility | None | Only local testing so far |

## File Structure

### Forge Marketplace (created/managed by CLI)

```
~/.forge/marketplace/
├── .claude-plugin/
│   └── marketplace.json
└── plugins/
    ├── forge-core/
    │   ├── .claude-plugin/
    │   │   └── plugin.json
    │   ├── commands/
    │   ├── agents/
    │   └── skills/
    └── forge-product/
        └── ...
```

### Claude Code Files (modified by CLI)

```
~/.claude/
├── settings.json                    → enabledPlugins += "forge-core@reumbra": true
└── plugins/
    ├── known_marketplaces.json      → += "reumbra" entry (source: "directory")
    ├── installed_plugins.json       → DELETE stale entries on install/update (invalidatePluginCache)
    └── cache/reumbra/               → DELETE plugin cache dirs on install/update (invalidatePluginCache)
```

## Install Flow

```
forge install core
│
├─ 1. loadConfig() — check license_key
├─ 2. POST /plugins/download — get presigned URL + version
├─ 3. downloadFile(url) — download ZIP to Buffer
├─ 4. extractZip → ~/.forge/marketplace/plugins/forge-core/
│     (overwrite if exists)
├─ 5. updateMarketplaceJson() — add/update entry in marketplace.json
├─ 6. registerMarketplace() — write to known_marketplaces.json
│     (only on first install, if "reumbra" not present)
├─ 7. enablePlugin() — write to settings.json → enabledPlugins
├─ 8. invalidatePluginCache() — remove stale entry from installed_plugins.json + clear cache/
├─ 9. saveConfig() — update ~/.forge/config.json
└─ 10. Show ✓ and "Restart Claude Code to load the plugin"
```

## Uninstall Flow

```
forge uninstall core
│
├─ 1. Remove ~/.forge/marketplace/plugins/forge-core/
├─ 2. Update marketplace.json (remove entry)
├─ 3. Remove from settings.json → enabledPlugins
├─ 4. Remove from ~/.forge/config.json
├─ 5. If 0 plugins left — remove marketplace entirely
│     (from known_marketplaces.json too)
└─ 6. Show ✓ and "Restart Claude Code to unload the plugin"
```

Note: Forge now proactively cleans stale `installed_plugins.json` entries and `cache/` directories
during install/update via `invalidatePluginCache()`. This prevents Claude Code from loading
old cached versions after a plugin update.

## Update Flow

```
forge update [plugin]
│
├─ 1. POST /plugins/download — get latest version
├─ 2. Download + extract to marketplace (overwrite)
├─ 3. Update marketplace.json version
├─ 4. Update ~/.forge/config.json
└─ 5. Show ✓ and "Restart Claude Code or run /plugin marketplace update"
```

## Status Flow

```
forge status
│
├─ License info
├─ For each installed plugin:
│   ├─ Check settings.json → enabledPlugins["forge-core@reumbra"]
│   ├─ true  → "forge-core@2.2.0 ✓ enabled"
│   ├─ false → "forge-core@2.2.0 ⚠ disabled in Claude Code"
│   │   └─ Offer to re-enable
│   └─ missing → "forge-core@2.2.0 ✗ not registered"
│       └─ Offer to re-register
└─ Check marketplace registered in known_marketplaces.json
```

## Claude Code JSON Formats

### known_marketplaces.json — marketplace registration

```json
{
  "reumbra": {
    "source": {
      "source": "directory",
      "path": "<absolute-path-to-~/.forge/marketplace>"
    },
    "installLocation": "<absolute-path-to-~/.forge/marketplace>",
    "lastUpdated": "<ISO-timestamp>"
  }
}
```

### settings.json — plugin enablement

```json
{
  "enabledPlugins": {
    "forge-core@reumbra": true
  }
}
```

### marketplace.json — plugin catalog

```json
{
  "name": "reumbra",
  "owner": {
    "name": "Reumbra",
    "email": "support@reumbra.dev"
  },
  "plugins": [
    {
      "name": "forge-core",
      "source": "./plugins/forge-core",
      "description": "...",
      "version": "2.2.0"
    }
  ]
}
```

## Code Changes

| File | Changes |
|------|---------|
| `src/lib/paths.ts` | Add `MARKETPLACE_DIR`, `claudeSettingsPath()`, `claudeKnownMarketplacesPath()` |
| `src/lib/claude-integration.ts` | **New**: `registerMarketplace()`, `enablePlugin()`, `disablePlugin()`, `isPluginEnabled()`, `removeMarketplace()`, JSON merge helpers |
| `src/lib/marketplace.ts` | **New**: `updateMarketplaceJson()`, `removeFromMarketplace()`, `ensureMarketplaceDir()` |
| `src/commands/install.ts` | Rewrite: marketplace + claude integration instead of `linkPlugin()`. Remove `linkPlugin()`. |
| `src/commands/uninstall.ts` | Rewrite: full cleanup (marketplace + settings.json + config) |
| `src/commands/update.ts` | Minor: same as before (delegates to install) |
| `src/commands/status.ts` | Add enabled-status check |
| `src/commands/doctor.ts` | Add claude-integration health checks |

## Safety

- All JSON writes are **merge** operations (read → modify → write), never full overwrites
- Only touch keys under `reumbra` / `*@reumbra` — never modify other marketplace/plugin entries
- settings.json: only modify `enabledPlugins` key, preserve all other settings
- known_marketplaces.json: only add/remove `reumbra` key
- If JSON file doesn't exist or is empty, create with appropriate defaults
- If JSON parse fails, warn user and skip that step (don't break install)

## Testing

- Mock `~/.claude/` and `~/.forge/` paths in tests (via `vi.mock()` on paths.ts)
- Test JSON merge operations: add, update, remove, preserve other entries
- Test marketplace.json generation with 0, 1, N plugins
- Test idempotency: running install twice should produce same result
- Test uninstall cleanup: marketplace + settings entries removed
- Test enabled-status detection in status command
- Test graceful handling: missing JSON files, corrupt JSON, missing directories
