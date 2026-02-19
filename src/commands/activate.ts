import { ApiError, apiRequest } from "../lib/api.js";
import { loadConfig, saveConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { bold, dim, green, reset } from "../lib/styles.js";
import { box, createSpinner, statusBadge } from "../lib/ui.js";
import type { ActivateResponse } from "../types.js";

export async function activate(licenseKey: string): Promise<void> {
  if (!/^FRG-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(licenseKey)) {
    log.error("Invalid license key format. Expected: FRG-XXXX-XXXX-XXXX");
    process.exit(1);
  }

  const config = loadConfig();
  config.license_key = licenseKey;

  const spinner = createSpinner("Activating license...");

  try {
    const result = await apiRequest<ActivateResponse>(config, {
      method: "POST",
      path: "/auth/activate",
      body: {
        license_key: licenseKey,
        machine_id: config.machine_id,
      },
    });

    saveConfig(config);

    const expires = new Date(result.license.expires_at);
    spinner.stop(`${green}✓${reset} License activated!`);

    console.log(
      box(
        [
          `${bold}Plan:${reset}     ${result.license.plan}`,
          `${bold}Expires:${reset}  ${expires.toLocaleDateString()}`,
          `${bold}Machines:${reset} ${result.license.machines_used}/${result.license.max_machines}`,
          `${bold}Status:${reset}   ${statusBadge("active")}`,
        ],
        { title: "License", borderColor: dim },
      ),
    );

    log.info(`${dim}Run \`forge install <plugin>\` to get started.${reset}`);
  } catch (err) {
    spinner.stop();
    if (err instanceof ApiError) {
      if (err.code === "MACHINE_LIMIT") {
        log.error("All device slots are used.");
        log.info("Run `forge deactivate` on another machine first.");
      } else if (err.code === "INVALID_LICENSE") {
        log.error("Invalid license key. Double-check your key and try again.");
      } else if (err.code === "LICENSE_EXPIRED") {
        log.error("This license has expired. Renew at https://reumbra.dev/forge");
      } else {
        log.error(err.message);
      }
      process.exit(1);
    }
    throw err;
  }
}
