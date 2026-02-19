import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ForgeConfig } from "../types.js";
import { getMachineId } from "./machine-id.js";
import { CONFIG_PATH, FORGE_DIR } from "./paths.js";

const DEFAULT_API_URL = "https://api.reumbra.dev";

function defaultConfig(): ForgeConfig {
  return {
    license_key: null,
    machine_id: getMachineId(),
    api_url: process.env.FORGE_API_URL ?? DEFAULT_API_URL,
    installed_plugins: {},
  };
}

export function loadConfig(): ForgeConfig {
  if (!existsSync(CONFIG_PATH)) {
    return defaultConfig();
  }

  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<ForgeConfig>;
    const defaults = defaultConfig();
    return {
      license_key: parsed.license_key ?? defaults.license_key,
      machine_id: parsed.machine_id ?? defaults.machine_id,
      api_url: parsed.api_url ?? defaults.api_url,
      installed_plugins: parsed.installed_plugins ?? defaults.installed_plugins,
    };
  } catch {
    return defaultConfig();
  }
}

export function saveConfig(config: ForgeConfig): void {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
}

export function ensureForgeDir(): void {
  mkdirSync(FORGE_DIR, { recursive: true });
}
