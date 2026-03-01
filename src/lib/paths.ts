import { homedir } from "node:os";
import { join } from "node:path";

/** Root: ~/.forge/ */
export const FORGE_DIR = join(homedir(), ".forge");

/** Config: ~/.forge/config.json */
export const CONFIG_PATH = join(FORGE_DIR, "config.json");

/** Cache dir: ~/.forge/cache/ */
export const CACHE_DIR = join(FORGE_DIR, "cache");

/** Marketplace dir: ~/.forge/marketplace/ */
export const MARKETPLACE_DIR = join(FORGE_DIR, "marketplace");

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
