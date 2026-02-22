import {
  bgBlue,
  bgGreen,
  bgRed,
  bgYellow,
  black,
  bold,
  brightCyan,
  cyan,
  dim,
  green,
  magenta,
  reset,
  visualLength,
  white,
} from "./styles.js";

// ─── Box Drawing ─────────────────────────────────────────────

const BOX = { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" } as const;

export interface BoxOptions {
  title?: string;
  padding?: number;
  borderColor?: string;
  width?: number;
}

export function box(lines: string[], opts: BoxOptions = {}): string {
  const { title, padding = 1, borderColor = dim, width: fixedWidth } = opts;
  const pad = " ".repeat(padding);

  const contentWidth =
    fixedWidth ??
    Math.max(...lines.map((l) => visualLength(l)), title ? visualLength(title) + 2 : 0);
  const innerWidth = contentWidth + padding * 2;

  const bc = borderColor;
  const topLabel = title ? ` ${bold}${title}${reset}${bc} ` : "";
  const topLabelLen = title ? visualLength(title) + 2 : 0;
  const topLine = `${bc}${BOX.tl}${BOX.h.repeat(topLabelLen ? 1 : 0)}${topLabel}${BOX.h.repeat(innerWidth - topLabelLen - (topLabelLen ? 1 : 0))}${BOX.tr}${reset}`;

  const bottomLine = `${bc}${BOX.bl}${BOX.h.repeat(innerWidth)}${BOX.br}${reset}`;

  const body = lines.map((line) => {
    const padRight = contentWidth - visualLength(line);
    return `${bc}${BOX.v}${reset}${pad}${line}${" ".repeat(Math.max(0, padRight))}${pad}${bc}${BOX.v}${reset}`;
  });

  return [topLine, ...body, bottomLine].join("\n");
}

// ─── Spinner ─────────────────────────────────────────────────

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export interface Spinner {
  update(msg: string): void;
  stop(finalMsg?: string): void;
}

export function createSpinner(initialMsg: string): Spinner {
  if (!process.stdout.isTTY) {
    return { update() {}, stop() {} };
  }

  let frame = 0;
  let message = initialMsg;
  let stopped = false;

  const interval = setInterval(() => {
    if (stopped) return;
    const icon = SPINNER_FRAMES[frame % SPINNER_FRAMES.length];
    process.stdout.write(`\r${cyan}${icon}${reset} ${message}\x1b[K`);
    frame++;
  }, 80);

  return {
    update(msg: string) {
      message = msg;
    },
    stop(finalMsg?: string) {
      stopped = true;
      clearInterval(interval);
      process.stdout.write("\r\x1b[K");
      if (finalMsg) {
        process.stdout.write(`${finalMsg}\n`);
      }
    },
  };
}

// ─── Progress Bar ────────────────────────────────────────────

export function progressBar(current: number, total: number, width = 30): string {
  const ratio = Math.min(current / total, 1);
  const filled = Math.round(width * ratio);
  const empty = width - filled;
  const bar = `${green}${"█".repeat(filled)}${dim}${"░".repeat(empty)}${reset}`;
  const pct = `${Math.round(ratio * 100)}%`;
  return `${bar} ${pct}`;
}

// ─── Badges ──────────────────────────────────────────────────

export function badge(
  label: string,
  variant: "success" | "warning" | "error" | "info" | "neutral",
): string {
  const styles: Record<string, string> = {
    success: `${bgGreen}${black}`,
    warning: `${bgYellow}${black}`,
    error: `${bgRed}${white}`,
    info: `${bgBlue}${white}`,
    neutral: `${dim}`,
  };
  return `${styles[variant]} ${label} ${reset}`;
}

export function statusBadge(status: "active" | "expiring" | "expired" | "inactive"): string {
  const map: Record<
    string,
    { label: string; variant: "success" | "warning" | "error" | "neutral" }
  > = {
    active: { label: "✓ active", variant: "success" },
    expiring: { label: "⚠ expiring", variant: "warning" },
    expired: { label: "✗ expired", variant: "error" },
    inactive: { label: "○ inactive", variant: "neutral" },
  };
  const { label, variant } = map[status] ?? map.inactive;
  return badge(label, variant);
}

// ─── Pretty Table ────────────────────────────────────────────

export interface TableOptions {
  header?: string[];
  borderColor?: string;
}

export function table(rows: string[][], opts: TableOptions = {}): string {
  if (rows.length === 0) return "";
  const { header, borderColor = dim } = opts;

  const allRows = header ? [header, ...rows] : rows;
  const colCount = Math.max(...allRows.map((r) => r.length));
  const widths: number[] = [];

  for (let i = 0; i < colCount; i++) {
    widths.push(Math.max(...allRows.map((r) => visualLength(r[i] ?? ""))));
  }

  const bc = borderColor;
  const line = (left: string, mid: string, right: string, fill: string) =>
    `${bc}${left}${widths.map((w) => fill.repeat(w + 2)).join(mid)}${right}${reset}`;

  const row = (cells: string[]) => {
    const padded = cells.map((c, i) => {
      const pad = widths[i] - visualLength(c);
      return ` ${c}${" ".repeat(Math.max(0, pad))} `;
    });
    return `${bc}│${reset}${padded.join(`${bc}│${reset}`)}${bc}│${reset}`;
  };

  const result: string[] = [];
  result.push(line("╭", "┬", "╮", "─"));

  if (header) {
    result.push(row(header.map((h) => `${bold}${h}${reset}`)));
    result.push(line("├", "┼", "┤", "─"));
    for (const r of rows) {
      result.push(row(r));
    }
  } else {
    for (const r of allRows) {
      result.push(row(r));
    }
  }

  result.push(line("╰", "┴", "╯", "─"));
  return result.join("\n");
}

// ─── Divider ─────────────────────────────────────────────────

export function divider(width = 50): string {
  return `${dim}${"─".repeat(width)}${reset}`;
}

// ─── Banner ──────────────────────────────────────────────────

export function banner(): string {
  const gradient = [magenta, brightCyan, cyan];
  const text = "  ⚒  Forge";
  const letters = [...text];
  const colored = letters
    .map((ch, i) => {
      const color = gradient[Math.floor((i / letters.length) * gradient.length)];
      return `${color}${ch}`;
    })
    .join("");

  return `${bold}${colored}${reset} ${dim}— Plugin manager for Claude Code${reset}`;
}
