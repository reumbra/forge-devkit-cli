import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { CACHE_DIR, CONFIG_PATH, claudePluginDir, FORGE_DIR } from "../lib/paths.js";

export interface DoctorResult {
  checks: number;
  issues: number;
}

export async function doctor(): Promise<DoctorResult> {
  log.header("Forge Doctor");

  let issues = 0;
  let checks = 0;

  // 1. Node.js version
  checks++;
  const nodeVersion = process.versions.node;
  const major = Number.parseInt(nodeVersion.split(".")[0], 10);
  if (major >= 20) {
    log.success(`Node.js: v${nodeVersion}`);
  } else {
    log.warn(`Node.js: v${nodeVersion} (requires >=20)`);
    issues++;
  }

  // 2. Forge directory
  checks++;
  if (existsSync(FORGE_DIR)) {
    log.success(`Forge directory: ${FORGE_DIR}`);
  } else {
    log.warn(`Forge directory not found: ${FORGE_DIR}`);
    log.info("Run `forge activate <key>` to set up.");
    issues++;
  }

  // 3. Config file
  checks++;
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

  // 4. Cache directory
  checks++;
  if (existsSync(CACHE_DIR)) {
    const cached = readdirSync(CACHE_DIR);
    const totalSize = dirSize(CACHE_DIR);
    log.success(`Cache: ${cached.length} item(s), ${formatBytes(totalSize)}`);
  } else {
    log.info("Cache directory not yet created (normal for fresh installs).");
  }

  // 5. Claude Code plugin directory
  checks++;
  const pluginDir = claudePluginDir();
  if (existsSync(pluginDir)) {
    log.success(`Claude Code plugins: ${pluginDir}`);
  } else {
    log.warn(`Claude Code plugin directory not found: ${pluginDir}`);
    log.info("Make sure Claude Code is installed.");
    issues++;
  }

  // 6. Installed plugins integrity
  const config = loadConfig();
  for (const [name, info] of Object.entries(config.installed_plugins)) {
    checks++;
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

  // 7. API connectivity
  checks++;
  const apiUrl = existsSync(CONFIG_PATH) ? config.api_url : "https://api.reumbra.dev";
  try {
    const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      log.success(`API connectivity: ${apiUrl} reachable`);
    } else {
      log.warn(`API responded with ${res.status}`);
      issues++;
    }
  } catch {
    log.warn(`API unreachable: ${apiUrl}`);
    log.info("Install/update requires API. Installed plugins still work offline.");
    issues++;
  }

  // Summary
  log.plain("");
  if (issues === 0) {
    log.success(`All ${checks} checks passed!`);
  } else {
    log.warn(`${issues} issue(s) found out of ${checks} checks.`);
  }

  return { checks, issues };
}

function dirSize(dir: string): number {
  let total = 0;
  try {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        total += dirSize(fullPath);
      } else {
        total += stat.size;
      }
    }
  } catch {
    // Permission or read errors — skip
  }
  return total;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
