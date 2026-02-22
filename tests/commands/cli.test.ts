import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CLI_PATH = join(import.meta.dirname, "..", "..", "bin", "forge.js");

function run(...argsAndOpts: [...string[], { timeout?: number }] | string[]): {
  stdout: string;
  stderr: string;
  output: string;
  exitCode: number;
} {
  let timeout = 5000;
  let args: string[];
  const last = argsAndOpts[argsAndOpts.length - 1];
  if (typeof last === "object" && last !== null && "timeout" in last) {
    timeout = (last as { timeout?: number }).timeout ?? 5000;
    args = argsAndOpts.slice(0, -1) as string[];
  } else {
    args = argsAndOpts as string[];
  }
  try {
    const stdout = execFileSync("node", [CLI_PATH, ...args], {
      encoding: "utf-8",
      timeout,
      env: { ...process.env, NO_COLOR: "1" },
    });
    return { stdout, stderr: "", output: stdout, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    const stdout = e.stdout ?? "";
    const stderr = e.stderr ?? "";
    return { stdout, stderr, output: stdout + stderr, exitCode: e.status ?? 1 };
  }
}

describe("CLI dispatch (Commander + interactive)", () => {
  // Help & version
  it("shows help with --help", () => {
    const { stdout, exitCode } = run("--help");
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage: forge");
    expect(stdout).toContain("activate");
    expect(stdout).toContain("uninstall");
    expect(stdout).toContain("config");
    expect(stdout).toContain("doctor");
    expect(stdout).toContain("Examples:");
  });

  it("shows help with -h", () => {
    const { stdout, exitCode } = run("-h");
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage: forge");
  });

  it("shows help with no arguments (non-TTY fallback)", () => {
    // Non-TTY (piped execFileSync) → shows help instead of dashboard
    const { stdout, exitCode } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage: forge");
  });

  it("shows version with --version", () => {
    const { stdout, exitCode } = run("--version");
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/^forge v\d+\.\d+\.\d+/);
  });

  it("shows version with -v", () => {
    const { stdout, exitCode } = run("-v");
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/^forge v\d+\.\d+\.\d+/);
  });

  // Unknown command
  it("exits 1 for unknown command", () => {
    const { output, exitCode } = run("foobar");
    expect(exitCode).toBe(1);
    expect(output).toContain("Unknown command: foobar");
  });

  // Missing args (non-TTY → error with usage hint)
  it("exits 1 for activate without key (non-TTY)", () => {
    const { output, exitCode } = run("activate");
    expect(exitCode).toBe(1);
    expect(output).toContain("Usage: forge activate");
  });

  it("exits 1 for install without plugin (non-TTY)", () => {
    const { output, exitCode } = run("install");
    expect(exitCode).toBe(1);
    expect(output).toContain("Usage: forge install");
  });

  it("exits 1 for uninstall without plugin (non-TTY)", () => {
    const { output, exitCode } = run("uninstall");
    expect(exitCode).toBe(1);
    expect(output).toContain("Usage: forge uninstall");
  });

  // Commands that work
  it("doctor runs and checks Node.js", () => {
    const { output } = run("doctor", { timeout: 30000 });
    expect(output).toContain("Diagnostics");
    expect(output).toContain("Node.js");
  }, 35000);

  // Aliases
  it("accepts 'ls' as alias for 'list'", () => {
    const { output } = run("ls", { timeout: 30000 });
    expect(output).not.toContain("Unknown command");
  }, 35000);

  it("accepts 'remove' as alias for 'uninstall' (non-TTY → error)", () => {
    const { output, exitCode } = run("remove");
    expect(exitCode).toBe(1);
    expect(output).toContain("Usage: forge uninstall");
  });

  it("shows aliases in help (ls, remove)", () => {
    const { stdout } = run("--help");
    expect(stdout).toContain("list|ls");
    expect(stdout).toContain("uninstall|remove");
  });

  // Self-update
  it("shows self-update in help", () => {
    const { stdout } = run("--help");
    expect(stdout).toContain("self-update");
  });

  it("self-update command is recognized", () => {
    const { output, exitCode } = run("self-update", { timeout: 15000 });
    // Should not fail as "unknown command" — it either succeeds or fails due to network
    expect(output).not.toContain("Unknown command");
    // Exit code 0 means it ran (reported "already on latest" or similar)
    // Non-zero could mean network timeout, but command was recognized
    expect(exitCode === 0 || !output.includes("Unknown command")).toBe(true);
  }, 20000);
});
