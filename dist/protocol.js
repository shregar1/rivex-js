/**
 * Protocol utilities — URL parsing/building, MIME detection, HTTP headers, GraphQL.
 *
 * Pure Node.js implementations (no native dependencies).
 */
// ── HTTP Headers ───────────────────────────────────────────────────
/**
 * Parse raw HTTP headers (as received on the wire) into an array of [name, value] tuples.
 *
 * Each header line is separated by CRLF. The first status line (if present) is skipped.
 * Continuation lines (starting with whitespace) are folded into the previous header.
 */
export function parseRawHeaders(raw) {
    const result = [];
    const lines = raw.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === "")
            continue;
        // Skip HTTP status line (e.g. "HTTP/1.1 200 OK")
        if (i === 0 && /^HTTP\/\d/.test(line))
            continue;
        // Continuation line (obs-fold): starts with space or tab
        if (/^[ \t]/.test(line) && result.length > 0) {
            result[result.length - 1][1] += " " + line.trim();
            continue;
        }
        const colonIdx = line.indexOf(":");
        if (colonIdx === -1)
            continue;
        const name = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        result.push([name, value]);
    }
    return result;
}
/**
 * Parse a URL string into its components.
 */
export function parseUrl(urlStr) {
    const result = {
        scheme: "",
        host: "",
        port: null,
        path: "",
        query: "",
        fragment: "",
        username: "",
    };
    let rest = urlStr;
    // Extract fragment
    const hashIdx = rest.indexOf("#");
    if (hashIdx !== -1) {
        result.fragment = rest.slice(hashIdx + 1);
        rest = rest.slice(0, hashIdx);
    }
    // Extract query
    const qIdx = rest.indexOf("?");
    if (qIdx !== -1) {
        result.query = rest.slice(qIdx + 1);
        rest = rest.slice(0, qIdx);
    }
    // Extract scheme
    const schemeMatch = rest.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
    if (schemeMatch) {
        result.scheme = schemeMatch[1].toLowerCase();
        rest = rest.slice(schemeMatch[0].length);
    }
    // Extract userinfo (username@host or username:password@host)
    const atIdx = rest.indexOf("@");
    if (atIdx !== -1) {
        const userinfo = rest.slice(0, atIdx);
        const colonIdx = userinfo.indexOf(":");
        result.username = colonIdx !== -1 ? userinfo.slice(0, colonIdx) : userinfo;
        rest = rest.slice(atIdx + 1);
    }
    // Extract path
    const slashIdx = rest.indexOf("/");
    if (slashIdx !== -1) {
        result.path = rest.slice(slashIdx);
        rest = rest.slice(0, slashIdx);
    }
    else {
        result.path = "/";
    }
    // Extract host and port
    // Handle IPv6 addresses in brackets
    if (rest.startsWith("[")) {
        const bracketEnd = rest.indexOf("]");
        if (bracketEnd !== -1) {
            result.host = rest.slice(0, bracketEnd + 1);
            const afterBracket = rest.slice(bracketEnd + 1);
            if (afterBracket.startsWith(":")) {
                const portStr = afterBracket.slice(1);
                if (portStr.length > 0 && /^\d+$/.test(portStr)) {
                    result.port = parseInt(portStr, 10);
                }
            }
        }
        else {
            result.host = rest;
        }
    }
    else {
        const colonIdx = rest.lastIndexOf(":");
        if (colonIdx !== -1) {
            const portStr = rest.slice(colonIdx + 1);
            if (/^\d+$/.test(portStr)) {
                result.host = rest.slice(0, colonIdx);
                result.port = parseInt(portStr, 10);
            }
            else {
                result.host = rest;
            }
        }
        else {
            result.host = rest;
        }
    }
    return result;
}
// ── URL Building ───────────────────────────────────────────────────
/**
 * Build a URL string from its components.
 */
