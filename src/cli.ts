import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

function showHelp(): void {
  console.log(`
${banner()}

${bold}Usage:${reset}
  forge <command> [options]

${bold}Commands:${reset}
  ${bold}activate${reset} <license-key>     Bind license to this machine
  ${bold}deactivate${reset}                 Unbind this machine (free slot)
  ${bold}install${reset} <plugin> [version] Download and install a plugin
  ${bold}uninstall${reset} <plugin>         Remove an installed plugin
  ${bold}update${reset} [plugin]            Update all or specific plugin
  ${bold}list${reset}                       Show available plugins
  ${bold}status${reset}                     License info: plan, expiry, devices
  ${bold}config${reset}                     Show current configuration
  ${bold}doctor${reset}                     Run diagnostics

${bold}Examples:${reset}
  ${dim}$${reset} forge activate FRG-XXXX-XXXX-XXXX
  ${dim}$${reset} forge install core
  ${dim}$${reset} forge install forge-product@1.2.0
  ${dim}$${reset} forge list

${bold}Options:${reset}
  --help, -h     Show this help
  --version, -v  Show version
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    showHelp();
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log(`forge v${getVersion()}`);
    return;
  }

  try {
    switch (command) {
      case "activate": {
        const key = args[1];
        if (!key) {
          log.error("Usage: forge activate <license-key>");
          process.exit(1);
        }
        await activate(key);
        break;
      }

      case "deactivate":
        await deactivate();
        break;

      case "install": {
        let plugin = args[1];
        let version: string | undefined;

        if (!plugin) {
          log.error("Usage: forge install <plugin> [version]");
          process.exit(1);
        }

        // Support plugin@version syntax
        if (plugin.includes("@")) {
          const parts = plugin.split("@");
          plugin = parts[0];
          version = parts[1];
        } else {
          version = args[2];
        }

        await install(plugin, version);
        break;
      }

      case "uninstall":
      case "remove": {
        const plugin = args[1];
        if (!plugin) {
          log.error("Usage: forge uninstall <plugin>");
          process.exit(1);
        }
        uninstall(plugin);
        break;
      }

      case "update":
        await update(args[1]);
        break;

      case "list":
      case "ls":
        await list();
        break;

      case "status":
        await status();
        break;

      case "config":
        showConfig();
        break;

      case "doctor": {
        const result = await doctor();
        if (result.issues > 0) process.exit(1);
        break;
      }

      default:
        log.error(`Unknown command: ${command}`);
        log.info("Run `forge --help` for available commands.");
        process.exit(1);
    }
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
