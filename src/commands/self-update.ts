import { execFile } from "node:child_process";
import * as p from "@clack/prompts";
import { bold, cyan, dim, green, red, reset, yellow } from "../lib/styles.js";
import { checkForUpdate, getVersion } from "../lib/version.js";

export async function selfUpdate(): Promise<void> {
  const s = p.spinner();
  s.start("Checking for updates…");

  const info = await checkForUpdate();

  if (!info || !info.updateAvailable) {
    s.stop(`${green}Already on latest${reset} ${dim}v${getVersion()}${reset}`);
    return;
  }

  s.stop(
    `${yellow}Update available${reset}  ${dim}v${info.current}${reset} → ${cyan}v${info.latest}${reset}`,
  );

  const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";

  const installSpinner = p.spinner();
  installSpinner.start(`Installing ${bold}@reumbra/forge@${info.latest}${reset}…`);

  try {
    await new Promise<void>((resolve, reject) => {
      execFile(
        npmBin,
        ["install", "-g", `@reumbra/forge@${info.latest}`],
        { timeout: 60_000 },
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    installSpinner.stop(`${green}Updated to v${info.latest}${reset}`);
  } catch {
    installSpinner.stop(`${red}Update failed${reset}`);
    p.log.warn(`Run manually:\n  ${dim}$${reset} npm install -g @reumbra/forge@${info.latest}`);
  }
}
