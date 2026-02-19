import { createHash } from "node:crypto";
import { hostname, platform, userInfo } from "node:os";

/**
 * Deterministic machine ID: SHA256(hostname + platform + username).
 * Same machine always produces the same ID.
 */
export function getMachineId(): string {
  const raw = `${hostname()}|${platform()}|${userInfo().username}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}
