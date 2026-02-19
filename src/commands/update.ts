import { loadConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { install } from "./install.js";

export async function update(pluginName?: string): Promise<void> {
  const config = loadConfig();

  if (!config.license_key) {
    log.error("No license key configured. Run `forge activate <key>` first.");
    process.exit(1);
  }

  const installed = Object.keys(config.installed_plugins);

  if (installed.length === 0) {
    log.warn("No plugins installed. Run `forge install <plugin>` first.");
    return;
  }

  if (pluginName) {
    const fullName = pluginName.startsWith("forge-") ? pluginName : `forge-${pluginName}`;
    if (!config.installed_plugins[fullName]) {
      log.error(`${fullName} is not installed. Run \`forge install ${pluginName}\` first.`);
      process.exit(1);
    }
    await install(fullName);
  } else {
    log.header(`Updating ${installed.length} plugin(s)...`);
    for (const name of installed) {
      await install(name);
    }
  }
}
