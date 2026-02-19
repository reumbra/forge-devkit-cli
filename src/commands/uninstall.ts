import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { loadConfig, saveConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { CACHE_DIR, claudePluginDir } from "../lib/paths.js";

export function uninstall(pluginName: string): void {
  const fullName = pluginName.startsWith("forge-") ? pluginName : `forge-${pluginName}`;
  const config = loadConfig();

  if (!config.installed_plugins[fullName]) {
    log.error(`${fullName} is not installed.`);
    process.exit(1);
  }

  const version = config.installed_plugins[fullName].version;

  // Remove from Claude Code plugins directory
  const pluginPath = join(claudePluginDir(), fullName);
  if (existsSync(pluginPath)) {
    rmSync(pluginPath, { recursive: true });
    log.step(`Removed ${pluginPath}`);
  }

  // Remove cached archive
  const cachePath = join(CACHE_DIR, `${fullName}@${version}`);
  if (existsSync(cachePath)) {
    rmSync(cachePath, { recursive: true });
    log.step(`Cleared cache ${cachePath}`);
  }

  // Update config
  delete config.installed_plugins[fullName];
  saveConfig(config);

  log.success(`${fullName}@${version} uninstalled.`);
}
