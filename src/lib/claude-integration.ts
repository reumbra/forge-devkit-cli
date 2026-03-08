import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  claudeInstalledPluginsPath,
  claudeKnownMarketplacesPath,
  claudePluginCacheDir,
  claudePluginDir,
  claudeSettingsPath,
  MARKETPLACE_DIR,
} from "./paths.js";

const MARKETPLACE_NAME = "reumbra";

// --- known_marketplaces.json ---

export function registerMarketplace(): void {
  const filePath = claudeKnownMarketplacesPath();
  const data = readJsonSafe<Record<string, unknown>>(filePath, {});

  // Always update — path may have changed (e.g. legacy ~/.forge → OS-standard)
  data[MARKETPLACE_NAME] = {
    source: {
      source: "directory",
      path: MARKETPLACE_DIR,
    },
    installLocation: MARKETPLACE_DIR,
    lastUpdated: new Date().toISOString(),
  };

  writeJsonSafe(filePath, data);
}

export function removeMarketplace(): void {
  const filePath = claudeKnownMarketplacesPath();
  if (!existsSync(filePath)) return;

  const data = readJsonSafe<Record<string, unknown>>(filePath, {});
  delete data[MARKETPLACE_NAME];
  writeJsonSafe(filePath, data);
}

// --- settings.json → enabledPlugins ---

export function enablePlugin(pluginName: string): void {
  const filePath = claudeSettingsPath();
  const data = readJsonSafe<Record<string, unknown>>(filePath, {});

  if (!data.enabledPlugins || typeof data.enabledPlugins !== "object") {
    data.enabledPlugins = {};
  }

  (data.enabledPlugins as Record<string, boolean>)[`${pluginName}@${MARKETPLACE_NAME}`] = true;
  writeJsonSafe(filePath, data);
}

export function disablePlugin(pluginName: string): void {
  const filePath = claudeSettingsPath();
  if (!existsSync(filePath)) return;

  const data = readJsonSafe<Record<string, unknown>>(filePath, {});
  const enabled = data.enabledPlugins as Record<string, boolean> | undefined;
  if (!enabled) return;

  delete enabled[`${pluginName}@${MARKETPLACE_NAME}`];
  writeJsonSafe(filePath, data);
}

export function isPluginEnabled(pluginName: string): boolean {
  const filePath = claudeSettingsPath();
  if (!existsSync(filePath)) return false;

  const data = readJsonSafe<Record<string, unknown>>(filePath, {});
  const enabled = data.enabledPlugins as Record<string, boolean> | undefined;
  return enabled?.[`${pluginName}@${MARKETPLACE_NAME}`] === true;
}

// --- cache invalidation ---

/**
 * Remove stale plugin data from Claude Code's internal state.
 *
 * After `forge install/update`, the marketplace has the new version, but
 * Claude Code may still load the old version. This function clears all
 * three layers of Claude Code's plugin state:
 *  1. Removes the plugin entry from `installed_plugins.json` so Claude Code
 *     treats the plugin as newly enabled on next restart.
 *  2. Deletes cached version directories under `cache/reumbra/<plugin>/`
 *     so Claude Code re-copies from the updated marketplace.
 *  3. Deletes the "active copy" at `~/.claude/plugins/<plugin>/` which
 *     takes priority over cache — without this, Claude Code loads the
 *     stale active copy and never checks cache for newer versions.
 */
export function invalidatePluginCache(pluginName: string): void {
  // 1. Remove entry from installed_plugins.json
  const installedPath = claudeInstalledPluginsPath();
  if (existsSync(installedPath)) {
    const data = readJsonSafe<Record<string, unknown>>(installedPath, {});
    const plugins = data.plugins as Record<string, unknown> | undefined;
    if (plugins) {
      delete plugins[`${pluginName}@${MARKETPLACE_NAME}`];
      writeJsonSafe(installedPath, data);
    }
  }

  // 2. Remove cached version directories
  const cacheDir = join(claudePluginCacheDir(), MARKETPLACE_NAME, pluginName);
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true, force: true });
  }

  // 3. Remove stale "active copy" (highest priority in Claude Code's loading)
  const activeCopy = join(claudePluginDir(), pluginName);
  if (existsSync(activeCopy)) {
    rmSync(activeCopy, { recursive: true, force: true });
  }
}

// --- JSON helpers ---

function readJsonSafe<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJsonSafe(filePath: string, data: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}
