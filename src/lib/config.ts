import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { ForgeConfig } from "../types.js";
import { getMachineId } from "./machine-id.js";
import { CONFIG_PATH, FORGE_DIR, LEGACY_FORGE_DIR, MARKETPLACE_DIR } from "./paths.js";

const DEFAULT_API_URL = "https://api.reumbra.com/velvet";

function defaultConfig(): ForgeConfig {
  return {
    license_key: null,
    machine_id: getMachineId(),
    api_url: process.env.FORGE_API_URL ?? DEFAULT_API_URL,
    installed_plugins: {},
  };
}

/**
 * One-time migration from legacy ~/.forge/ to OS-standard paths.
 * Moves config.json and marketplace dir, then removes legacy dir.
 */
function migrateFromLegacy(): void {
  if (!existsSync(LEGACY_FORGE_DIR) || existsSync(CONFIG_PATH)) return;

  const legacyConfig = join(LEGACY_FORGE_DIR, "config.json");
  const legacyMarketplace = join(LEGACY_FORGE_DIR, "marketplace");

  mkdirSync(FORGE_DIR, { recursive: true });

  if (existsSync(legacyConfig)) {
    cpSync(legacyConfig, CONFIG_PATH);
  }

  if (existsSync(legacyMarketplace) && !existsSync(MARKETPLACE_DIR)) {
    cpSync(legacyMarketplace, MARKETPLACE_DIR, { recursive: true });
  }

  // Clean up legacy dir
  try {
    rmSync(LEGACY_FORGE_DIR, { recursive: true });
  } catch {
    // Best-effort cleanup — don't fail if dir is locked
  }
}

export function loadConfig(): ForgeConfig {
  migrateFromLegacy();

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
      plan: parsed.plan,
      expires_at: parsed.expires_at,
      last_update_check: parsed.last_update_check,
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
