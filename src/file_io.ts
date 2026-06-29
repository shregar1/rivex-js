/**
 * File/IO utilities — checksums, ZIP, PDF text extraction, MIME sniffing, image dimensions.
 *
 * Uses Node.js built-in `node:crypto` and `node:zlib` (no native dependencies).
 */

import { createHash } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";

// ── CRC32 lookup table ──────────────────────────────────────────────

const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC32_TABLE[i] = c;
}

// ── Checksums ───────────────────────────────────────────────────────

/**
 * Compute MD5 hex digest of data.
 */
export function checksumMd5(data: Buffer): string {
  return createHash("md5").update(data).digest("hex");
}

/**
 * Compute SHA-256 hex digest of data.
 */
export function checksumSha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Compute CRC32 checksum of data.
 */
export function checksumCrc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ── ZIP ────────────────────────────────────────────────────────────

interface ZipEntry {
  path: string;
  data: Buffer;
}

/**
 * Create a minimal ZIP archive from an array of entries.
 *
 * Uses DEFLATE compression via Node.js built-in zlib.
 * Implements the ZIP file format (local file headers + central directory + end record).
 */
export function zipCreate(entries: ZipEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const pathBuf = Buffer.from(entry.path, "utf-8");
    const uncompressedData = entry.data;
    const crc = checksumCrc32(uncompressedData);

    // Compress
    const compressed = deflateRawSync(uncompressedData);

    // Use compression if it's actually smaller, otherwise store
    const useDeflate = compressed.length < uncompressedData.length;
    const storedData = useDeflate ? compressed : uncompressedData;
    const method = useDeflate ? 8 : 0; // 8 = DEFLATE, 0 = STORED

    // Local file header (30 bytes fixed + path + data)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);    // signature
    localHeader.writeUInt16LE(20, 4);             // version needed (2.0)
    localHeader.writeUInt16LE(0, 6);              // general purpose flag
    localHeader.writeUInt16LE(method, 8);         // compression method
    localHeader.writeUInt16LE(0, 10);             // mod time
    localHeader.writeUInt16LE(0, 12);             // mod date
    localHeader.writeUInt32LE(crc, 14);           // CRC-32
    localHeader.writeUInt32LE(storedData.length, 18);  // compressed size
    localHeader.writeUInt32LE(uncompressedData.length, 22); // uncompressed size
    localHeader.writeUInt16LE(pathBuf.length, 26); // filename length
    localHeader.writeUInt16LE(0, 28);              // extra field length

    localHeaders.push(localHeader, pathBuf, storedData);

    // Central directory header (46 bytes fixed + path)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);   // signature
    centralHeader.writeUInt16LE(20, 4);            // version made by
    centralHeader.writeUInt16LE(20, 6);            // version needed
    centralHeader.writeUInt16LE(0, 8);             // general purpose flag
    centralHeader.writeUInt16LE(method, 10);       // compression method
    centralHeader.writeUInt16LE(0, 12);            // mod time
    centralHeader.writeUInt16LE(0, 14);            // mod date
    centralHeader.writeUInt32LE(crc, 16);          // CRC-32
    centralHeader.writeUInt32LE(storedData.length, 20);  // compressed size
    centralHeader.writeUInt32LE(uncompressedData.length, 24); // uncompressed size
    centralHeader.writeUInt16LE(pathBuf.length, 28); // filename length
    centralHeader.writeUInt16LE(0, 30);              // extra field length
    centralHeader.writeUInt16LE(0, 32);              // file comment length
    centralHeader.writeUInt16LE(0, 34);              // disk number start
    centralHeader.writeUInt16LE(0, 36);              // internal file attributes
    centralHeader.writeUInt32LE(0, 38);              // external file attributes
    centralHeader.writeUInt32LE(offset, 42);         // relative offset of local header

    centralHeaders.push(centralHeader, pathBuf);

    offset += localHeader.length + pathBuf.length + storedData.length;
  }

  const centralDirOffset = offset;
  const centralDirParts = Buffer.concat(centralHeaders);
  const centralDirSize = centralDirParts.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);            // signature
  eocd.writeUInt16LE(0, 4);                     // disk number
  eocd.writeUInt16LE(0, 6);                     // disk with central dir
  eocd.writeUInt16LE(entries.length, 8);        // entries on this disk
  eocd.writeUInt16LE(entries.length, 10);       // total entries
  eocd.writeUInt32LE(centralDirSize, 12);       // central dir size
  eocd.writeUInt32LE(centralDirOffset, 16);     // offset of central dir
  eocd.writeUInt16LE(0, 20);                    // comment length

  return Buffer.concat([...localHeaders, centralDirParts, eocd]);
}

