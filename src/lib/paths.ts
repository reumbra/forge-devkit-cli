import { homedir } from "node:os";
import { join } from "node:path";

/** Root: ~/.forge/ */
export const FORGE_DIR = join(homedir(), ".forge");

/** Config: ~/.forge/config.json */
export const CONFIG_PATH = join(FORGE_DIR, "config.json");

/** Cache dir: ~/.forge/cache/ */
export const CACHE_DIR = join(FORGE_DIR, "cache");

/** Claude Code plugin directory */
export function claudePluginDir(): string {
  return join(homedir(), ".claude", "plugins");
}
