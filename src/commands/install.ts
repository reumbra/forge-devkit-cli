import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ApiError, apiRequest, downloadFile } from "../lib/api.js";
import { loadConfig, saveConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { CACHE_DIR, claudePluginDir } from "../lib/paths.js";
import { extractZip } from "../lib/zip.js";
import type { DownloadResponse } from "../types.js";

export async function install(pluginName: string, version?: string): Promise<void> {
  const config = loadConfig();

  if (!config.license_key) {
    log.error("No license key configured. Run `forge activate <key>` first.");
    process.exit(1);
  }

  // Normalize plugin name (allow shorthand: "core" → "forge-core")
  const fullName = pluginName.startsWith("forge-") ? pluginName : `forge-${pluginName}`;

  log.step(`Requesting download for ${fullName}${version ? `@${version}` : ""}...`);

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
    log.step(`Downloading ${fullName}@${result.version}...`);
    const zipBuffer = await downloadFile(result.url);

    // Extract to cache
    const cacheDir = join(CACHE_DIR, `${fullName}@${result.version}`);
    if (existsSync(cacheDir)) {
      rmSync(cacheDir, { recursive: true });
    }
    mkdirSync(cacheDir, { recursive: true });

    log.step("Extracting...");
    await extractZip(zipBuffer, cacheDir);

    // Link into Claude Code plugin directory
    log.step("Installing into Claude Code...");
    linkPlugin(fullName, cacheDir);

    // Update config
    config.installed_plugins[fullName] = {
      version: result.version,
      installed_at: new Date().toISOString(),
    };
    saveConfig(config);

    log.success(`${fullName}@${result.version} installed!`);
    log.info("Run the plugin setup command in your project to get started.");
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === "PLUGIN_NOT_IN_PLAN") {
        log.error(`${fullName} is not available on your plan.`);
        log.info("Upgrade at https://reumbra.dev/forge/pricing");
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

function linkPlugin(pluginName: string, cacheDir: string): void {
  const destDir = join(claudePluginDir(), pluginName);

  // Remove existing install
  if (existsSync(destDir)) {
    rmSync(destDir, { recursive: true });
  }

  // Find the plugin root inside the extracted zip
  // Could be at root or nested one level (e.g., forge-core-1.0.0/)
  const entries = readdirSync(cacheDir);
  let sourceDir = cacheDir;

  // If there's a single directory and it contains .claude-plugin/, use it
  if (entries.length === 1) {
    const nested = join(cacheDir, entries[0]);
    if (existsSync(join(nested, ".claude-plugin"))) {
      sourceDir = nested;
    }
  }

  // Copy to Claude Code plugins directory
  mkdirSync(destDir, { recursive: true });
  cpSync(sourceDir, destDir, { recursive: true });
}