export function buildUrl(components) {
    const scheme = components.scheme ?? "https";
    let url = `${scheme}://${components.host}`;
    if (components.port !== undefined && components.port !== null) {
        // Omit default ports
        const isDefaultPort = (scheme === "http" && components.port === 80) ||
            (scheme === "https" && components.port === 443);
        if (!isDefaultPort) {
            url += `:${components.port}`;
        }
    }
    const path = components.path ?? "/";
    url += path.startsWith("/") ? path : `/${path}`;
    if (components.query) {
        url += `?${components.query}`;
    }
    if (components.fragment) {
        url += `#${components.fragment}`;
    }
    return url;
}
// ── URL Resolution ─────────────────────────────────────────────────
/**
 * Resolve a relative URL against a base URL.
 */
export function resolveUrl(base, relative) {
    // If relative is already absolute, return it
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(relative)) {
        return relative;
    }
    const baseParsed = parseUrl(base);
    // Protocol-relative
    if (relative.startsWith("//")) {
        return `${baseParsed.scheme}:${relative}`;
    }
    // Absolute path
    if (relative.startsWith("/")) {
        const portPart = baseParsed.port !== null ? `:${baseParsed.port}` : "";
        return `${baseParsed.scheme}://${baseParsed.host}${portPart}${relative}`;
    }
    // Fragment-only
    if (relative.startsWith("#")) {
        const portPart = baseParsed.port !== null ? `:${baseParsed.port}` : "";
        const queryPart = baseParsed.query ? `?${baseParsed.query}` : "";
        return `${baseParsed.scheme}://${baseParsed.host}${portPart}${baseParsed.path}${queryPart}${relative}`;
    }
    // Query-only
    if (relative.startsWith("?")) {
        const portPart = baseParsed.port !== null ? `:${baseParsed.port}` : "";
        return `${baseParsed.scheme}://${baseParsed.host}${portPart}${baseParsed.path}${relative}`;
    }
    // Relative path — resolve against base directory
    const basePath = baseParsed.path;
    const baseDir = basePath.slice(0, basePath.lastIndexOf("/") + 1);
    const combined = baseDir + relative;
    // Normalize path (resolve . and ..)
    const segments = combined.split("/");
    const resolved = [];
    for (const seg of segments) {
        if (seg === ".")
            continue;
        if (seg === "..") {
            if (resolved.length > 1)
                resolved.pop();
        }
        else {
            resolved.push(seg);
        }
    }
    const normalizedPath = resolved.join("/") || "/";
    const portPart = baseParsed.port !== null ? `:${baseParsed.port}` : "";
    return `${baseParsed.scheme}://${baseParsed.host}${portPart}${normalizedPath}`;
}
// ── MIME Sniffing ──────────────────────────────────────────────────
/**
 * Detect MIME type from magic bytes in binary data.
 *
 * @returns Detected MIME type, or null if unknown.
 */
