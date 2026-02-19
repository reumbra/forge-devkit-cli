import { ApiError, apiRequest } from "../lib/api.js";
import { loadConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import type { ListResponse } from "../types.js";

export async function list(): Promise<void> {
  const config = loadConfig();

  if (!config.license_key) {
    log.error("No license key configured. Run `forge activate <key>` first.");
    process.exit(1);
  }

  try {
    const result = await apiRequest<ListResponse>(config, {
      method: "GET",
      path: "/plugins/list",
    });

    log.header("Available plugins");

    const rows: string[][] = [];
    for (const plugin of result.plugins) {
      const installed = config.installed_plugins[plugin.name];
      const status = installed
        ? installed.version === plugin.current_version
          ? "\x1b[32m✓ up to date\x1b[0m"
          : `\x1b[33m↑ ${installed.version} → ${plugin.current_version}\x1b[0m`
        : "\x1b[2mnot installed\x1b[0m";

      rows.push([plugin.name, `v${plugin.current_version}`, status, plugin.description]);
    }

    log.table(rows);

    if (result.plugins.length === 0) {
      log.info("No plugins available for your plan.");
    }
  } catch (err) {
    if (err instanceof ApiError) {
      log.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
