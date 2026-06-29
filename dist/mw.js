/**
 * Middleware utilities — rate limiter, IP/CIDR, ETag, body hash, content negotiation.
 *
 * Pure Node.js implementations (no native dependencies).
 */
import { createHash, createHmac } from "node:crypto";
import { isIPv4, isIPv6 } from "node:net";
/**
 * A concurrent token-bucket rate limiter.
 */
export class RateLimiter {
    rate;
    burst;
    buckets = new Map();
    /**
     * @param rate Tokens refilled per second
     * @param burst Maximum bucket capacity
     */
    constructor(rate, burst) {
        this.rate = rate;
        this.burst = burst;
    }
    /** Check if 1 token is available for key. */
    check(key) {
        return this.checkN(key, 1);
    }
    /** Check if n tokens are available for key. */
    checkN(key, n) {
        const now = Date.now();
        let bucket = this.buckets.get(key);
        if (!bucket) {
            bucket = { tokens: this.burst, last: now };
            this.buckets.set(key, bucket);
        }
        const elapsed = (now - bucket.last) / 1000;
        bucket.tokens = Math.min(bucket.tokens + elapsed * this.rate, this.burst);
        bucket.last = now;
        if (bucket.tokens >= n) {
            bucket.tokens -= n;
            return true;
        }
        return false;
    }
    /** Get remaining tokens for key (without consuming). */
    remaining(key) {
        const bucket = this.buckets.get(key);
        if (!bucket)
            return this.burst;
        const elapsed = (Date.now() - bucket.last) / 1000;
        return Math.min(bucket.tokens + elapsed * this.rate, this.burst);
    }
    /** Seconds until 1 token is available (0 if already available). */
    retryAfter(key) {
        const current = this.remaining(key);
        if (current >= 1)
            return 0;
        return (1 - current) / this.rate;
    }
    /** Reset bucket for key. */
    reset(key) {
        this.buckets.delete(key);
    }
    /** Clear all buckets. */
    clear() {
        this.buckets.clear();
    }
    /** Number of tracked keys. */
    get size() {
        return this.buckets.size;
    }
}
// ── IP / CIDR ────────────────────────────────────────────────────────
/**
 * Check if an IP address is within a CIDR range.
 */
export function ipInCidr(ip, cidr) {
    const [network, prefixStr] = cidr.split("/");
    const prefix = parseInt(prefixStr, 10);
    if (isIPv4(ip) && isIPv4(network)) {
        const ipNum = ipv4ToNum(ip);
        const netNum = ipv4ToNum(network);
        const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
        return (ipNum & mask) === (netNum & mask);
    }
    if (isIPv6(ip) && isIPv6(network)) {
        const ipBytes = ipv6ToBytes(ip);
        const netBytes = ipv6ToBytes(network);
        return matchPrefix(ipBytes, netBytes, prefix);
    }
    return false;
}
/**
 * Check if IP matches any CIDR in a list.
 */
export function ipInCidrs(ip, cidrs) {
    return cidrs.some((cidr) => ipInCidr(ip, cidr));
}
/**
 * Check if an IP is a private/reserved address.
 */
export function isPrivateIp(ip) {
    if (isIPv4(ip)) {
        return (ipInCidr(ip, "10.0.0.0/8") ||
            ipInCidr(ip, "172.16.0.0/12") ||
            ipInCidr(ip, "192.168.0.0/16") ||
            ipInCidr(ip, "127.0.0.0/8") ||
            ipInCidr(ip, "169.254.0.0/16") ||
            ipInCidr(ip, "0.0.0.0/8"));
    }
    return ip === "::1" || ip === "::";
}
function ipv4ToNum(ip) {
    const parts = ip.split(".").map(Number);
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}
function ipv6ToBytes(ip) {
    // Expand :: notation
    let parts = ip.split(":");
    const dblIdx = parts.indexOf("");
    if (dblIdx !== -1) {
        const before = parts.slice(0, dblIdx);
        const after = parts.slice(dblIdx + 1).filter((p) => p !== "");
        const missing = 8 - before.length - after.length;
        parts = [...before, ...Array(missing).fill("0"), ...after];
    }
    const bytes = [];
    for (const part of parts) {
        const val = parseInt(part || "0", 16);
        bytes.push((val >> 8) & 0xff, val & 0xff);
    }
    return bytes;
}
function matchPrefix(a, b, prefix) {
    const fullBytes = Math.floor(prefix / 8);
    for (let i = 0; i < fullBytes; i++) {
        if (a[i] !== b[i])
            return false;
    }
    const remaining = prefix % 8;
    if (remaining > 0) {
        const mask = (0xff << (8 - remaining)) & 0xff;
        if ((a[fullBytes] & mask) !== (b[fullBytes] & mask))
            return false;
    }
    return true;
}
// ── ETag ─────────────────────────────────────────────────────────────
/**
 * Generate a CRC32-based ETag.
 */
