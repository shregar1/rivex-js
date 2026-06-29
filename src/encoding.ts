export function b64Encode(data: string | Uint8Array): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
  return buf.toString('base64');
}

export function b64Decode(data: string): Uint8Array {
  return Buffer.from(data, 'base64');
}

export function b64urlEncode(data: string | Uint8Array): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
  return buf.toString('base64url');
}

export function b64urlDecode(data: string): Uint8Array {
  return Buffer.from(data, 'base64url');
}

export function hexEncode(data: string | Uint8Array): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
  return buf.toString('hex');
}

export function hexDecode(data: string): Uint8Array {
  return Buffer.from(data, 'hex');
}

export function urlEncode(data: string): string {
  return encodeURIComponent(data);
}

export function urlDecode(data: string): string {
  return decodeURIComponent(data);
}
