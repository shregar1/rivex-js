export function slugify(text: string, separator = '-'): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^${escapeRegex(separator)}|${escapeRegex(separator)}$`, 'g'), '');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function unescapeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

export function truncate(text: string, maxLen: number, suffix = '...'): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - suffix.length) + suffix;
}

export function camelToSnake(text: string): string {
  return text.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

export function snakeToCamel(text: string): string {
  return text.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
