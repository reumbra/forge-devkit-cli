import { existsSync } from "node:fs";
import * as p from "@clack/prompts";
import { loadConfig } from "../lib/config.js";
import { CONFIG_PATH } from "../lib/paths.js";
import { cyan, dim, green, reset, yellow } from "../lib/styles.js";
import { banner } from "../lib/ui.js";
import { showAccount } from "./account.js";
import { activate } from "./activate.js";
import { deactivate } from "./deactivate.js";
import { doctor } from "./doctor.js";
import { pluginsMenu } from "./plugins-menu.js";

type Action = "plugins" | "account" | "doctor" | "deactivate" | "activate" | "exit";

function buildEnhancedStatus(): string {
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

  parts.push(`${cyan}${pluginLabel}${reset}`);

  return parts.join("\n");
}

function getMenuOptions(hasLicense: boolean): { value: Action; label: string; hint?: string }[] {
  if (!hasLicense) {
    return [
      { value: "activate", label: "Activate license", hint: "bind a license key to this machine" },
      { value: "doctor", label: "Run diagnostics", hint: "check environment health" },
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

  // Dashboard loop
  while (true) {
    const statusLine = buildEnhancedStatus();
    p.log.info(statusLine);

    const config = loadConfig();
    const hasLicense = config.license_key != null;

    const action = await p.select<Action>({
      message: "What would you like to do?",
      options: getMenuOptions(hasLicense),
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

    // Spacer before next loop iteration
    console.log();
  }
}
