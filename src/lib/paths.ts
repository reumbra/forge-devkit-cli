import { homedir } from "node:os";
import { join } from "node:path";

/**
 * OS-standard config directory for Forge DevKit.
 * - Windows: %APPDATA%/forge-devkit
 * - macOS:   ~/Library/Application Support/forge-devkit
 * - Linux:   ~/.config/forge-devkit
 */
function getConfigDir(): string {
  switch (process.platform) {
    case "win32":
      return join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "forge-devkit");
    case "darwin":
      return join(homedir(), "Library", "Application Support", "forge-devkit");
    default:
      return join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "forge-devkit");
  }
}

/**
 * OS-standard cache directory for Forge DevKit.
 * - Windows: %LOCALAPPDATA%/forge-devkit/cache
 * - macOS:   ~/Library/Caches/forge-devkit
 * - Linux:   ~/.cache/forge-devkit
 */
function getCacheDir(): string {
  switch (process.platform) {
    case "win32":
      return join(
        process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"),
        "forge-devkit",
        "cache",
      );
    case "darwin":
      return join(homedir(), "Library", "Caches", "forge-devkit");
    default:
      return join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "forge-devkit");
  }
}

/** Root config dir (OS-standard) */
export const FORGE_DIR = getConfigDir();

/** Config: {config_dir}/config.json */
export const CONFIG_PATH = join(FORGE_DIR, "config.json");

/** Cache dir (OS-standard) */
export const CACHE_DIR = getCacheDir();

/** Marketplace dir: {config_dir}/marketplace/ */
export const MARKETPLACE_DIR = join(FORGE_DIR, "marketplace");

/** Legacy dir for migration detection */
export const LEGACY_FORGE_DIR = join(homedir(), ".forge");

/** Claude Code plugin directory */
export function claudePluginDir(): string {
  return join(homedir(), ".claude", "plugins");
}

/** Claude Code settings.json */
export function claudeSettingsPath(): string {
  return join(homedir(), ".claude", "settings.json");
}

/** Claude Code known_marketplaces.json */
export function claudeKnownMarketplacesPath(): string {
  return join(homedir(), ".claude", "plugins", "known_marketplaces.json");
}

/** Claude Code installed_plugins.json */
export function claudeInstalledPluginsPath(): string {
  return join(homedir(), ".claude", "plugins", "installed_plugins.json");
}

/** Claude Code plugin cache directory (~/.claude/plugins/cache/) */
export function claudePluginCacheDir(): string {
  return join(homedir(), ".claude", "plugins", "cache");
}
