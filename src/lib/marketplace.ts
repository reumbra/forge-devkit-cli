import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MARKETPLACE_DIR } from "./paths.js";

interface MarketplacePlugin {
  name: string;
  source: string;
  description: string;
  version: string;
}

interface MarketplaceJson {
  name: string;
  owner: { name: string; email: string };
  plugins: MarketplacePlugin[];
}

const MARKETPLACE_JSON_PATH = join(MARKETPLACE_DIR, ".claude-plugin", "marketplace.json");

const DEFAULT_MARKETPLACE: MarketplaceJson = {
  name: "reumbra",
  owner: { name: "Reumbra", email: "support@reumbra.dev" },
  plugins: [],
};

export function ensureMarketplaceDir(): void {
  mkdirSync(join(MARKETPLACE_DIR, ".claude-plugin"), { recursive: true });
  mkdirSync(join(MARKETPLACE_DIR, "plugins"), { recursive: true });

  if (!existsSync(MARKETPLACE_JSON_PATH)) {
    writeFileSync(MARKETPLACE_JSON_PATH, `${JSON.stringify(DEFAULT_MARKETPLACE, null, 2)}\n`);
  }
}

export function readMarketplaceJson(): MarketplaceJson {
  if (!existsSync(MARKETPLACE_JSON_PATH)) {
    return { ...DEFAULT_MARKETPLACE, plugins: [] };
  }
  try {
    return JSON.parse(readFileSync(MARKETPLACE_JSON_PATH, "utf-8")) as MarketplaceJson;
  } catch {
    return { ...DEFAULT_MARKETPLACE, plugins: [] };
  }
}

export function updateMarketplaceJson(
  pluginName: string,
  description: string,
  version: string,
): void {
  const data = readMarketplaceJson();
  const idx = data.plugins.findIndex((p) => p.name === pluginName);
  const entry: MarketplacePlugin = {
    name: pluginName,
    source: `./plugins/${pluginName}`,
    description,
    version,
  };

  if (idx >= 0) {
    data.plugins[idx] = entry;
  } else {
    data.plugins.push(entry);
  }

  writeFileSync(MARKETPLACE_JSON_PATH, `${JSON.stringify(data, null, 2)}\n`);
}

export function removeFromMarketplace(pluginName: string): void {
  const data = readMarketplaceJson();
  data.plugins = data.plugins.filter((p) => p.name !== pluginName);
  writeFileSync(MARKETPLACE_JSON_PATH, `${JSON.stringify(data, null, 2)}\n`);
}

/** Path to the plugins subdirectory inside the marketplace */
export function marketplacePluginDir(pluginName: string): string {
  return join(MARKETPLACE_DIR, "plugins", pluginName);
}
