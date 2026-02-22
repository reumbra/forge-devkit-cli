import * as p from "@clack/prompts";
import { Command } from "commander";
import { activate } from "./commands/activate.js";
import { showConfig } from "./commands/config.js";
import { dashboard } from "./commands/dashboard.js";
import { deactivate } from "./commands/deactivate.js";
import { doctor } from "./commands/doctor.js";
import { install } from "./commands/install.js";
import { list } from "./commands/list.js";
import { selfUpdate } from "./commands/self-update.js";
import { status } from "./commands/status.js";
import { uninstall } from "./commands/uninstall.js";
import { update } from "./commands/update.js";
import { loadConfig } from "./lib/config.js";
import { log } from "./lib/logger.js";
import { bold, dim, reset } from "./lib/styles.js";
import { banner } from "./lib/ui.js";
import { getVersion } from "./lib/version.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("forge")
    .version(`forge v${getVersion()}`, "-v, --version")
    .addHelpText("before", `\n${banner()}\n`)
    .addHelpText(
      "after",
      `\n${bold}Examples:${reset}\n  ${dim}$${reset} forge activate FRG-XXXX-XXXX-XXXX\n  ${dim}$${reset} forge install core\n  ${dim}$${reset} forge install forge-product@1.2.0\n  ${dim}$${reset} forge list\n`,
    )
    .usage("[command] [options]")
    .showHelpAfterError('Run "forge --help" for available commands.');

  // Catch-all: no command → interactive dashboard (TTY) or help (non-TTY), unknown → error
  program.argument("[command]").action(async (cmd?: string) => {
    if (!cmd) {
      if (process.stdin.isTTY) {
        await dashboard();
      } else {
        program.help();
      }
    } else {
      log.error(`Unknown command: ${cmd}`);
      log.info('Run "forge --help" for available commands.');
      process.exit(1);
    }
  });

  program
    .command("activate")
    .description("Bind license to this machine")
    .argument("[license-key]", "Forge license key (FRG-XXXX-XXXX-XXXX)")
    .action(async (key?: string) => {
      if (!key) {
        if (!process.stdin.isTTY) {
          log.error("Usage: forge activate <license-key>");
          process.exit(1);
        }
        const input = await p.text({
          message: "Enter your license key:",
          placeholder: "FRG-XXXX-XXXX-XXXX",
          validate: (v) => {
            if (!v || !/^FRG-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(v)) {
              return "Invalid format. Expected: FRG-XXXX-XXXX-XXXX";
            }
          },
        });
        if (p.isCancel(input)) {
          p.cancel("Activation cancelled.");
          process.exit(0);
        }
        key = input;
      }
      await activate(key);
    });

  program
    .command("deactivate")
    .description("Unbind this machine (free a slot)")
    .action(async () => {
      if (process.stdin.isTTY) {
        const confirmed = await p.confirm({
          message: "Deactivate this machine? This will free up a machine slot.",
        });
        if (p.isCancel(confirmed) || !confirmed) {
          p.cancel("Deactivation cancelled.");
          return;
        }
      }
      await deactivate();
    });

  program
    .command("install")
    .description("Download and install a plugin")
    .argument("[plugin]", "Plugin name (e.g. core, forge-product@1.2.0)")
    .argument("[version]", "Specific version")
    .action(async (plugin?: string, version?: string) => {
      if (!plugin) {
        if (!process.stdin.isTTY) {
          log.error("Usage: forge install <plugin> [version]");
          process.exit(1);
        }
        const input = await p.text({
          message: "Plugin name to install:",
          placeholder: "e.g. core, forge-product@1.2.0",
          validate: (v) => {
            if (!v?.trim()) return "Plugin name is required";
          },
        });
        if (p.isCancel(input)) {
          p.cancel("Installation cancelled.");
          process.exit(0);
        }
        plugin = input.trim();
      }

      if (plugin.includes("@")) {
        const [name, ver] = plugin.split("@");
        await install(name, ver);
      } else {
        await install(plugin, version);
      }
    });

  program
    .command("uninstall")
    .alias("remove")
    .description("Remove an installed plugin")
    .argument("[plugin]", "Plugin name to remove")
    .action(async (plugin?: string) => {
      if (!plugin) {
        if (!process.stdin.isTTY) {
          log.error("Usage: forge uninstall <plugin>");
          process.exit(1);
        }

        const config = loadConfig();
        const installed = Object.keys(config.installed_plugins);

        if (installed.length === 0) {
          log.warn("No plugins installed.");
          process.exit(0);
        }

        const selected = await p.select({
          message: "Select plugin to uninstall:",
          options: installed.map((name) => ({
            value: name,
            label: name,
            hint: `v${config.installed_plugins[name].version}`,
          })),
        });
        if (p.isCancel(selected)) {
          p.cancel("Uninstall cancelled.");
          process.exit(0);
        }
        plugin = selected;
      }

      if (process.stdin.isTTY) {
        const confirmed = await p.confirm({
          message: `Uninstall ${bold}${plugin}${reset}?`,
        });
        if (p.isCancel(confirmed) || !confirmed) {
          p.cancel("Uninstall cancelled.");
          return;
        }
      }

      uninstall(plugin);
    });

  program
    .command("update")
    .description("Update all or specific plugin")
    .argument("[plugin]", "Plugin to update (omit for all)")
    .action(async (plugin?: string) => {
      await update(plugin);
    });

  program
    .command("list")
    .alias("ls")
    .description("Show available plugins")
    .action(async () => {
      await list();
    });

  program
    .command("status")
    .description("License info: plan, expiry, devices")
    .action(async () => {
      await status();
    });

  program
    .command("config")
    .description("Show current configuration")
    .action(() => {
      showConfig();
    });

  program
    .command("doctor")
    .description("Run diagnostics")
    .action(async () => {
      const result = await doctor();
      if (result.issues > 0) process.exit(1);
    });

  program
    .command("self-update")
    .description("Update Forge CLI to the latest version")
    .action(async () => {
      await selfUpdate();
    });

  return program;
}

async function main() {
  const program = createProgram();

  try {
    await program.parseAsync();
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes("fetch failed") || err.message.includes("ECONNREFUSED")) {
        log.error("Could not connect to Forge API.");
        log.info("Check your internet connection or try again later.");
      } else {
        log.error(err.message);
      }
    } else {
      log.error("An unexpected error occurred.");
    }
    process.exit(1);
  }
}

main();
