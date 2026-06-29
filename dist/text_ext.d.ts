/**
 * Text processing utilities — markdown, templating, diffing, fuzzy matching.
 *
 * Pure Node.js implementations (no native dependencies).
 */
/**
 * Convert basic Markdown to HTML.
 *
 * Supports: headings (h1–h6), bold, italic, inline code, code blocks,
 * links, images, unordered lists, ordered lists, blockquotes,
 * horizontal rules, and paragraphs.
 */
export declare function markdownToHtml(md: string): string;
/**
 * Render a template string with {{key}} placeholders.
 *
 * @param template Template string containing {{key}} placeholders
 * @param vars Key-value map of substitutions
 */
export declare function renderTemplate(template: string, vars: Record<string, any>): string;
/**
 * Compute a simple unified diff between two strings.
 *
 * Returns a human-readable diff with `+` and `-` prefixed lines.
 */
export declare function textDiff(old: string, new_text: string): string;
/**
 * Compute the Levenshtein (edit) distance between two strings.
 */
export declare function levenshteinDistance(a: string, b: string): number;
/**
 * Compute a normalized similarity score between two strings (0.0–1.0).
 *
 * Based on Levenshtein distance. 1.0 = identical, 0.0 = completely different.
 */
export declare function similarityScore(a: string, b: string): number;
/**
 * Find candidates that fuzzy-match a query string.
 *
 * @param query The search query
 * @param candidates Array of candidate strings
 * @param threshold Minimum similarity score (default: 0.5)
 * @returns Array of [candidate, score] tuples sorted by score descending
 */
export declare function fuzzyMatch(query: string, candidates: string[], threshold?: number): [string, number][];
/**
 * Tokenize text into words.
 *
 * Splits on whitespace and punctuation boundaries, filtering out empty tokens.
 */
export declare function tokenizeWords(text: string): string[];
/**
 * Tokenize text into sentences.
 *
 * Splits on sentence-ending punctuation (., !, ?) followed by whitespace or end of string.
 */
export declare function tokenizeSentences(text: string): string[];
//# sourceMappingURL=text_ext.d.ts.map