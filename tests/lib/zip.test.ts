import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import { extractZip } from "../../src/lib/zip.js";

function buildZipBuffer(
  files: Array<{ name: string; content: string; deflate?: boolean }>,
): Buffer {
  const parts: Buffer[] = [];

  for (const file of files) {
    const nameBytes = Buffer.from(file.name, "utf-8");
    const contentBytes = Buffer.from(file.content, "utf-8");
    const method = file.deflate ? 8 : 0;
    const compressed = file.deflate ? deflateRawSync(contentBytes) : contentBytes;

    // Local file header (30 bytes + name + extra)
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); // Signature
    header.writeUInt16LE(20, 4); // Version needed
    header.writeUInt16LE(0, 6); // Flags
    header.writeUInt16LE(method, 8); // Compression method
    header.writeUInt16LE(0, 10); // Mod time
    header.writeUInt16LE(0, 12); // Mod date
    header.writeUInt32LE(0, 14); // CRC-32 (unused by our parser)
    header.writeUInt32LE(compressed.length, 18); // Compressed size
    header.writeUInt32LE(contentBytes.length, 22); // Uncompressed size
    header.writeUInt16LE(nameBytes.length, 26); // File name length
    header.writeUInt16LE(0, 28); // Extra field length

    parts.push(header, nameBytes, compressed);
  }

  return Buffer.concat(parts);
}

describe("extractZip", () => {
  const destDir = join(tmpdir(), `forge-zip-test-${randomUUID()}`);

  afterEach(() => {
    if (existsSync(destDir)) {
      rmSync(destDir, { recursive: true, force: true });
    }
  });

  it("extracts stored (method 0) files", async () => {
    const zip = buildZipBuffer([{ name: "hello.txt", content: "Hello, Forge!" }]);

    await extractZip(zip, destDir);

    const result = readFileSync(join(destDir, "hello.txt"), "utf-8");
    expect(result).toBe("Hello, Forge!");
  });

  it("extracts deflated (method 8) files", async () => {
    const zip = buildZipBuffer([
      { name: "compressed.txt", content: "Deflated content here", deflate: true },
    ]);

    await extractZip(zip, destDir);

    const result = readFileSync(join(destDir, "compressed.txt"), "utf-8");
    expect(result).toBe("Deflated content here");
  });

  it("extracts multiple files", async () => {
    const zip = buildZipBuffer([
      { name: "a.txt", content: "file-a" },
      { name: "b.txt", content: "file-b", deflate: true },
    ]);

    await extractZip(zip, destDir);

    expect(readFileSync(join(destDir, "a.txt"), "utf-8")).toBe("file-a");
    expect(readFileSync(join(destDir, "b.txt"), "utf-8")).toBe("file-b");
  });

  it("creates nested directories", async () => {
    const zip = buildZipBuffer([{ name: "sub/dir/file.txt", content: "nested" }]);

    await extractZip(zip, destDir);

    expect(readFileSync(join(destDir, "sub/dir/file.txt"), "utf-8")).toBe("nested");
  });

  it("handles directory entries", async () => {
    const zip = buildZipBuffer([
      { name: "mydir/", content: "" },
      { name: "mydir/file.txt", content: "inside dir" },
    ]);

    await extractZip(zip, destDir);

    expect(existsSync(join(destDir, "mydir"))).toBe(true);
    expect(readFileSync(join(destDir, "mydir/file.txt"), "utf-8")).toBe("inside dir");
  });
});
