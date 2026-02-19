import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { activate } from "./commands/activate.js";
import { showConfig } from "./commands/config.js";
import { deactivate } from "./commands/deactivate.js";
import { doctor } from "./commands/doctor.js";
import { install } from "./commands/install.js";
import { list } from "./commands/list.js";
import { status } from "./commands/status.js";
import { uninstall } from "./commands/uninstall.js";
import { update } from "./commands/update.js";
import { log } from "./lib/logger.js";
import { bold, dim, reset } from "./lib/styles.js";
import { banner } from "./lib/ui.js";

function getVersion(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
  return pkg.version;
}

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

  // Catch-all: no command → help, unknown command → error
  program.argument("[command]").action((cmd?: string) => {
    if (!cmd) {
      program.help();
    } else {
      log.error(`Unknown command: ${cmd}`);
      log.info('Run "forge --help" for available commands.');
      process.exit(1);
    }
  });

  program
    .command("activate")
    .description("Bind license to this machine")
    .argument("<license-key>", "Forge license key (FRG-XXXX-XXXX-XXXX)")
    .action(async (key: string) => {
      await activate(key);
    });

  program
    .command("deactivate")
    .description("Unbind this machine (free a slot)")
    .action(async () => {
      await deactivate();
    });

  program
    .command("install")
    .description("Download and install a plugin")
    .argument("<plugin>", "Plugin name (e.g. core, forge-product@1.2.0)")
    .argument("[version]", "Specific version")
    .action(async (plugin: string, version?: string) => {
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
    .argument("<plugin>", "Plugin name to remove")
    .action((plugin: string) => {
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
