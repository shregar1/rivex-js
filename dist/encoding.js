export function b64Encode(data) {
    const buf = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
    return buf.toString('base64');
}
export function b64Decode(data) {
    return Buffer.from(data, 'base64');
}
export function b64urlEncode(data) {
    const buf = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
    return buf.toString('base64url');
}
export function b64urlDecode(data) {
    return Buffer.from(data, 'base64url');
}
export function hexEncode(data) {
    const buf = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
    return buf.toString('hex');
}
export function hexDecode(data) {
    return Buffer.from(data, 'hex');
}
export function urlEncode(data) {
    return encodeURIComponent(data);
}
export function urlDecode(data) {
    return decodeURIComponent(data);
}
//# sourceMappingURL=encoding.js.map