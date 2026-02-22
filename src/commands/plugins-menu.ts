import * as p from "@clack/prompts";
import { ApiError } from "../lib/api.js";
import { loadConfig } from "../lib/config.js";
import { bold, dim, reset } from "../lib/styles.js";
import { createSpinner } from "../lib/ui.js";
import { install } from "./install.js";
import { fetchPluginList, renderPluginTable } from "./list.js";
import { uninstall } from "./uninstall.js";
import { update } from "./update.js";

type PluginAction = "install" | "update" | "uninstall" | "back";

export async function pluginsMenu(): Promise<void> {
  while (true) {
    const config = loadConfig();

    // Attempt to load plugin catalogue from API
    let updatesAvailable = 0;
    let installedCount = 0;
    let notInstalledNames: string[] = [];
    let apiAvailable = true;

    const spinner = createSpinner("Loading plugins\u2026");
    try {
      const plugins = await fetchPluginList(config);
      spinner.stop();

      if (plugins.length === 0) {
        p.log.info("No plugins available for your plan.");
        return;
      }

      console.log();
      const result = renderPluginTable(plugins, config);
      updatesAvailable = result.updatesAvailable;
      installedCount = result.installed;
      notInstalledNames = result.notInstalled;
    } catch (err) {
      spinner.stop();
      apiAvailable = false;

      if (err instanceof ApiError) {
        p.log.warn(`API unavailable: ${err.message}`);
      } else {
        p.log.warn("Could not reach Forge API. Showing local data only.");
      }

      // Fallback: show installed plugins from config
      installedCount = Object.keys(config.installed_plugins).length;
      if (installedCount > 0) {
        const rows = Object.entries(config.installed_plugins).map(([name, info]) => [
          name,
          `v${info.version}`,
        ]);
        for (const [name, ver] of rows) {
          p.log.info(`  ${name}  ${dim}${ver}${reset}`);
        }
      } else {
        p.log.info("No plugins installed.");
      }
    }

    // Build adaptive menu
    const options: { value: PluginAction; label: string; hint?: string }[] = [];

    if (apiAvailable && notInstalledNames.length > 0) {
      options.push({
        value: "install",
        label: "Install a plugin",
        hint: `${notInstalledNames.length} available`,
      });
    }

    if (apiAvailable && installedCount > 0) {
      options.push({
        value: "update",
        label: "Update all",
        hint: updatesAvailable > 0 ? `${updatesAvailable} update available` : "all up to date",
      });
    }

    if (installedCount > 0) {
      options.push({
        value: "uninstall",
        label: "Uninstall a plugin",
        hint: `${installedCount} installed`,
      });
    }

    options.push({ value: "back", label: `${dim}\u2190 Back${reset}` });

    const action = await p.select<PluginAction>({
      message: "Plugin action:",
      options,
    });

    if (p.isCancel(action) || action === "back") return;

    console.log();

    switch (action) {
      case "install": {
        const selected = await p.select({
          message: "Select plugin to install:",
          options: notInstalledNames.map((name) => ({ value: name, label: name })),
        });
        if (p.isCancel(selected)) break;
        await install(selected);
        break;
      }

      case "update":
        await update();
        break;

      case "uninstall": {
        const cfg = loadConfig();
        const installed = Object.keys(cfg.installed_plugins);
        const selected = await p.select({
          message: "Select plugin to uninstall:",
          options: installed.map((name) => ({
            value: name,
            label: name,
            hint: `v${cfg.installed_plugins[name].version}`,
          })),
        });
        if (p.isCancel(selected)) break;

        const confirmed = await p.confirm({
          message: `Uninstall ${bold}${selected}${reset}?`,
        });
        if (p.isCancel(confirmed) || !confirmed) break;
        uninstall(selected);
        break;
      }
    }

    console.log();
  }
}
