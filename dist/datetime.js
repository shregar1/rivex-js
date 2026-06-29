export function nowIso() {
    return new Date().toISOString();
}
export function nowTimestamp() {
    return Date.now() / 1000;
}
export function parseIso8601(s) {
    const d = new Date(s);
    if (isNaN(d.getTime()))
        throw new Error(`Invalid ISO 8601 string: ${s}`);
    return d;
}
export function formatIso8601(date) {
    return date.toISOString();
}
export function timestampToIso(ts) {
    return new Date(ts * 1000).toISOString();
}
export function isoToTimestamp(s) {
    const d = new Date(s);
    if (isNaN(d.getTime()))
        throw new Error(`Invalid ISO 8601 string: ${s}`);
    return d.getTime() / 1000;
}
export function formatHttpDate(date) {
    return date.toUTCString();
}
export function parseHttpDate(s) {
    const d = new Date(s);
    if (isNaN(d.getTime()))
        throw new Error(`Invalid HTTP date: ${s}`);
    return d;
}
//# sourceMappingURL=datetime.js.map