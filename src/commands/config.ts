import { existsSync } from "node:fs";
import { loadConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { CONFIG_PATH } from "../lib/paths.js";

export function showConfig(): void {
  if (!existsSync(CONFIG_PATH)) {
    log.warn("No config file found. Run `forge activate <key>` to create one.");
    return;
  }

  const config = loadConfig();

  const maskedKey = config.license_key
    ? `${config.license_key.slice(0, 8)}..${config.license_key.slice(-4)}`
    : "(not set)";

  log.header("Forge config");
  log.table([
    ["License:", maskedKey],
    ["Machine ID:", config.machine_id],
    ["API URL:", config.api_url],
    ["Config path:", CONFIG_PATH],
  ]);

  const plugins = Object.entries(config.installed_plugins);
  if (plugins.length > 0) {
    log.header("Installed plugins");
    log.table(plugins.map(([name, info]) => [name, `v${info.version}`, info.installed_at]));
  } else {
    log.info("No plugins installed.");
  }
}
