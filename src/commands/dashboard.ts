import { existsSync } from "node:fs";
import * as p from "@clack/prompts";
import { loadConfig, saveConfig } from "../lib/config.js";
import { CONFIG_PATH } from "../lib/paths.js";
import { cyan, dim, green, reset, yellow } from "../lib/styles.js";
import { banner } from "../lib/ui.js";
import type { UpdateInfo } from "../lib/version.js";
import { checkForUpdate } from "../lib/version.js";
import { showAccount } from "./account.js";
import { activate } from "./activate.js";
import { deactivate } from "./deactivate.js";
import { doctor } from "./doctor.js";
import { pluginsMenu } from "./plugins-menu.js";
import { selfUpdate } from "./self-update.js";

type Action = "plugins" | "account" | "doctor" | "deactivate" | "activate" | "self-update" | "exit";

function buildEnhancedStatus(updateInfo?: UpdateInfo | null): string {
  if (!existsSync(CONFIG_PATH)) {
    return `${yellow}No config found${reset} ${dim}\u2014 run activate to get started${reset}`;
  }

  const config = loadConfig();

  if (!config.license_key) {
    return `${yellow}No license key${reset} ${dim}\u2014 run activate to bind a license${reset}`;
  }

  const maskedKey = `${config.license_key.slice(0, 8)}..${config.license_key.slice(-4)}`;
  const pluginCount = Object.keys(config.installed_plugins).length;
  const pluginLabel =
    pluginCount === 0
      ? "no plugins"
      : `${pluginCount} plugin${pluginCount > 1 ? "s" : ""} installed`;

  const parts: string[] = [`${green}Licensed${reset}  ${dim}${maskedKey}${reset}`];

  // Show plan if cached
  if (config.plan) {
    parts[0] += `  ${dim}\u00b7${reset}  ${cyan}${config.plan}${reset}`;
  }

  // Show expiry if cached
  if (config.expires_at) {
    const expires = new Date(config.expires_at);
    const daysLeft = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const expiryStr = `expires ${expires.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`;
    if (daysLeft <= 14) {
      parts[0] += `  ${dim}\u00b7${reset}  ${yellow}${expiryStr} (${daysLeft}d)${reset}`;
    } else {
      parts[0] += `  ${dim}\u00b7  ${expiryStr} (${daysLeft}d)${reset}`;
    }
  }

  if (updateInfo?.updateAvailable) {
    parts.push(
      `${yellow}Update available${reset}  ${dim}v${updateInfo.current}${reset} → ${cyan}v${updateInfo.latest}${reset}`,
    );
  }

  parts.push(`${cyan}${pluginLabel}${reset}`);

  return parts.join("\n");
}

function getMenuOptions(
  hasLicense: boolean,
  updateInfo?: UpdateInfo | null,
): { value: Action; label: string; hint?: string }[] {
  const updateOption: { value: Action; label: string; hint?: string } | null =
    updateInfo?.updateAvailable
      ? {
          value: "self-update",
          label: "Update Forge",
          hint: `v${updateInfo.current} → v${updateInfo.latest}`,
        }
      : null;

  if (!hasLicense) {
    return [
      { value: "activate", label: "Activate license", hint: "bind a license key to this machine" },
      { value: "doctor", label: "Run diagnostics", hint: "check environment health" },
      ...(updateOption ? [updateOption] : []),
      { value: "exit", label: "Exit" },
    ];
  }

  const config = loadConfig();
  const pluginCount = Object.keys(config.installed_plugins).length;
  const pluginHint = pluginCount > 0 ? `${pluginCount} installed` : "browse & install";

  const expiryHint = config.plan ? `${config.plan} plan` : "view license details";

  return [
    { value: "plugins", label: "Manage plugins", hint: pluginHint },
    { value: "account", label: "License & devices", hint: expiryHint },
    { value: "doctor", label: "Run diagnostics", hint: "check environment health" },
    ...(updateOption ? [updateOption] : []),
    { value: "deactivate", label: "Deactivate", hint: "unbind this machine" },
    { value: "exit", label: "Exit" },
  ];
}

async function executeAction(action: Action): Promise<void> {
  console.log();

  switch (action) {
    case "activate": {
      const key = await p.text({
        message: "Enter your license key:",
        placeholder: "FRG-XXXX-XXXX-XXXX",
        validate: (v) => {
          if (!v || !/^FRG-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(v)) {
            return "Invalid format. Expected: FRG-XXXX-XXXX-XXXX";
          }
        },
      });
      if (p.isCancel(key)) return;
      await activate(key);
      break;
    }

    case "plugins":
      await pluginsMenu();
      break;

    case "account":
      await showAccount();
      break;

    case "doctor":
      await doctor();
      break;

    case "self-update":
      await selfUpdate();
      break;

    case "deactivate": {
      const confirmed = await p.confirm({
        message: "Deactivate this machine? This will free up a machine slot.",
      });
      if (p.isCancel(confirmed) || !confirmed) return;
      await deactivate();
      break;
    }

    case "exit":
      break;
  }
}

export async function dashboard(): Promise<void> {
  console.log(`\n${banner()}\n`);

  // Start update check in parallel with banner display
  const config = loadConfig();
  const updateCheckPromise = checkForUpdate(config.last_update_check);

  // Await before first menu render
  let updateInfo = await updateCheckPromise;

  // Persist check timestamp
  if (updateInfo) {
    saveConfig({ ...config, last_update_check: new Date().toISOString() });
  }

  // Dashboard loop
  while (true) {
    const statusLine = buildEnhancedStatus(updateInfo);
    p.log.info(statusLine);

    const currentConfig = loadConfig();
    const hasLicense = currentConfig.license_key != null;

    const action = await p.select<Action>({
      message: "What would you like to do?",
      options: getMenuOptions(hasLicense, updateInfo),
    });

    if (p.isCancel(action) || action === "exit") {
      p.outro(`${dim}Goodbye!${reset}`);
      return;
    }

    try {
      await executeAction(action);
    } catch (err) {
      if (err instanceof Error) {
        p.log.error(err.message);
      }
    }

    // Clear update info after self-update action
    if (action === "self-update") {
      updateInfo = null;
    }

    // Spacer before next loop iteration
    console.log();
  }
}
