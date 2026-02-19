import { createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createInflateRaw } from "node:zlib";

/**
 * Extract a zip buffer to a directory.
 * Uses Node.js built-in zlib — works for simple zip files.
 * For complex zips (multiple entries), we parse the zip format manually.
 */
export async function extractZip(zipBuffer: Buffer, destDir: string): Promise<void> {
  mkdirSync(destDir, { recursive: true });

  // Parse ZIP Central Directory
  const entries = parseZipEntries(zipBuffer);

  for (const entry of entries) {
    const fullPath = join(destDir, entry.name);

    if (entry.name.endsWith("/")) {
      mkdirSync(fullPath, { recursive: true });
      continue;
    }

    // Ensure parent dir exists
    mkdirSync(join(fullPath, ".."), { recursive: true });

    if (entry.compressionMethod === 0) {
      // Stored (no compression)
      const data = zipBuffer.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);
      const readable = Readable.from(data);
      await pipeline(readable, createWriteStream(fullPath));
    } else if (entry.compressionMethod === 8) {
      // Deflated
      const data = zipBuffer.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);
      const readable = Readable.from(data);
      const inflate = createInflateRaw();
      await pipeline(readable, inflate, createWriteStream(fullPath));
    }
  }
}

interface ZipEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  dataOffset: number;
}

function parseZipEntries(buf: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  let offset = 0;

  while (offset < buf.length - 4) {
    const sig = buf.readUInt32LE(offset);
    if (sig !== 0x04034b50) break; // Local file header signature

    const compressionMethod = buf.readUInt16LE(offset + 8);
    const compressedSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString("utf-8");
    const dataOffset = offset + 30 + nameLen + extraLen;

    entries.push({ name, compressionMethod, compressedSize, dataOffset });
    offset = dataOffset + compressedSize;
  }

  return entries;
}