export function sniffMimeType(data) {
    if (data.length < 4)
        return null;
    // PNG: 89 50 4E 47
    if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
        return "image/png";
    }
    // JPEG: FF D8 FF
    if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
        return "image/jpeg";
    }
    // GIF: 47 49 46 38 (GIF8)
    if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) {
        return "image/gif";
    }
    // PDF: 25 50 44 46 (%PDF)
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
    // TIFF: 49 49 2A 00 (little-endian) or 4D 4D 00 2A (big-endian)
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
    // OGG: 4F 67 67 53
    if (data[0] === 0x4f && data[1] === 0x67 && data[2] === 0x67 && data[3] === 0x53) {
        return "audio/ogg";
    }
    // MP3: FF FB or FF F3 or FF F2, or ID3
    if ((data[0] === 0xff && (data[1] & 0xe0) === 0xe0) ||
        (data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33)) {
        return "audio/mpeg";
    }
    // FLAC: 66 4C 61 43
    if (data[0] === 0x66 && data[1] === 0x4c && data[2] === 0x61 && data[3] === 0x43) {
        return "audio/flac";
    }
    // WAV: RIFF....WAVE
    if (data.length >= 12 &&
        data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
        data[8] === 0x57 && data[9] === 0x41 && data[10] === 0x56 && data[11] === 0x45) {
        return "audio/wav";
    }
    // MP4: ....ftyp (offset 4)
    if (data.length >= 8 &&
        data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70) {
        return "video/mp4";
    }
    // ELF: 7F 45 4C 46
    if (data[0] === 0x7f && data[1] === 0x45 && data[2] === 0x4c && data[3] === 0x46) {
        return "application/x-elf";
    }
    return null;
}
// ── MIME from Extension ────────────────────────────────────────────
const MIME_MAP = {
    // Text
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    csv: "text/csv",
    txt: "text/plain",
    xml: "text/xml",
    svg: "image/svg+xml",
    // JavaScript / JSON
    js: "application/javascript",
    mjs: "application/javascript",
    json: "application/json",
    ts: "text/typescript",
    // Images
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    bmp: "image/bmp",
    ico: "image/x-icon",
    webp: "image/webp",
    tiff: "image/tiff",
    tif: "image/tiff",
    avif: "image/avif",
    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
    aac: "audio/aac",
    m4a: "audio/mp4",
    // Video
    mp4: "video/mp4",
    webm: "video/webm",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    // Archives
    zip: "application/zip",
    gz: "application/gzip",
    tar: "application/x-tar",
    "7z": "application/x-7z-compressed",
    rar: "application/vnd.rar",
    bz2: "application/x-bzip2",
    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    // Fonts
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    otf: "font/otf",
    eot: "application/vnd.ms-fontobject",
    // Other
    wasm: "application/wasm",
    yaml: "application/x-yaml",
    yml: "application/x-yaml",
    toml: "application/toml",
    md: "text/markdown",
    sh: "application/x-sh",
};
/**
 * Get MIME type from a file extension.
 *
 * @param ext File extension (with or without leading dot)
 * @returns MIME type string, or null if unknown
 */
export function mimeFromExtension(ext) {
    const cleaned = ext.startsWith(".") ? ext.slice(1) : ext;
    return MIME_MAP[cleaned.toLowerCase()] ?? null;
}
// Build reverse map
const EXT_MAP = {};
for (const [ext, mime] of Object.entries(MIME_MAP)) {
    if (!(mime in EXT_MAP)) {
        EXT_MAP[mime] = ext;
    }
}
/**
 * Get a file extension for a MIME type.
 *
 * @param mime MIME type string
 * @returns File extension (without dot), or null if unknown
 */
export function extensionFromMime(mime) {
    return EXT_MAP[mime.toLowerCase()] ?? null;
}
/**
 * Parse a simple GraphQL query string into an AST-like object.
 *
 * Identifies query/mutation/subscription/fragment definitions,
 * field selections, arguments, aliases, and variable definitions.
 */