export function etagCrc32(data) {
    const crc = crc32(data);
    return `"${crc.toString(16).padStart(8, "0")}"`;
}
/**
 * Generate a weak CRC32-based ETag.
 */
export function etagWeak(data) {
    const crc = crc32(data);
    return `W/"${crc.toString(16).padStart(8, "0")}"`;
}
/**
 * Generate a SHA-256-based strong ETag (16 hex chars).
 */
export function etagStrong(data) {
    const hash = createHash("sha256").update(data).digest("hex").slice(0, 16);
    return `"${hash}"`;
}
/**
 * Check if two ETags match (RFC 7232).
 */
export function etagMatch(etag1, etag2, strong = false) {
    if (strong) {
        if (etag1.startsWith("W/") || etag2.startsWith("W/"))
            return false;
        return etag1 === etag2;
    }
    const t1 = etag1.startsWith("W/") ? etag1.slice(2) : etag1;
    const t2 = etag2.startsWith("W/") ? etag2.slice(2) : etag2;
    return t1 === t2;
}
// CRC32 lookup table
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    CRC32_TABLE[i] = c;
}
function crc32(data) {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
        crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}
// ── Body Hash / Webhook ──────────────────────────────────────────────
/**
 * Compute SHA-256 hex digest of data.
 */
export function bodySha256(data) {
    return createHash("sha256").update(data).digest("hex");
}
/**
 * Verify SHA-256 hex digest of data (constant-time).
 */
export function bodySha256Verify(data, expectedHex) {
    const computed = bodySha256(data);
    return timingSafeEqual(computed, expectedHex);
}
/**
 * Compute webhook signature: sha256=<HMAC-SHA256 hex>.
 */
export function webhookSign(secret, body) {
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    return `sha256=${sig}`;
}
/**
 * Verify a webhook signature (constant-time).
 */
export function webhookVerify(secret, body, signature) {
    const computed = webhookSign(secret, body);
    return timingSafeEqual(computed, signature);
}
function timingSafeEqual(a, b) {
    if (a.length !== b.length)
        return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}
/**
 * Parse an Accept header into sorted (type, quality) pairs.
 */
export function parseAccept(header) {
    const items = header
        .split(",")
        .map((part) => {
        const trimmed = part.trim();
        if (!trimmed)
            return null;
        const [media, ...params] = trimmed.split(";");
        const type = media.trim().toLowerCase();
        const qParam = params.find((p) => p.trim().startsWith("q="));
        const quality = qParam ? parseFloat(qParam.trim().slice(2)) : 1.0;
        return { type, quality };
    })
        .filter(Boolean);
    items.sort((a, b) => {
        if (b.quality !== a.quality)
            return b.quality - a.quality;
        return specificity(b.type) - specificity(a.type);
    });
    return items;
}
function specificity(type) {
    if (type === "*/*")
        return 0;
    if (type.endsWith("/*"))
        return 1;
    return 2;
}
/**
 * Negotiate the best content type from available options.
 */
export function negotiateContentType(acceptHeader, available) {
    const accepted = parseAccept(acceptHeader);
    for (const { type: accType, quality } of accepted) {
        if (quality <= 0)
            continue;
        for (const avail of available) {
            const availLower = avail.toLowerCase();
            if (accType === availLower || accType === "*/*")
                return avail;
            if (accType.endsWith("/*")) {
                const prefix = accType.slice(0, -1);
                if (availLower.startsWith(prefix))
                    return avail;
            }
        }
    }
    return null;
}
/**
 * Parse an Accept-Language header.
 */
export function parseAcceptLanguage(header) {
    return parseAccept(header);
}
/**
 * Negotiate the best language from available options.
 */
export function negotiateLanguage(acceptHeader, available) {
    const accepted = parseAccept(acceptHeader);
    for (const { type: lang, quality } of accepted) {
        if (quality <= 0)
            continue;
        for (const avail of available) {
            const availLower = avail.toLowerCase();
            if (lang === availLower || lang === "*")
                return avail;
            // Prefix matching
            if (availLower.startsWith(lang) && availLower[lang.length] === "-")
                return avail;
            if (lang.startsWith(availLower) && lang[availLower.length] === "-")
                return avail;
        }
    }
    return null;
}
//# sourceMappingURL=mw.js.map