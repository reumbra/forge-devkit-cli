import { ApiError, apiRequest } from "../lib/api.js";
import { loadConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import type { StatusResponse } from "../types.js";

export async function status(): Promise<void> {
  const config = loadConfig();

  if (!config.license_key) {
    log.error("No license key configured. Run `forge activate <key>` first.");
    process.exit(1);
  }

  try {
    const result = await apiRequest<StatusResponse>(config, {
      method: "GET",
      path: "/auth/status",
      query: {
        license_key: config.license_key,
        machine_id: config.machine_id,
      },
    });

    const lic = result.license;
    const expires = new Date(lic.expires_at);
    const daysLeft = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    log.header("License status");
    log.table([
      ["Plan:", lic.plan],
      ["Email:", lic.email],
      ["Active:", lic.is_active ? "\x1b[32myes\x1b[0m" : "\x1b[31mno\x1b[0m"],
      ["Expires:", `${expires.toLocaleDateString()} (${daysLeft} days left)`],
      ["Machines:", `${lic.machines.length} registered`],
    ]);

    if (lic.machines.length > 0) {
      log.header("Registered machines");
      for (const m of lic.machines) {
        const isCurrent =
          m.machine_id === config.machine_id ? " \x1b[32m← this machine\x1b[0m" : "";
        log.plain(`  ${m.machine_id.slice(0, 12)}...${isCurrent}`);
      }
    }

    log.header("Available plugins");
    for (const name of lic.allowed_plugins) {
      const installed = config.installed_plugins[name];
      const badge = installed
        ? `\x1b[32m✓ v${installed.version}\x1b[0m`
        : "\x1b[2mnot installed\x1b[0m";
      log.plain(`  ${name}  ${badge}`);
    }
  } catch (err) {
    if (err instanceof ApiError) {
      log.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
