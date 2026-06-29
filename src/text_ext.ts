/**
 * Text processing utilities — markdown, templating, diffing, fuzzy matching.
 *
 * Pure Node.js implementations (no native dependencies).
 */

// ── Markdown to HTML ────────────────────────────────────────────────

/**
 * Convert basic Markdown to HTML.
 *
 * Supports: headings (h1–h6), bold, italic, inline code, code blocks,
 * links, images, unordered lists, ordered lists, blockquotes,
 * horizontal rules, and paragraphs.
 */
export function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(escHtml(lines[i]));
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      html.push(`<pre><code>${codeLines.join("\n")}</code></pre>`);
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = inlineFormat(headingMatch[2]);
      html.push(`<h${level}>${text}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) {
      html.push("<hr>");
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }
      html.push(`<blockquote><p>${inlineFormat(quoteLines.join(" "))}</p></blockquote>`);
      continue;
    }

    // Unordered list
    if (/^[\s]*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*[-*+]\s+/.test(lines[i])) {
        items.push(inlineFormat(lines[i].trim().replace(/^[-*+]\s+/, "")));
        i++;
      }
      html.push("<ul>" + items.map((item) => `<li>${item}</li>`).join("") + "</ul>");
      continue;
    }

    // Ordered list
    if (/^[\s]*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*\d+\.\s+/.test(lines[i])) {
        items.push(inlineFormat(lines[i].trim().replace(/^\d+\.\s+/, "")));
        i++;
      }
      html.push("<ol>" + items.map((item) => `<li>${item}</li>`).join("") + "</ol>");
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].trim().startsWith("#") && !lines[i].trim().startsWith("```")) {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length > 0) {
      html.push(`<p>${inlineFormat(paraLines.join(" "))}</p>`);
    }
  }

  return html.join("\n");
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineFormat(text: string): string {
  let result = text;
  // Images (before links to avoid conflict)
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  // Links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Inline code
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Bold (** or __)
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/__(.+?)__/g, "<strong>$1</strong>");
  // Italic (* or _)
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  result = result.replace(/_(.+?)_/g, "<em>$1</em>");
  return result;
}

// ── Template Rendering ──────────────────────────────────────────────

/**
 * Render a template string with {{key}} placeholders.
 *
 * @param template Template string containing {{key}} placeholders
 * @param vars Key-value map of substitutions
 */
export function renderTemplate(template: string, vars: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return key in vars ? String(vars[key]) : `{{${key}}}`;
  });
}

// ── Text Diff ───────────────────────────────────────────────────────

/**
 * Compute a simple unified diff between two strings.
 *
 * Returns a human-readable diff with `+` and `-` prefixed lines.
 */
export function textDiff(old: string, new_text: string): string {
  const oldLines = old.split("\n");
  const newLines = new_text.split("\n");

  // Compute LCS table
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const diff: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diff.unshift(` ${oldLines[i - 1]}`);
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift(`+${newLines[j - 1]}`);
      j--;
    } else {
      diff.unshift(`-${oldLines[i - 1]}`);
      i--;
    }
  }

  return diff.join("\n");
}

// ── Levenshtein Distance ────────────────────────────────────────────

/**
 * Compute the Levenshtein (edit) distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Use single-row optimization
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

// ── Similarity Score ────────────────────────────────────────────────

/**
 * Compute a normalized similarity score between two strings (0.0–1.0).
 *
 * Based on Levenshtein distance. 1.0 = identical, 0.0 = completely different.
 */
export function similarityScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - levenshteinDistance(a, b) / maxLen;
}

// ── Fuzzy Match ─────────────────────────────────────────────────────

/**
 * Find candidates that fuzzy-match a query string.
 *
 * @param query The search query
 * @param candidates Array of candidate strings
 * @param threshold Minimum similarity score (default: 0.5)
 * @returns Array of [candidate, score] tuples sorted by score descending
 */
export function fuzzyMatch(
  query: string,
  candidates: string[],
  threshold?: number,
): [string, number][] {
  const minScore = threshold ?? 0.5;
  const results: [string, number][] = [];

  for (const candidate of candidates) {
    const score = similarityScore(query.toLowerCase(), candidate.toLowerCase());
    if (score >= minScore) {
      results.push([candidate, score]);
    }
  }

  results.sort((a, b) => b[1] - a[1]);
  return results;
}

// ── Tokenization ────────────────────────────────────────────────────

/**
 * Tokenize text into words.
 *
 * Splits on whitespace and punctuation boundaries, filtering out empty tokens.
 */
export function tokenizeWords(text: string): string[] {
  return text
    .split(/[\s,;:!?.()\[\]{}"']+/)
    .filter((w) => w.length > 0);
}

/**
 * Tokenize text into sentences.
 *
 * Splits on sentence-ending punctuation (., !, ?) followed by whitespace or end of string.
 */
export function tokenizeSentences(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return sentences;
}
