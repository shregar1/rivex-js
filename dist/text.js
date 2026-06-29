export function slugify(text, separator = '-') {
    return text
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, separator)
        .replace(new RegExp(`^${escapeRegex(separator)}|${escapeRegex(separator)}$`, 'g'), '');
}
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
export function unescapeHtml(text) {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'");
}
export function stripHtml(text) {
    return text.replace(/<[^>]*>/g, '');
}
export function truncate(text, maxLen, suffix = '...') {
    if (text.length <= maxLen)
        return text;
    return text.slice(0, maxLen - suffix.length) + suffix;
}
export function camelToSnake(text) {
    return text.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}
export function snakeToCamel(text) {
    return text.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
//# sourceMappingURL=text.js.map