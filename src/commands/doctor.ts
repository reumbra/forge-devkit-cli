import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { CACHE_DIR, CONFIG_PATH, claudePluginDir, FORGE_DIR } from "../lib/paths.js";

export function doctor(): void {
  log.header("Forge Doctor");

  let issues = 0;

  // 1. Check forge directory
  if (existsSync(FORGE_DIR)) {
    log.success(`Forge directory: ${FORGE_DIR}`);
  } else {
    log.warn(`Forge directory not found: ${FORGE_DIR}`);
    log.info("Run `forge activate <key>` to set up.");
    issues++;
  }

  // 2. Check config
  if (existsSync(CONFIG_PATH)) {
    const config = loadConfig();
    if (config.license_key) {
      log.success(`License key: ${config.license_key.slice(0, 8)}...`);
    } else {
      log.warn("No license key configured.");
      issues++;
    }
    log.success(`Machine ID: ${config.machine_id.slice(0, 12)}...`);
    log.success(`API URL: ${config.api_url}`);
  } else {
    log.warn(`Config file not found: ${CONFIG_PATH}`);
    issues++;
  }

  // 3. Check cache directory
  if (existsSync(CACHE_DIR)) {
    const cached = readdirSync(CACHE_DIR);
    log.success(`Cache: ${cached.length} item(s) in ${CACHE_DIR}`);
  } else {
    log.info("Cache directory not yet created (normal for fresh installs).");
  }

  // 4. Check Claude Code plugin directory
  const pluginDir = claudePluginDir();
  if (existsSync(pluginDir)) {
    log.success(`Claude Code plugins: ${pluginDir}`);
  } else {
    log.warn(`Claude Code plugin directory not found: ${pluginDir}`);
    log.info("Make sure Claude Code is installed.");
    issues++;
  }

  // 5. Check installed plugins integrity
  const config = loadConfig();
  for (const [name, info] of Object.entries(config.installed_plugins)) {
    const pluginPath = join(pluginDir, name);
    if (existsSync(pluginPath)) {
      const hasManifest = existsSync(join(pluginPath, ".claude-plugin", "plugin.json"));
      if (hasManifest) {
        log.success(`${name}@${info.version} — intact`);
      } else {
        log.warn(`${name}@${info.version} — missing plugin.json (corrupted?)`);
        issues++;
      }
    } else {
      log.warn(`${name}@${info.version} — not found on disk`);
      log.info(`Run \`forge install ${name}\` to reinstall.`);
      issues++;
    }
  }

  // Summary
  log.plain("");
  if (issues === 0) {
    log.success("All checks passed!");
  } else {
    log.warn(`${issues} issue(s) found.`);
  }
}
