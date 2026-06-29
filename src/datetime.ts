export function nowIso(): string {
  return new Date().toISOString();
}

export function nowTimestamp(): number {
  return Date.now() / 1000;
}

export function parseIso8601(s: string): Date {
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new Error(`Invalid ISO 8601 string: ${s}`);
  return d;
}

export function formatIso8601(date: Date): string {
  return date.toISOString();
}

export function timestampToIso(ts: number): string {
  return new Date(ts * 1000).toISOString();
}

export function isoToTimestamp(s: string): number {
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new Error(`Invalid ISO 8601 string: ${s}`);
  return d.getTime() / 1000;
}

export function formatHttpDate(date: Date): string {
  return date.toUTCString();
}

export function parseHttpDate(s: string): Date {
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new Error(`Invalid HTTP date: ${s}`);
  return d;
}
