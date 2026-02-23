import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { disablePlugin, removeMarketplace } from "../lib/claude-integration.js";
import { loadConfig, saveConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import {
  marketplacePluginDir,
  readMarketplaceJson,
  removeFromMarketplace,
} from "../lib/marketplace.js";
import { CACHE_DIR } from "../lib/paths.js";

export function uninstall(pluginName: string): void {
  const fullName = pluginName.startsWith("forge-") ? pluginName : `forge-${pluginName}`;
  const config = loadConfig();

  if (!config.installed_plugins[fullName]) {
    log.error(`${fullName} is not installed.`);
    process.exit(1);
  }

  const version = config.installed_plugins[fullName].version;

  // Remove from marketplace directory
  const pluginDir = marketplacePluginDir(fullName);
  if (existsSync(pluginDir)) {
    rmSync(pluginDir, { recursive: true });
    log.step(`Removed ${pluginDir}`);
  }

  // Remove from marketplace.json
  removeFromMarketplace(fullName);

  // Disable in Claude Code settings
  disablePlugin(fullName);

  // If no plugins left, remove marketplace entirely
  const mpData = readMarketplaceJson();
  if (mpData.plugins.length === 0) {
    removeMarketplace();
    log.step("Removed empty marketplace registration");
  }

  // Remove Forge cache
  const cachePath = join(CACHE_DIR, `${fullName}@${version}`);
  if (existsSync(cachePath)) {
    rmSync(cachePath, { recursive: true });
    log.step(`Cleared cache ${cachePath}`);
  }

  // Update Forge config
  delete config.installed_plugins[fullName];
  saveConfig(config);

  log.success(`${fullName}@${version} uninstalled.`);
  log.info("Restart Claude Code to unload the plugin.");
}
