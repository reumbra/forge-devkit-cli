import { ApiError, apiRequest } from "../lib/api.js";
import { loadConfig, saveConfig } from "../lib/config.js";
import { CONFIG_PATH } from "../lib/paths.js";
import { bold, dim, green, red, reset, yellow } from "../lib/styles.js";
import { badge, box, createSpinner, statusBadge, table } from "../lib/ui.js";
import type { StatusResponse } from "../types.js";

export async function showAccount(): Promise<void> {
  const config = loadConfig();

  if (!config.license_key) {
    console.log(
      box(
        [
          `${bold}License:${reset}    (not set)`,
          `${bold}Config:${reset}     ${dim}${CONFIG_PATH}${reset}`,
        ],
        {
          title: "Account",
          borderColor: dim,
        },
      ),
    );
    return;
  }

  const spinner = createSpinner("Fetching account info\u2026");

  try {
    const result = await apiRequest<StatusResponse>(config, {
      method: "GET",
      path: "/auth/status",
      query: {
        license_key: config.license_key,
        machine_id: config.machine_id,
      },
    });

    spinner.stop();
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

    const maskedKey = `${config.license_key.slice(0, 8)}..${config.license_key.slice(-4)}`;

    // License box
    console.log(
      box(
        [
          `${bold}License:${reset}  ${maskedKey}`,
          `${bold}Plan:${reset}     ${lic.plan}`,
          `${bold}Email:${reset}    ${lic.email}`,
          `${bold}Status:${reset}   ${statusBadge(licStatus)}`,
          `${bold}Expires:${reset}  ${expiryColor}${expires.toLocaleDateString()}${reset} ${dim}(${daysLeft}d left)${reset}`,
          `${bold}Machines:${reset} ${lic.machines.length} registered`,
          "",
          `${dim}Config:   ${CONFIG_PATH}${reset}`,
          `${dim}API:      ${config.api_url}${reset}`,
        ],
        { title: "Account", borderColor: dim },
      ),
    );

    // Machines table
    if (lic.machines.length > 0) {
      const machineRows = lic.machines.map((m) => {
        const current = m.machine_id === config.machine_id;
        return [
          `${m.machine_id.slice(0, 16)}...`,
          current ? badge("this machine", "info") : dim + (m.label ?? "\u2014") + reset,
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

    // Cache plan & expiry for dashboard status line
    config.plan = lic.plan;
    config.expires_at = lic.expires_at;
    saveConfig(config);
  } catch (err) {
    spinner.stop();
    if (err instanceof ApiError) {
      // Offline fallback: show cached data
      const maskedKey = `${config.license_key.slice(0, 8)}..${config.license_key.slice(-4)}`;
      const lines = [`${bold}License:${reset}  ${maskedKey}`];
      if (config.plan) lines.push(`${bold}Plan:${reset}     ${config.plan} ${dim}(cached)${reset}`);
      if (config.expires_at) {
        const expires = new Date(config.expires_at);
        const daysLeft = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        lines.push(
          `${bold}Expires:${reset}  ${expires.toLocaleDateString()} ${dim}(${daysLeft}d left, cached)${reset}`,
        );
      }
      lines.push(
        "",
        `${dim}Config:   ${CONFIG_PATH}${reset}`,
        `${dim}API:      ${config.api_url}${reset}`,
      );
      lines.push("", `${yellow}Could not reach API: ${err.message}${reset}`);

      console.log(box(lines, { title: "Account", borderColor: dim }));
      return;
    }
    throw err;
  }
}
