const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IP4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export function validateEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function validateUrl(input: string): boolean {
  try { new URL(input); return true; } catch { return false; }
}

export function validateUuid(input: string): boolean {
  return UUID_RE.test(input);
}

export function validateIp(input: string): boolean {
  if (IP4_RE.test(input)) {
    return input.split('.').every(n => parseInt(n, 10) <= 255);
  }
  // Simple IPv6 check
  return /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i.test(input);
}

export function isAscii(input: string): boolean {
  return /^[\x00-\x7F]*$/.test(input);
}
