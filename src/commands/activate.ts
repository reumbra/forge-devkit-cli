import { ApiError, apiRequest } from "../lib/api.js";
import { loadConfig, saveConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import type { ActivateResponse } from "../types.js";

export async function activate(licenseKey: string): Promise<void> {
  if (!/^FRG-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(licenseKey)) {
    log.error("Invalid license key format. Expected: FRG-XXXX-XXXX-XXXX");
    process.exit(1);
  }

  const config = loadConfig();
  config.license_key = licenseKey;

  log.step(`Activating license on this machine...`);

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

    log.success("License activated!");
    log.plain("");
    log.table([
      ["Plan:", result.license.plan],
      ["Expires:", new Date(result.license.expires_at).toLocaleDateString()],
      ["Devices:", `${result.license.machines_used}/${result.license.max_machines}`],
    ]);
  } catch (err) {
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