/**
 * Extract entries from a ZIP archive.
 *
 * Parses the ZIP file format and decompresses DEFLATE-compressed entries.
 *
 * @returns Array of {path, data} entries
 */
export function zipExtract(data: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  let pos = 0;

  while (pos + 4 <= data.length) {
    const sig = data.readUInt32LE(pos);

    // Local file header signature
    if (sig !== 0x04034b50) break;

    if (pos + 30 > data.length) break;

    const method = data.readUInt16LE(pos + 8);
    const compressedSize = data.readUInt32LE(pos + 18);
    const uncompressedSize = data.readUInt32LE(pos + 22);
    const nameLen = data.readUInt16LE(pos + 26);
    const extraLen = data.readUInt16LE(pos + 28);

    const nameStart = pos + 30;
    const nameEnd = nameStart + nameLen;
    const filePath = data.subarray(nameStart, nameEnd).toString("utf-8");

    const dataStart = nameEnd + extraLen;
    const dataEnd = dataStart + compressedSize;
    const rawData = data.subarray(dataStart, dataEnd);

    let fileData: Buffer;
    if (method === 0) {
      // STORED
      fileData = Buffer.from(rawData);
    } else if (method === 8) {
      // DEFLATE
      fileData = inflateRawSync(rawData);
      // Verify uncompressed size
      if (fileData.length !== uncompressedSize) {
        fileData = fileData.subarray(0, uncompressedSize);
      }
    } else {
      // Unsupported compression — store raw
      fileData = Buffer.from(rawData);
    }

    // Skip directory entries (paths ending in /)
    if (!filePath.endsWith("/")) {
      entries.push({ path: filePath, data: fileData });
    }

    pos = dataEnd;
  }

  return entries;
}

// ── PDF Text Extraction ────────────────────────────────────────────

/**
 * Extract text from a PDF buffer.
 *
 * Performs simple extraction of parenthesized text strings from the PDF.
 * Handles basic escape sequences and hex strings.
 * This is not a full PDF parser — it works best with simple, text-based PDFs.
 */
export function pdfExtractText(data: Buffer): string {
  const content = data.toString("latin1");
  const texts: string[] = [];

  // Extract text from BT...ET blocks (text objects) and parenthesized strings
  let i = 0;
  while (i < content.length) {
    // Parenthesized string literals
    if (content[i] === "(") {
      let depth = 1;
      let text = "";
      i++;
      while (i < content.length && depth > 0) {
        if (content[i] === "\\") {
          i++;
          if (i >= content.length) break;
          const esc = content[i];
          if (esc === "n") text += "\n";
          else if (esc === "r") text += "\r";
          else if (esc === "t") text += "\t";
          else if (esc === "b") text += "\b";
          else if (esc === "f") text += "\f";
          else if (esc === "(") text += "(";
          else if (esc === ")") text += ")";
          else if (esc === "\\") text += "\\";
          else if (/[0-7]/.test(esc)) {
            // Octal escape
            let octal = esc;
            if (i + 1 < content.length && /[0-7]/.test(content[i + 1])) {
              octal += content[++i];
              if (i + 1 < content.length && /[0-7]/.test(content[i + 1])) {
                octal += content[++i];
              }
            }
            text += String.fromCharCode(parseInt(octal, 8));
          } else {
            text += esc;
          }
        } else if (content[i] === "(") {
          depth++;
          text += "(";
        } else if (content[i] === ")") {
          depth--;
          if (depth > 0) text += ")";
        } else {
          text += content[i];
        }
        i++;
      }
      // Filter out non-printable sequences and control-heavy strings
      const printable = text.replace(/[\x00-\x08\x0e-\x1f]/g, "");
      if (printable.trim().length > 0) {
        texts.push(printable);
      }
    } else if (content[i] === "<" && i + 1 < content.length && content[i + 1] !== "<") {
      // Hex string <hex>
      i++;
      let hex = "";
      while (i < content.length && content[i] !== ">") {
        if (/[0-9a-fA-F]/.test(content[i])) {
          hex += content[i];
        }
        i++;
      }
      if (i < content.length) i++; // skip >
      // Convert hex pairs to characters
      if (hex.length >= 2) {
        let text = "";
        for (let h = 0; h + 1 < hex.length; h += 2) {
          const code = parseInt(hex.slice(h, h + 2), 16);
          if (code >= 32 && code < 127) {
            text += String.fromCharCode(code);
          }
        }
        if (text.trim().length > 0) {
          texts.push(text);
        }
      }
    } else {
      i++;
    }
  }

  return texts.join(" ");
}

