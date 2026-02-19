import { ApiError, apiRequest } from "../lib/api.js";
import { loadConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { bold, dim, green, red, reset, yellow } from "../lib/styles.js";
import { badge, box, statusBadge, table } from "../lib/ui.js";
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

    // Determine status
    let licStatus: "active" | "expiring" | "expired" | "inactive";
    if (!lic.is_active) licStatus = "inactive";
    else if (daysLeft <= 0) licStatus = "expired";
    else if (daysLeft <= 14) licStatus = "expiring";
    else licStatus = "active";

    const expiryColor = daysLeft <= 0 ? red : daysLeft <= 14 ? yellow : green;

    // License box
    console.log(
      box(
        [
          `${bold}Plan:${reset}     ${lic.plan}`,
          `${bold}Email:${reset}    ${lic.email}`,
          `${bold}Status:${reset}   ${statusBadge(licStatus)}`,
          `${bold}Expires:${reset}  ${expiryColor}${expires.toLocaleDateString()}${reset} ${dim}(${daysLeft}d left)${reset}`,
          `${bold}Machines:${reset} ${lic.machines.length} registered`,
        ],
        { title: "License", borderColor: dim },
      ),
    );

    // Machines
    if (lic.machines.length > 0) {
      const machineRows = lic.machines.map((m) => {
        const current = m.machine_id === config.machine_id;
        return [
          `${m.machine_id.slice(0, 16)}...`,
          current ? badge("this machine", "info") : dim + (m.label ?? "—") + reset,
          dim + new Date(m.activated_at).toLocaleDateString() + reset,
        ];
      });
      console.log(table(machineRows, { header: ["Machine", "Label", "Activated"] }));
    }

    // Plugins
    if (lic.allowed_plugins.length > 0) {
      const pluginRows = lic.allowed_plugins.map((name) => {
        const installed = config.installed_plugins[name];
        const stat = installed
          ? badge(`v${installed.version}`, "success")
          : badge("not installed", "neutral");
        return [name, stat];
      });
      console.log(table(pluginRows, { header: ["Plugin", "Status"] }));
    }
  } catch (err) {
    if (err instanceof ApiError) {
      log.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