export function parseGraphQL(query) {
    const tokens = tokenizeGraphQL(query);
    let pos = 0;
    function peek() {
        return tokens[pos];
    }
    function consume(expected) {
        const token = tokens[pos];
        if (expected !== undefined && token !== expected) {
            throw new Error(`Expected "${expected}" but got "${token}" at position ${pos}`);
        }
        pos++;
        return token;
    }
    function parseDocument() {
        const definitions = [];
        while (pos < tokens.length) {
            definitions.push(parseDefinition());
        }
        return { definitions };
    }
    function parseDefinition() {
        const token = peek();
        // Shorthand query (starts with {)
        if (token === "{") {
            return {
                kind: "query",
                name: null,
                variableDefinitions: [],
                selectionSet: parseSelectionSet(),
            };
        }
        const kind = consume();
        if (!["query", "mutation", "subscription", "fragment"].includes(kind)) {
            throw new Error(`Unexpected token: ${kind}`);
        }
        let name = null;
        const variableDefinitions = [];
        // Optional name
        if (peek() !== "{" && peek() !== "(") {
            // For fragments: "fragment Name on Type { ... }"
            if (kind === "fragment") {
                name = consume();
                consume("on");
                consume(); // type condition
            }
            else {
                name = consume();
            }
        }
        // Optional variable definitions
        if (peek() === "(") {
            consume("(");
            while (peek() !== ")" && pos < tokens.length) {
                if (peek()?.startsWith("$")) {
                    const varName = consume().slice(1); // remove $
                    consume(":");
                    let typeName = "";
                    while (peek() !== ")" && peek() !== "," && peek() !== "$" && pos < tokens.length) {
                        typeName += consume();
                    }
                    variableDefinitions.push({ name: varName, type: typeName.trim() });
                    if (peek() === ",")
                        consume(",");
                }
                else {
                    consume(); // skip unexpected token
                }
            }
            consume(")");
        }
        return {
            kind,
            name,
            variableDefinitions,
            selectionSet: parseSelectionSet(),
        };
    }
    function parseSelectionSet() {
        const selections = [];
        if (peek() !== "{")
            return selections;
        consume("{");
        while (peek() !== "}" && pos < tokens.length) {
            // Skip fragment spreads for simplicity
            if (peek() === "...") {
                consume("...");
                consume(); // fragment name or inline type
                // If followed by "on", skip it and the type name
                if (peek() === "on") {
                    consume("on");
                    consume(); // type name
                }
                if (peek() === "{") {
                    parseSelectionSet(); // skip inline fragment body
                }
                continue;
            }
            let name = consume();
            let alias = null;
            // Check for alias
            if (peek() === ":") {
                consume(":");
                alias = name;
                name = consume();
            }
            const args = [];
            // Arguments
            if (peek() === "(") {
                consume("(");
                while (peek() !== ")" && pos < tokens.length) {
                    const argName = consume();
                    consume(":");
                    let argValue = consume();
                    // Handle quoted strings
                    if (argValue.startsWith('"')) {
                        while (!argValue.endsWith('"') && pos < tokens.length) {
                            argValue += " " + consume();
                        }
                    }
                    args.push({ name: argName, value: argValue });
                    if (peek() === ",")
                        consume(",");
                }
                consume(")");
            }
            const subSelections = peek() === "{" ? parseSelectionSet() : [];
            selections.push({
                name,
                alias,
                arguments: args,
                selectionSet: subSelections,
            });
        }
        if (peek() === "}")
            consume("}");
        return selections;
    }
    return parseDocument();
}
function tokenizeGraphQL(query) {
    const tokens = [];
    let i = 0;
    while (i < query.length) {
        // Skip whitespace
        if (/\s/.test(query[i])) {
            i++;
            continue;
        }
        // Skip comments
        if (query[i] === "#") {
            while (i < query.length && query[i] !== "\n")
                i++;
            continue;
        }
        // Single-character tokens
        if ("{},():!".includes(query[i])) {
            tokens.push(query[i]);
            i++;
            continue;
        }
        // Spread operator
        if (query[i] === "." && query[i + 1] === "." && query[i + 2] === ".") {
            tokens.push("...");
            i += 3;
            continue;
        }
        // String literal
        if (query[i] === '"') {
            let str = '"';
            i++;
            while (i < query.length && query[i] !== '"') {
                if (query[i] === "\\") {
                    str += query[i++];
                }
                str += query[i++];
            }
            if (i < query.length)
                str += query[i++]; // closing quote
            tokens.push(str);
            continue;
        }
        // Variable ($name)
        if (query[i] === "$") {
            let name = "$";
            i++;
            while (i < query.length && /[a-zA-Z0-9_]/.test(query[i])) {
                name += query[i++];
            }
            tokens.push(name);
            continue;
        }
        // @ directive
        if (query[i] === "@") {
            let name = "@";
            i++;
            while (i < query.length && /[a-zA-Z0-9_]/.test(query[i])) {
                name += query[i++];
            }
            tokens.push(name);
            continue;
        }
        // Name / keyword / number
        if (/[a-zA-Z_0-9]/.test(query[i]) || query[i] === "-") {
            let word = "";
            while (i < query.length && /[a-zA-Z0-9_.\-]/.test(query[i])) {
                word += query[i++];
            }
            tokens.push(word);
            continue;
        }
        // Equal sign (for default values)
        if (query[i] === "=") {
            tokens.push("=");
            i++;
            continue;
        }
        // Brackets for list types
        if (query[i] === "[" || query[i] === "]") {
            tokens.push(query[i]);
            i++;
            continue;
        }
        // Skip unknown characters
        i++;
    }
    return tokens;
}
/**
 * Validate a GraphQL query string.
 *
 * Checks basic structural validity:
 * - Balanced braces and parentheses
 * - Valid operation types (query, mutation, subscription, fragment)
 * - Non-empty selection sets
 *
 * @returns true if structurally valid, false otherwise
 */
