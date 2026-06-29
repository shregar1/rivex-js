/**
 * ID Generation — UUID v4/v7, ULID, Snowflake, NanoID.
 *
 * Pure Node.js implementations (no native dependencies).
 */
/**
 * Generate a random UUID v4 string.
 */
export declare function uuidV4(): string;
/**
 * Generate a time-ordered UUID v7 string.
 *
 * Layout: 48-bit Unix ms timestamp | 4-bit version (7) | 12-bit rand_a |
 *         2-bit variant (10) | 62-bit rand_b
 */
export declare function uuidV7(): string;
/**
 * Generate n UUID v4 strings in bulk.
 */
export declare function uuidV4Bulk(n: number): string[];
/**
 * Generate n UUID v7 strings in bulk.
 */
export declare function uuidV7Bulk(n: number): string[];
/**
 * Generate a ULID (Crockford base32, 26 chars, lexicographically sortable).
 */
export declare function ulid(): string;
/**
 * Generate n ULIDs in bulk.
 */
export declare function ulidBulk(n: number): string[];
/**
 * Extract Unix timestamp (ms) from a ULID string.
 */
export declare function ulidTimestamp(ulidStr: string): number;
/**
 * Generate a Twitter-style Snowflake ID (bigint).
 *
 * @param machineId Worker ID 0–1023 (default 0)
 */
export declare function snowflakeId(machineId?: number): bigint;
/**
 * Generate n Snowflake IDs in bulk.
 */
export declare function snowflakeIdBulk(n: number, machineId?: number): bigint[];
/**
 * Extract Unix timestamp (ms) from a Snowflake ID.
 */
export declare function snowflakeTimestamp(id: bigint): number;
/**
 * Extract machine ID from a Snowflake ID.
 */
export declare function snowflakeMachineId(id: bigint): number;
/**
 * Generate a NanoID — URL-safe compact unique string.
 *
 * @param size Length (default 21)
 * @param alphabet Custom alphabet (default: A-Za-z0-9_-)
 */
export declare function nanoId(size?: number, alphabet?: string): string;
/**
 * Generate n NanoIDs in bulk.
 */
export declare function nanoIdBulk(n: number, size?: number, alphabet?: string): string[];
//# sourceMappingURL=ids.d.ts.map