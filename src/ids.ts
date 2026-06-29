/**
 * ID Generation — UUID v4/v7, ULID, Snowflake, NanoID.
 *
 * Pure Node.js implementations (no native dependencies).
 */

import { randomBytes, randomUUID } from "node:crypto";

// ── UUID ─────────────────────────────────────────────────────────────

/**
 * Generate a random UUID v4 string.
 */
export function uuidV4(): string {
  return randomUUID();
}

/**
 * Generate a time-ordered UUID v7 string.
 *
 * Layout: 48-bit Unix ms timestamp | 4-bit version (7) | 12-bit rand_a |
 *         2-bit variant (10) | 62-bit rand_b
 */
export function uuidV7(): string {
  const now = Date.now();
  const bytes = new Uint8Array(16);

  // Fill with random
  const rand = randomBytes(16);
  bytes.set(rand);

  // Timestamp (48 bits, big-endian) in bytes 0–5
  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;

  // Version 7 (0111) in high nibble of byte 6
  bytes[6] = (bytes[6] & 0x0f) | 0x70;

  // Variant 10 in high 2 bits of byte 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Generate n UUID v4 strings in bulk.
 */
export function uuidV4Bulk(n: number): string[] {
  return Array.from({ length: n }, () => randomUUID());
}

/**
 * Generate n UUID v7 strings in bulk.
 */
export function uuidV7Bulk(n: number): string[] {
  return Array.from({ length: n }, () => uuidV7());
}

// ── ULID ─────────────────────────────────────────────────────────────

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Generate a ULID (Crockford base32, 26 chars, lexicographically sortable).
 */
export function ulid(): string {
  const now = Date.now();
  const rand = randomBytes(10);

  // Encode 48-bit timestamp as 10 Crockford chars (most significant first)
  let ts = now;
  const timePart = new Array(10);
  for (let i = 9; i >= 0; i--) {
    timePart[i] = CROCKFORD[ts & 0x1f];
    ts = Math.floor(ts / 32);
  }

  // Encode 80 bits of randomness as 16 Crockford chars
  const randPart = new Array(16);
  // We have 10 random bytes = 80 bits, encode 5 bits at a time
  // Process as a big number
  let bits = 0n;
  for (let i = 0; i < 10; i++) {
    bits = (bits << 8n) | BigInt(rand[i]);
  }
  for (let i = 15; i >= 0; i--) {
    randPart[i] = CROCKFORD[Number(bits & 0x1fn)];
    bits >>= 5n;
  }

  return timePart.join("") + randPart.join("");
}

/**
 * Generate n ULIDs in bulk.
 */
export function ulidBulk(n: number): string[] {
  return Array.from({ length: n }, () => ulid());
}

/**
 * Extract Unix timestamp (ms) from a ULID string.
 */
export function ulidTimestamp(ulidStr: string): number {
  if (ulidStr.length !== 26) throw new Error("Invalid ULID length");
  let ts = 0;
  for (let i = 0; i < 10; i++) {
    const idx = CROCKFORD.indexOf(ulidStr[i].toUpperCase());
    if (idx === -1) throw new Error(`Invalid ULID character: ${ulidStr[i]}`);
    ts = ts * 32 + idx;
  }
  return ts;
}

// ── Snowflake ID ─────────────────────────────────────────────────────

const SNOWFLAKE_EPOCH = 1_704_067_200_000n; // 2024-01-01 UTC
const MACHINE_BITS = 10n;
const SEQUENCE_BITS = 12n;
const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n;

let snowflakeSeq = 0n;
let snowflakeLastMs = 0n;

/**
 * Generate a Twitter-style Snowflake ID (bigint).
 *
 * @param machineId Worker ID 0–1023 (default 0)
 */
export function snowflakeId(machineId: number = 0): bigint {
  const mid = BigInt(machineId) & ((1n << MACHINE_BITS) - 1n);
  const now = BigInt(Date.now());

  if (now > snowflakeLastMs) {
    snowflakeLastMs = now;
    snowflakeSeq = 0n;
  } else {
    snowflakeSeq++;
    if (snowflakeSeq > MAX_SEQUENCE) {
      // Wait for next ms (rare in JS single-threaded)
      while (BigInt(Date.now()) <= snowflakeLastMs) {
        // spin
      }
      snowflakeLastMs = BigInt(Date.now());
      snowflakeSeq = 0n;
    }
  }

  const elapsed = snowflakeLastMs - SNOWFLAKE_EPOCH;
  return (elapsed << (MACHINE_BITS + SEQUENCE_BITS)) | (mid << SEQUENCE_BITS) | snowflakeSeq;
}

/**
 * Generate n Snowflake IDs in bulk.
 */
export function snowflakeIdBulk(n: number, machineId: number = 0): bigint[] {
  return Array.from({ length: n }, () => snowflakeId(machineId));
}

/**
 * Extract Unix timestamp (ms) from a Snowflake ID.
 */
export function snowflakeTimestamp(id: bigint): number {
  const elapsed = id >> (MACHINE_BITS + SEQUENCE_BITS);
  return Number(elapsed + SNOWFLAKE_EPOCH);
}

/**
 * Extract machine ID from a Snowflake ID.
 */
export function snowflakeMachineId(id: bigint): number {
  const mask = (1n << MACHINE_BITS) - 1n;
  return Number((id >> SEQUENCE_BITS) & mask);
}

// ── NanoID ───────────────────────────────────────────────────────────

const URL_ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

/**
 * Generate a NanoID — URL-safe compact unique string.
 *
 * @param size Length (default 21)
 * @param alphabet Custom alphabet (default: A-Za-z0-9_-)
 */
export function nanoId(size: number = 21, alphabet?: string): string {
  const alpha = alphabet ?? URL_ALPHABET;
  const mask = (2 << (31 - Math.clz32((alpha.length - 1) | 1))) - 1;
  const step = Math.ceil((1.6 * mask * size) / alpha.length);
  let id = "";

  while (id.length < size) {
    const bytes = randomBytes(step);
    for (let i = 0; i < step && id.length < size; i++) {
      const idx = bytes[i] & mask;
      if (idx < alpha.length) {
        id += alpha[idx];
      }
    }
  }

  return id;
}

/**
 * Generate n NanoIDs in bulk.
 */
export function nanoIdBulk(n: number, size: number = 21, alphabet?: string): string[] {
  return Array.from({ length: n }, () => nanoId(size, alphabet));
}
