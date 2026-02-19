import { ApiError, apiRequest } from "../lib/api.js";
import { loadConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { badge, banner, table } from "../lib/ui.js";
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

    console.log(`\n${banner()}\n`);

    if (result.plugins.length === 0) {
      log.info("No plugins available for your plan.");
      return;
    }

    const rows = result.plugins.map((plugin) => {
      const installed = config.installed_plugins[plugin.name];
      let status: string;
      if (installed) {
        status =
          installed.version === plugin.current_version
            ? badge("✓ up to date", "success")
            : badge(`↑ ${installed.version} → ${plugin.current_version}`, "warning");
      } else {
        status = badge("not installed", "neutral");
      }
      return [plugin.name, `v${plugin.current_version}`, status, plugin.description];
    });

    console.log(table(rows, { header: ["Plugin", "Version", "Status", "Description"] }));
  } catch (err) {
    if (err instanceof ApiError) {
      log.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
