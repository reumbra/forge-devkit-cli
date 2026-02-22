import { afterEach, describe, expect, it, vi } from "vitest";

// Mock child_process.execFile (safe — no shell injection, arguments are array-based)
const mockExecFile = vi.fn();
vi.mock("node:child_process", () => ({
  execFile: mockExecFile,
}));

// Mock version module
const mockCheckForUpdate = vi.fn();
const mockGetVersion = vi.fn().mockReturnValue("1.0.0");
vi.mock("../../src/lib/version.js", () => ({
  checkForUpdate: mockCheckForUpdate,
  getVersion: mockGetVersion,
}));

// Mock @clack/prompts
const mockSpinner = { start: vi.fn(), stop: vi.fn() };
const mockLog = { warn: vi.fn() };
vi.mock("@clack/prompts", () => ({
  spinner: () => mockSpinner,
  log: mockLog,
}));

// Mock styles (no-op)
vi.mock("../../src/lib/styles.js", () => ({
  bold: "",
  cyan: "",
  dim: "",
  green: "",
  red: "",
  reset: "",
  yellow: "",
}));

const { selfUpdate } = await import("../../src/commands/self-update.js");

describe("selfUpdate", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("reports already on latest when no update available", async () => {
    mockCheckForUpdate.mockResolvedValue(null);

    await selfUpdate();

    expect(mockSpinner.stop).toHaveBeenCalledWith(expect.stringContaining("Already on latest"));
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it("reports already on latest when updateAvailable is false", async () => {
    mockCheckForUpdate.mockResolvedValue({
      current: "1.0.0",
      latest: "1.0.0",
      updateAvailable: false,
    });

    await selfUpdate();

    expect(mockSpinner.stop).toHaveBeenCalledWith(expect.stringContaining("Already on latest"));
  });

  it("runs npm install -g on successful update", async () => {
    mockCheckForUpdate.mockResolvedValue({
      current: "1.0.0",
      latest: "2.0.0",
      updateAvailable: true,
    });

    // Simulate successful execFile callback
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], _opts: unknown, cb: (err: Error | null) => void) => {
        cb(null);
      },
    );

    await selfUpdate();

    expect(mockExecFile).toHaveBeenCalledWith(
      expect.stringMatching(/^npm(\.cmd)?$/),
      ["install", "-g", "@reumbra/forge@2.0.0"],
      { timeout: 60_000 },
      expect.any(Function),
    );
    expect(mockSpinner.stop).toHaveBeenCalledWith(expect.stringContaining("Updated to v2.0.0"));
  });

  it("shows fallback message on install failure", async () => {
    mockCheckForUpdate.mockResolvedValue({
      current: "1.0.0",
      latest: "2.0.0",
      updateAvailable: true,
    });

    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], _opts: unknown, cb: (err: Error | null) => void) => {
        cb(new Error("EACCES"));
      },
    );

    await selfUpdate();

    expect(mockSpinner.stop).toHaveBeenCalledWith(expect.stringContaining("Update failed"));
    expect(mockLog.warn).toHaveBeenCalledWith(
      expect.stringContaining("npm install -g @reumbra/forge@2.0.0"),
    );
  });
});
