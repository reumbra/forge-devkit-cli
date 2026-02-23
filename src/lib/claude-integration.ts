import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { claudeKnownMarketplacesPath, claudeSettingsPath, MARKETPLACE_DIR } from "./paths.js";

const MARKETPLACE_NAME = "reumbra";

// --- known_marketplaces.json ---

export function registerMarketplace(): void {
  const filePath = claudeKnownMarketplacesPath();
  const data = readJsonSafe<Record<string, unknown>>(filePath, {});

  if (data[MARKETPLACE_NAME]) return; // already registered

  data[MARKETPLACE_NAME] = {
    source: {
      source: "directory",
      path: MARKETPLACE_DIR,
    },
    installLocation: MARKETPLACE_DIR,
    lastUpdated: new Date().toISOString(),
  };

  writeJsonSafe(filePath, data);
}

export function removeMarketplace(): void {
  const filePath = claudeKnownMarketplacesPath();
  if (!existsSync(filePath)) return;

  const data = readJsonSafe<Record<string, unknown>>(filePath, {});
  delete data[MARKETPLACE_NAME];
  writeJsonSafe(filePath, data);
}

// --- settings.json → enabledPlugins ---

export function enablePlugin(pluginName: string): void {
  const filePath = claudeSettingsPath();
  const data = readJsonSafe<Record<string, unknown>>(filePath, {});

  if (!data.enabledPlugins || typeof data.enabledPlugins !== "object") {
    data.enabledPlugins = {};
  }

  (data.enabledPlugins as Record<string, boolean>)[`${pluginName}@${MARKETPLACE_NAME}`] = true;
  writeJsonSafe(filePath, data);
}

export function disablePlugin(pluginName: string): void {
  const filePath = claudeSettingsPath();
  if (!existsSync(filePath)) return;

  const data = readJsonSafe<Record<string, unknown>>(filePath, {});
  const enabled = data.enabledPlugins as Record<string, boolean> | undefined;
  if (!enabled) return;

  delete enabled[`${pluginName}@${MARKETPLACE_NAME}`];
  writeJsonSafe(filePath, data);
}

export function isPluginEnabled(pluginName: string): boolean {
  const filePath = claudeSettingsPath();
  if (!existsSync(filePath)) return false;

  const data = readJsonSafe<Record<string, unknown>>(filePath, {});
  const enabled = data.enabledPlugins as Record<string, boolean> | undefined;
  return enabled?.[`${pluginName}@${MARKETPLACE_NAME}`] === true;
}

// --- JSON helpers ---

function readJsonSafe<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJsonSafe(filePath: string, data: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}
