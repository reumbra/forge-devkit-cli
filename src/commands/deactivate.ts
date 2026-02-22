import { ApiError, apiRequest } from "../lib/api.js";
import { loadConfig, saveConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { createSpinner } from "../lib/ui.js";

export async function deactivate(): Promise<void> {
  const config = loadConfig();

  if (!config.license_key) {
    log.error("No license key configured. Run `forge activate <key>` first.");
    process.exit(1);
  }

  const spinner = createSpinner("Deactivating this machine...");

  try {
    await apiRequest(config, {
      method: "POST",
      path: "/auth/deactivate",
      body: {
        license_key: config.license_key,
        machine_id: config.machine_id,
      },
    });

    config.license_key = null;
    saveConfig(config);

    spinner.stop();
    log.success("Machine deactivated. License slot freed.");
    log.info("You can now activate on another machine.");
  } catch (err) {
    spinner.stop();
    if (err instanceof ApiError) {
      log.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
