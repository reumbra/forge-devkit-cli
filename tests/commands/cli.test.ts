import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CLI_PATH = join(import.meta.dirname, "..", "..", "bin", "forge.js");

function run(...args: string[]): {
  stdout: string;
  stderr: string;
  output: string;
  exitCode: number;
} {
  try {
    const stdout = execFileSync("node", [CLI_PATH, ...args], {
      encoding: "utf-8",
      timeout: 5000,
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

describe("CLI dispatch", () => {
  it("shows help with --help", () => {
    const { stdout, exitCode } = run("--help");
    expect(exitCode).toBe(0);
    expect(stdout).toContain("forge <command>");
    expect(stdout).toContain("activate");
    expect(stdout).toContain("uninstall");
    expect(stdout).toContain("config");
  });

  it("shows help with -h", () => {
    const { stdout, exitCode } = run("-h");
    expect(exitCode).toBe(0);
    expect(stdout).toContain("forge <command>");
  });

  it("shows help with no arguments", () => {
    const { stdout, exitCode } = run();
    expect(exitCode).toBe(0);
    expect(stdout).toContain("forge <command>");
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

  it("exits 1 for unknown command", () => {
    const { output, exitCode } = run("foobar");
    expect(exitCode).toBe(1);
    expect(output).toContain("Unknown command: foobar");
  });

  it("exits 1 for activate without key", () => {
    const { exitCode } = run("activate");
    expect(exitCode).toBe(1);
  });

  it("exits 1 for install without plugin", () => {
    const { exitCode } = run("install");
    expect(exitCode).toBe(1);
  });

  it("exits 1 for uninstall without plugin", () => {
    const { exitCode } = run("uninstall");
    expect(exitCode).toBe(1);
  });

  it("doctor runs and checks Node.js", () => {
    const { output } = run("doctor");
    expect(output).toContain("Diagnostics");
    expect(output).toContain("Node.js");
  });

  it("accepts 'ls' as alias for 'list'", () => {
    // Will fail with "No license key" but that means routing worked
    const { output, exitCode } = run("ls");
    expect(exitCode).toBe(1);
    expect(output).toContain("No license key");
  });

  it("accepts 'remove' as alias for 'uninstall'", () => {
    const { exitCode } = run("remove");
    expect(exitCode).toBe(1);
  });
});
