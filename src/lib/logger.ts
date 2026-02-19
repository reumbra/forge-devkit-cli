const reset = "\x1b[0m";
const bold = "\x1b[1m";
const dim = "\x1b[2m";
const red = "\x1b[31m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const cyan = "\x1b[36m";

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

  table(rows: string[][]) {
    if (rows.length === 0) return;
    const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => (r[i] ?? "").length)));
    for (const row of rows) {
      const line = row.map((cell, i) => cell.padEnd(widths[i])).join("  ");
      console.log(`  ${line}`);
    }
  },
};
