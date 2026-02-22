import { ApiError, apiRequest } from "../lib/api.js";
import { loadConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { badge, banner, createSpinner, table } from "../lib/ui.js";
import type { ForgeConfig, ListResponse, PluginInfo } from "../types.js";

/** Fetch the plugin catalogue from the API. */
export async function fetchPluginList(config: ForgeConfig): Promise<PluginInfo[]> {
  const result = await apiRequest<ListResponse>(config, {
    method: "GET",
    path: "/plugins/list",
  });
  return result.plugins;
}

/** Render a plugin table to stdout. Returns the rows data for reuse. */
export function renderPluginTable(
  plugins: PluginInfo[],
  config: ForgeConfig,
): { rows: string[][]; updatesAvailable: number; installed: number; notInstalled: string[] } {
  let updatesAvailable = 0;
  let installed = 0;
  const notInstalled: string[] = [];

  const rows = plugins.map((plugin) => {
    const inst = config.installed_plugins[plugin.name];
    let status: string;
    if (inst) {
      installed++;
      if (inst.version === plugin.current_version) {
        status = badge("\u2713 up to date", "success");
      } else {
        updatesAvailable++;
        status = badge(`\u2191 ${inst.version} \u2192 ${plugin.current_version}`, "warning");
      }
    } else {
      notInstalled.push(plugin.name);
      status = badge("not installed", "neutral");
    }
    const version = plugin.current_version ? `v${plugin.current_version}` : "\u2014";
    return [plugin.name, version, status, plugin.description];
  });

  console.log(table(rows, { header: ["Plugin", "Version", "Status", "Description"] }));

  return { rows, updatesAvailable, installed, notInstalled };
}

/** CLI command: forge list */
export async function list(): Promise<void> {
  const config = loadConfig();

  if (!config.license_key) {
    log.error("No license key configured. Run `forge activate <key>` first.");
    process.exit(1);
  }

  const spinner = createSpinner("Fetching plugin list...");

  try {
    const plugins = await fetchPluginList(config);

    spinner.stop();
    console.log(`\n${banner()}\n`);

    if (plugins.length === 0) {
      log.info("No plugins available for your plan.");
      return;
    }

    renderPluginTable(plugins, config);
  } catch (err) {
    spinner.stop();
    if (err instanceof ApiError) {
      log.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
