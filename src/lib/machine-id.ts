import { createHash } from "node:crypto";
import { hostname, platform, userInfo } from "node:os";

/**
 * Deterministic machine ID: SHA256(hostname|platform|username).
 * Full 64-char hex digest — must match Tauri app and API expectations.
 */
export function getMachineId(): string {
  const raw = `${hostname()}|${platform()}|${userInfo().username}`;
  return createHash("sha256").update(raw).digest("hex");
}