// ── MIME Sniffing ──────────────────────────────────────────────────

/**
 * Detect MIME type from magic bytes in binary data.
 *
 * @returns Detected MIME type, or null if unknown
 */
export function sniffMime(data: Buffer): string | null {
  if (data.length < 4) return null;

  // PNG: 89 50 4E 47
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "image/jpeg";
  }
  // GIF: 47 49 46 38
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) {
    return "image/gif";
  }
  // PDF: 25 50 44 46
  if (data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46) {
    return "application/pdf";
  }
  // ZIP: 50 4B 03 04
  if (data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04) {
    return "application/zip";
  }
  // GZIP: 1F 8B
  if (data[0] === 0x1f && data[1] === 0x8b) {
    return "application/gzip";
  }
  // BMP: 42 4D
  if (data[0] === 0x42 && data[1] === 0x4d) {
    return "image/bmp";
  }
  // TIFF: II or MM
  if ((data[0] === 0x49 && data[1] === 0x49 && data[2] === 0x2a && data[3] === 0x00) ||
      (data[0] === 0x4d && data[1] === 0x4d && data[2] === 0x00 && data[3] === 0x2a)) {
    return "image/tiff";
  }
  // WebP: RIFF....WEBP
  if (data.length >= 12 &&
      data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
      data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) {
    return "image/webp";
  }
  // WASM: 00 61 73 6D
  if (data[0] === 0x00 && data[1] === 0x61 && data[2] === 0x73 && data[3] === 0x6d) {
    return "application/wasm";
  }
  // MP4: ....ftyp
  if (data.length >= 8 &&
      data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70) {
    return "video/mp4";
  }

  return null;
}

// ── Image Dimensions ───────────────────────────────────────────────

/**
 * Parse image dimensions from PNG, JPEG, or GIF headers.
 *
 * @returns {width, height} or null if the format is not recognized
 */
export function imageDimensions(data: Buffer): { width: number; height: number } | null {
  if (data.length < 8) return null;

  // PNG: IHDR chunk at offset 8, width at 16 (4 bytes BE), height at 20 (4 bytes BE)
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    if (data.length < 24) return null;
    const width = data.readUInt32BE(16);
    const height = data.readUInt32BE(20);
    return { width, height };
  }

  // GIF: width at offset 6 (2 bytes LE), height at offset 8 (2 bytes LE)
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) {
    if (data.length < 10) return null;
    const width = data.readUInt16LE(6);
    const height = data.readUInt16LE(8);
    return { width, height };
  }

  // JPEG: scan for SOF markers (FFC0-FFCF except FFC4, FFC8, FFCC)
  if (data[0] === 0xff && data[1] === 0xd8) {
    let pos = 2;
    while (pos + 9 < data.length) {
      if (data[pos] !== 0xff) {
        pos++;
        continue;
      }
      const marker = data[pos + 1];

      // SOF markers: C0, C1, C2, C3, C5, C6, C7, C9, CA, CB, CD, CE, CF
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        if (pos + 9 > data.length) return null;
        const height = data.readUInt16BE(pos + 5);
        const width = data.readUInt16BE(pos + 7);
        return { width, height };
      }

      // Skip this marker segment
      if (marker === 0xd0 || marker === 0xd1 || marker === 0xd2 || marker === 0xd3 ||
          marker === 0xd4 || marker === 0xd5 || marker === 0xd6 || marker === 0xd7 ||
          marker === 0xd8 || marker === 0xd9) {
        pos += 2;
      } else if (pos + 4 <= data.length) {
        const segLen = data.readUInt16BE(pos + 2);
        pos += 2 + segLen;
      } else {
        break;
      }
    }
  }

  // BMP: width at offset 18 (4 bytes LE), height at offset 22 (4 bytes LE)
  if (data[0] === 0x42 && data[1] === 0x4d && data.length >= 26) {
    const width = data.readInt32LE(18);
    const height = Math.abs(data.readInt32LE(22)); // height can be negative (top-down)
    return { width, height };
  }

  return null;
}
