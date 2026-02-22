import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface UpdateInfo {
  current: string;
  latest: string;
  updateAvailable: boolean;
}

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

export function getVersion(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(__dirname, "..", "..", "package.json"), "utf-8"));
  return pkg.version;
}

/** Compare two semver strings. Returns -1 | 0 | 1 (a < b, a == b, a > b). */
export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

export function shouldCheck(lastCheckIso?: string): boolean {
  if (!lastCheckIso) return true;
  const last = new Date(lastCheckIso).getTime();
  return Date.now() - last >= CHECK_INTERVAL_MS;
}

export async function fetchLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch("https://registry.npmjs.org/@reumbra/forge/latest", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

export async function checkForUpdate(lastCheckIso?: string): Promise<UpdateInfo | null> {
  if (!shouldCheck(lastCheckIso)) return null;

  const latest = await fetchLatestVersion();
  if (!latest) return null;

  const current = getVersion();
  return {
    current,
    latest,
    updateAvailable: compareSemver(latest, current) > 0,
  };
}
