import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { CACHE_DIR, CONFIG_PATH, claudePluginDir, FORGE_DIR } from "../lib/paths.js";
import { bold, dim, green, reset, yellow } from "../lib/styles.js";
import { banner, box } from "../lib/ui.js";

export interface DoctorResult {
  checks: number;
  issues: number;
}

interface Check {
  label: string;
  ok: boolean;
  detail: string;
  hint?: string;
}

export async function doctor(): Promise<DoctorResult> {
  console.log(`\n${banner()}\n`);

  const results: Check[] = [];

  // 1. Node.js version
  const nodeVersion = process.versions.node;
  const major = Number.parseInt(nodeVersion.split(".")[0], 10);
  results.push({
    label: "Node.js",
    ok: major >= 20,
    detail: `v${nodeVersion}`,
    hint: major < 20 ? "Requires Node.js >=20" : undefined,
  });

  // 2. Forge directory
  results.push({
    label: "Forge directory",
    ok: existsSync(FORGE_DIR),
    detail: FORGE_DIR,
    hint: !existsSync(FORGE_DIR) ? "Run `forge activate <key>` to set up" : undefined,
  });

  // 3. Config file
  const hasConfig = existsSync(CONFIG_PATH);
  let configChecks: Check[] = [];
  if (hasConfig) {
    const config = loadConfig();
    configChecks = [
      {
        label: "License key",
        ok: config.license_key != null,
        detail: config.license_key ? `${config.license_key.slice(0, 8)}...` : "(not set)",
      },
      { label: "Machine ID", ok: true, detail: `${config.machine_id.slice(0, 12)}...` },
      { label: "API URL", ok: true, detail: config.api_url },
    ];
  } else {
    configChecks = [
      {
        label: "Config file",
        ok: false,
        detail: CONFIG_PATH,
        hint: "Run `forge activate <key>` to create",
      },
    ];
  }
  results.push(...configChecks);

  // 4. Cache directory
  if (existsSync(CACHE_DIR)) {
    const cached = readdirSync(CACHE_DIR);
    const totalSize = dirSize(CACHE_DIR);
    results.push({
      label: "Cache",
      ok: true,
      detail: `${cached.length} item(s), ${formatBytes(totalSize)}`,
    });
  } else {
    results.push({ label: "Cache", ok: true, detail: "empty (normal for fresh installs)" });
  }

  // 5. Claude Code plugin directory
  const pluginDir = claudePluginDir();
  results.push({
    label: "Claude Code plugins",
    ok: existsSync(pluginDir),
    detail: pluginDir,
    hint: !existsSync(pluginDir) ? "Make sure Claude Code is installed" : undefined,
  });

  // 6. Installed plugins integrity
  const config = loadConfig();
  for (const [name, info] of Object.entries(config.installed_plugins)) {
    const pluginPath = join(pluginDir, name);
    if (existsSync(pluginPath)) {
      const hasManifest = existsSync(join(pluginPath, ".claude-plugin", "plugin.json"));
      results.push({
        label: `${name}@${info.version}`,
        ok: hasManifest,
        detail: hasManifest ? "intact" : "missing plugin.json",
        hint: !hasManifest ? "Plugin may be corrupted, try reinstalling" : undefined,
      });
    } else {
      results.push({
        label: `${name}@${info.version}`,
        ok: false,
        detail: "not found on disk",
        hint: `Run \`forge install ${name}\` to reinstall`,
      });
    }
  }

  // 7. API connectivity
  const apiUrl = hasConfig
    ? config.api_url
    : (process.env.FORGE_API_URL ?? "https://api.reumbra.com/velvet");
  let apiOk = false;
  try {
    const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(25000) });
    apiOk = res.ok;
  } catch {
    // unreachable or timeout (Lambda cold starts can take ~20s)
  }
  results.push({
    label: "API connectivity",
    ok: apiOk,
    detail: apiOk ? `${apiUrl} reachable` : `${apiUrl} unreachable`,
    hint: !apiOk ? "Installed plugins work offline. API needed for install/update." : undefined,
  });

  // Render
  const lines: string[] = [];
  for (const r of results) {
    const icon = r.ok ? `${green}✓${reset}` : `${yellow}!${reset}`;
    lines.push(`${icon} ${bold}${r.label}${reset}  ${dim}${r.detail}${reset}`);
    if (r.hint) {
      lines.push(`    ${dim}${r.hint}${reset}`);
    }
  }

  console.log(box(lines, { title: "Diagnostics" }));

  const issues = results.filter((r) => !r.ok).length;
  const checks = results.length;

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
      total += stat.isDirectory() ? dirSize(fullPath) : stat.size;
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
