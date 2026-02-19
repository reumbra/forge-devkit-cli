import { activate } from "./commands/activate.js";
import { deactivate } from "./commands/deactivate.js";
import { doctor } from "./commands/doctor.js";
import { install } from "./commands/install.js";
import { list } from "./commands/list.js";
import { status } from "./commands/status.js";
import { update } from "./commands/update.js";
import { log } from "./lib/logger.js";

const VERSION = "0.1.0";

const HELP = `
\x1b[1mForge\x1b[0m — Plugin manager for Claude Code
\x1b[2mhttps://reumbra.dev/forge\x1b[0m

\x1b[1mUsage:\x1b[0m
  forge <command> [options]

\x1b[1mCommands:\x1b[0m
  activate <license-key>     Bind license to this machine
  deactivate                 Unbind this machine (free slot)
  install <plugin> [version] Download and install a plugin
  update [plugin]            Update all or specific plugin
  list                       Show available plugins
  status                     License info: plan, expiry, devices
  doctor                     Run diagnostics

\x1b[1mExamples:\x1b[0m
  forge activate FRG-XXXX-XXXX-XXXX
  forge install core
  forge install forge-product@1.2.0
  forge update
  forge list
  forge status

\x1b[1mOptions:\x1b[0m
  --help, -h     Show this help
  --version, -v  Show version
`;

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    console.log(HELP);
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log(`forge v${VERSION}`);
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

      case "doctor":
        doctor();
        break;

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
