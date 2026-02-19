import { existsSync } from "node:fs";
import { loadConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { CONFIG_PATH } from "../lib/paths.js";
import { bold, dim, reset } from "../lib/styles.js";
import { box, table } from "../lib/ui.js";

export function showConfig(): void {
  if (!existsSync(CONFIG_PATH)) {
    log.warn("No config file found. Run `forge activate <key>` to create one.");
    return;
  }

  const config = loadConfig();

  const maskedKey = config.license_key
    ? `${config.license_key.slice(0, 8)}..${config.license_key.slice(-4)}`
    : "(not set)";

  console.log(
    box(
      [
        `${bold}License:${reset}    ${maskedKey}`,
        `${bold}Machine ID:${reset} ${config.machine_id}`,
        `${bold}API URL:${reset}    ${config.api_url}`,
        `${bold}Config:${reset}     ${dim}${CONFIG_PATH}${reset}`,
      ],
      { title: "Forge Config", borderColor: dim },
    ),
  );

  const plugins = Object.entries(config.installed_plugins);
  if (plugins.length > 0) {
    const rows = plugins.map(([name, info]) => [
      name,
      `v${info.version}`,
      dim + new Date(info.installed_at).toLocaleDateString() + reset,
    ]);
    console.log(table(rows, { header: ["Plugin", "Version", "Installed"] }));
  } else {
    log.info("No plugins installed.");
  }
}
