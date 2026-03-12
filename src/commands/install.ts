import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ApiError, apiRequest, downloadFile } from "../lib/api.js";
import {
  enablePlugin,
  invalidatePluginCache,
  registerMarketplace,
} from "../lib/claude-integration.js";
import { loadConfig, saveConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import {
  ensureMarketplaceDir,
  marketplacePluginDir,
  updateMarketplaceJson,
} from "../lib/marketplace.js";
import { CACHE_DIR } from "../lib/paths.js";
import { bold, dim, green, red, reset } from "../lib/styles.js";
import { createSpinner } from "../lib/ui.js";
import { extractZip } from "../lib/zip.js";
import type { DownloadResponse } from "../types.js";
import { fetchPluginList } from "./list.js";

async function resolvePluginName(config: ReturnType<typeof loadConfig>, input: string): Promise<string> {
  // Known product prefixes — use as-is
  if (input.startsWith("forge-") || input.startsWith("lumina-")) {
    return input;
  }

  // Check if exact name exists in available plugins
  try {
    const plugins = await fetchPluginList(config);
    if (plugins.some((p) => p.name === input)) {
      return input;
    }
  } catch {
    // If list fails, fall through to shorthand
  }

  // Shorthand: "core" → "forge-core"
  return `forge-${input}`;
}

export async function install(pluginName: string, version?: string): Promise<void> {
  const config = loadConfig();

  if (!config.license_key) {
    log.error("No license key configured. Run `forge activate <key>` first.");
    process.exit(1);
  }

  // Normalize plugin name: try exact match first, then forge-* shorthand
  // This handles: "forge-core" (exact), "lumina-hub" (exact), "skill-forge" (exact), "core" → "forge-core"
  const fullName = await resolvePluginName(config, pluginName);
  const versionLabel = version ? `@${version}` : "";

  const spinner = createSpinner(`Requesting ${bold}${fullName}${reset}${versionLabel}...`);

  try {
    const result = await apiRequest<DownloadResponse>(config, {
      method: "POST",
      path: "/plugins/download",
      body: {
        plugin_name: fullName,
        ...(version ? { version } : {}),
      },
    });

    // Download the zip
    spinner.update(`Downloading ${bold}${fullName}@${result.version}${reset}...`);
    const zipBuffer = await downloadFile(result.url);

    // Extract to cache
    spinner.update("Extracting...");
    const cacheDir = join(CACHE_DIR, `${fullName}@${result.version}`);
    if (existsSync(cacheDir)) {
      rmSync(cacheDir, { recursive: true });
    }
    mkdirSync(cacheDir, { recursive: true });
    await extractZip(zipBuffer, cacheDir);

    // Install into marketplace
    spinner.update("Installing into marketplace...");
    ensureMarketplaceDir();

    const pluginDir = marketplacePluginDir(fullName);
    if (existsSync(pluginDir)) {
      rmSync(pluginDir, { recursive: true });
    }

    // Find the plugin root inside the extracted zip
    const entries = readdirSync(cacheDir);
    let sourceDir = cacheDir;
    if (entries.length === 1) {
      const nested = join(cacheDir, entries[0]);
      if (existsSync(join(nested, ".claude-plugin"))) {
        sourceDir = nested;
      }
    }

    mkdirSync(pluginDir, { recursive: true });
    cpSync(sourceDir, pluginDir, { recursive: true });

    // Update marketplace catalog
    updateMarketplaceJson(fullName, `Forge plugin: ${fullName}`, result.version);

    // Register marketplace in Claude Code (first time only)
    registerMarketplace();

    // Enable plugin in Claude Code settings
    enablePlugin(fullName);

    // Clear stale Claude Code cache so next restart picks up new version
    invalidatePluginCache(fullName);

    // Update config
    config.installed_plugins[fullName] = {
      version: result.version,
      installed_at: new Date().toISOString(),
    };
    saveConfig(config);

    spinner.stop(`${green}✓${reset} ${bold}${fullName}@${result.version}${reset} installed!`);
    log.info(`${dim}Restart Claude Code to load the plugin.${reset}`);
  } catch (err) {
    spinner.stop();
    if (err instanceof ApiError) {
      if (err.code === "PLUGIN_NOT_IN_PLAN") {
        log.error(`${fullName} is not available on your plan.`);
        log.info("Upgrade at https://forge.reumbra.com/pricing");
      } else if (err.code === "VERSION_NOT_FOUND") {
        log.error(`Version ${version} not found for ${fullName}.`);
      } else if (err.code === "LICENSE_INACTIVE") {
        log.error("Your license is inactive. Contact support.");
      } else {
        log.error(err.message);
      }
      process.exit(1);
    }
    throw err;
  }
}

export async function installAll(): Promise<void> {
  const config = loadConfig();

  if (!config.license_key) {
    log.error("No license key configured. Run `forge activate <key>` first.");
    process.exit(1);
  }

  const spinner = createSpinner("Fetching plugin list...");

  let plugins: { name: string }[];
  try {
    plugins = await fetchPluginList(config);
    spinner.stop();
  } catch (err) {
    spinner.stop();
    if (err instanceof ApiError) {
      log.error(err.message);
      process.exit(1);
    }
    throw err;
  }

  if (plugins.length === 0) {
    log.info("No plugins available for your plan.");
    return;
  }

  log.info(`Installing ${bold}${plugins.length}${reset} plugin(s)...\n`);

  let succeeded = 0;
  let failed = 0;

  for (const plugin of plugins) {
    try {
      await install(plugin.name);
      succeeded++;
    } catch {
      log.error(`${red}Failed to install ${plugin.name}${reset}`);
      failed++;
    }
    console.log();
  }

  if (failed === 0) {
    log.success(`All ${succeeded} plugin(s) installed.`);
  } else {
    log.warn(`${succeeded} installed, ${failed} failed.`);
  }

  log.info(`${dim}Restart Claude Code to load the plugins.${reset}`);
}
