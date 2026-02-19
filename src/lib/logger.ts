import { bold, cyan, dim, green, red, reset, visualLength, yellow } from "./styles.js";

export const log = {
  info(msg: string) {
    console.log(`${cyan}i${reset} ${msg}`);
  },

  success(msg: string) {
    console.log(`${green}✓${reset} ${msg}`);
  },

  warn(msg: string) {
    console.log(`${yellow}!${reset} ${msg}`);
  },

  error(msg: string) {
    console.error(`${red}✗${reset} ${msg}`);
  },

  step(msg: string) {
    console.log(`${dim}→${reset} ${msg}`);
  },

  header(msg: string) {
    console.log(`\n${bold}${msg}${reset}`);
  },

  plain(msg: string) {
    console.log(msg);
  },

  /** Simple key-value table (no borders). Use ui.table() for bordered tables. */
  table(rows: string[][]) {
    if (rows.length === 0) return;
    const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => visualLength(r[i] ?? ""))));
    for (const row of rows) {
      const line = row
        .map((cell, i) => {
          const pad = widths[i] - visualLength(cell);
          return cell + " ".repeat(Math.max(0, pad));
        })
        .join("  ");
      console.log(`  ${line}`);
    }
  },
};
