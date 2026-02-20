import { existsSync } from "node:fs";
import * as p from "@clack/prompts";
import { loadConfig } from "../lib/config.js";
import { CONFIG_PATH } from "../lib/paths.js";
import { bold, cyan, dim, green, reset, yellow } from "../lib/styles.js";
import { banner } from "../lib/ui.js";
import { activate } from "./activate.js";
import { showConfig } from "./config.js";
import { deactivate } from "./deactivate.js";
import { doctor } from "./doctor.js";
import { install } from "./install.js";
import { list } from "./list.js";
import { status } from "./status.js";
import { uninstall } from "./uninstall.js";
import { update } from "./update.js";

type Action =
  | "status"
  | "list"
  | "install"
  | "update"
  | "uninstall"
  | "doctor"
  | "config"
  | "activate"
  | "deactivate"
  | "exit";

function buildStatusLine(): string {
  if (!existsSync(CONFIG_PATH)) {
    return `${yellow}No config found${reset} ${dim}— run activate to get started${reset}`;
  }

  const config = loadConfig();

  if (!config.license_key) {
    return `${yellow}No license key${reset} ${dim}— run activate to bind a license${reset}`;
  }

  const maskedKey = `${config.license_key.slice(0, 8)}..${config.license_key.slice(-4)}`;
  const pluginCount = Object.keys(config.installed_plugins).length;
  const pluginLabel =
    pluginCount === 0 ? "no plugins" : `${pluginCount} plugin${pluginCount > 1 ? "s" : ""}`;

  return `${green}Licensed${reset} ${dim}${maskedKey}${reset}  ${cyan}${pluginLabel} installed${reset}`;
}

function getMenuOptions(hasLicense: boolean): { value: Action; label: string; hint?: string }[] {
  if (!hasLicense) {
    return [
      { value: "activate", label: "Activate license", hint: "bind a license key to this machine" },
      { value: "doctor", label: "Run diagnostics", hint: "check environment health" },
      { value: "config", label: "Show config", hint: "view current configuration" },
      { value: "exit", label: "Exit" },
    ];
  }

  return [
    { value: "status", label: "License status", hint: "plan, expiry, devices, plugins" },
    { value: "list", label: "Browse plugins", hint: "see available plugins for your plan" },
    { value: "install", label: "Install plugin", hint: "download and install a plugin" },
    { value: "update", label: "Update plugins", hint: "check for and apply updates" },
    { value: "uninstall", label: "Uninstall plugin", hint: "remove an installed plugin" },
    { value: "doctor", label: "Run diagnostics", hint: "check environment health" },
    { value: "config", label: "Show config", hint: "view current configuration" },
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
          if (!v || !/^FRG-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(v)) {
            return "Invalid format. Expected: FRG-XXXX-XXXX-XXXX";
          }
        },
      });
      if (p.isCancel(key)) return;
      await activate(key);
      break;
    }

    case "install": {
      const plugin = await p.text({
        message: "Plugin name to install:",
        placeholder: "e.g. core, forge-product@1.2.0",
        validate: (v) => {
          if (!v?.trim()) return "Plugin name is required";
        },
      });
      if (p.isCancel(plugin)) return;

      let name = plugin.trim();
      let version: string | undefined;
      if (name.includes("@")) {
        const parts = name.split("@");
        name = parts[0];
        version = parts[1];
      }
      await install(name, version);
      break;
    }

    case "uninstall": {
      const config = loadConfig();
      const installed = Object.keys(config.installed_plugins);

      if (installed.length === 0) {
        p.log.warn("No plugins installed.");
        return;
      }

      const plugin = await p.select({
        message: "Select plugin to uninstall:",
        options: installed.map((name) => ({
          value: name,
          label: name,
          hint: `v${config.installed_plugins[name].version}`,
        })),
      });
      if (p.isCancel(plugin)) return;

      const confirmed = await p.confirm({
        message: `Uninstall ${bold}${plugin}${reset}?`,
      });
      if (p.isCancel(confirmed) || !confirmed) return;

      uninstall(plugin);
      break;
    }

    case "update":
      await update();
      break;

    case "status":
      await status();
      break;

    case "list":
      await list();
      break;

    case "doctor": {
      await doctor();
      break;
    }

    case "config":
      showConfig();
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
    const statusLine = buildStatusLine();
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
