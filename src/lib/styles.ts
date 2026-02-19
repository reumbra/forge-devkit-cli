// ANSI escape codes — zero dependency styling
const isColorSupported = process.env.NO_COLOR == null && process.env.TERM !== "dumb";

function code(n: string): string {
  return isColorSupported ? `\x1b[${n}m` : "";
}

// Reset
export const reset = code("0");

// Modifiers
export const bold = code("1");
export const dim = code("2");
export const italic = code("3");
export const underline = code("4");
export const inverse = code("7");
export const strikethrough = code("9");

// Colors
export const black = code("30");
export const red = code("31");
export const green = code("32");
export const yellow = code("33");
export const blue = code("34");
export const magenta = code("35");
export const cyan = code("36");
export const white = code("37");
export const gray = code("90");

// Bright colors
export const brightRed = code("91");
export const brightGreen = code("92");
export const brightYellow = code("93");
export const brightBlue = code("94");
export const brightMagenta = code("95");
export const brightCyan = code("96");

// Background colors
export const bgRed = code("41");
export const bgGreen = code("42");
export const bgYellow = code("43");
export const bgBlue = code("44");
export const bgMagenta = code("45");
export const bgCyan = code("46");
export const bgWhite = code("47");
export const bgGray = code("100");

// Strip ANSI codes for length calculation
// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences require control chars
const ANSI_REGEX = /\x1b\[\d+m/g;
export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, "");
}

export function visualLength(str: string): number {
  return stripAnsi(str).length;
}