export function validateGraphQL(query) {
    try {
        const trimmed = query.trim();
        if (!trimmed)
            return false;
        // Check balanced braces and parentheses
        let braceCount = 0;
        let parenCount = 0;
        let inString = false;
        for (let i = 0; i < trimmed.length; i++) {
            const ch = trimmed[i];
            if (ch === '"' && (i === 0 || trimmed[i - 1] !== "\\")) {
                inString = !inString;
                continue;
            }
            if (inString)
                continue;
            if (ch === "#") {
                while (i < trimmed.length && trimmed[i] !== "\n")
                    i++;
                continue;
            }
            if (ch === "{")
                braceCount++;
            else if (ch === "}")
                braceCount--;
            else if (ch === "(")
                parenCount++;
            else if (ch === ")")
                parenCount--;
            if (braceCount < 0 || parenCount < 0)
                return false;
        }
        if (braceCount !== 0 || parenCount !== 0)
            return false;
        // Must contain at least one { ... } block
        if (!trimmed.includes("{"))
            return false;
        // Try parsing — if it throws, it's invalid
        parseGraphQL(trimmed);
        return true;
    }
    catch {
        return false;
    }
}
// ── PDF Text Extraction ──────────────────────────────────────────
/**
 * Extract text from a PDF (simple parenthesized string extraction).
 *
 * This is a lightweight extractor that reads text from parenthesized
 * strings in the PDF content stream. It does not handle all PDF
 * encodings or compressed streams.
 */
export function pdfExtractText(data) {
    const content = data.toString('latin1');
    let text = '';
    let i = 0;
    while (i < content.length) {
        if (content[i] === '(') {
            i++;
            let depth = 1;
            let segment = '';
            while (i < content.length && depth > 0) {
                if (content[i] === '(') {
                    depth++;
                    segment += '(';
                }
                else if (content[i] === ')') {
                    depth--;
                    if (depth > 0)
                        segment += ')';
                }
                else if (content[i] === '\\') {
                    i++;
                    if (i < content.length) {
                        const c = content[i];
                        if (c === 'n')
                            segment += '\n';
                        else if (c === 'r')
                            segment += '\r';
                        else if (c === 't')
                            segment += '\t';
                        else
                            segment += c;
                    }
                }
                else if (content.charCodeAt(i) >= 0x20 && content.charCodeAt(i) < 0x7F) {
                    segment += content[i];
                }
                else {
                    segment += ' ';
                }
                i++;
            }
            if (segment.trim())
                text += segment;
        }
        else {
            i++;
        }
    }
    return text;
}
// ── Image Dimensions ─────────────────────────────────────────────
/**
 * Get image dimensions from PNG/JPEG/GIF/BMP headers.
 *
 * @returns `{ width, height }` or `null` if format is unrecognised.
 */
export function imageDimensions(data) {
    if (data.length < 8)
        return null;
    // PNG
    if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) {
        if (data.length < 24)
            return null;
        return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
    }
    // GIF
    if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
        if (data.length < 10)
            return null;
        return { width: data.readUInt16LE(6), height: data.readUInt16LE(8) };
    }
    // JPEG
    if (data[0] === 0xFF && data[1] === 0xD8) {
        let offset = 2;
        while (offset < data.length - 8) {
            if (data[offset] !== 0xFF)
                break;
            const marker = data[offset + 1];
            if (marker === 0xC0 || marker === 0xC2) {
                return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
            }
            const len = data.readUInt16BE(offset + 2);
            offset += 2 + len;
        }
    }
    // BMP
    if (data[0] === 0x42 && data[1] === 0x4D && data.length >= 26) {
        return { width: data.readInt32LE(18), height: Math.abs(data.readInt32LE(22)) };
    }
    return null;
}
//# sourceMappingURL=protocol.js.map