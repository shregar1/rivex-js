/**
 * Validation extensions — Luhn, credit card, IBAN, HTML sanitization.
 *
 * Pure Node.js implementations (no native dependencies).
 */

// ── Luhn Check ──────────────────────────────────────────────────────

/**
 * Validate a number string using the Luhn algorithm.
 *
 * Commonly used for credit card numbers, IMEI, etc.
 */
export function luhnCheck(number: string): boolean {
  const digits = number.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits) || digits.length < 2) return false;

  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

// ── Card Type Detection ─────────────────────────────────────────────

/**
 * Detect the card type from a card number.
 *
 * @returns Card type name or null if unrecognized
 */
export function cardType(number: string): string | null {
  const digits = number.replace(/[\s-]/g, "");

  // Visa: starts with 4
  if (/^4\d{12,18}$/.test(digits)) return "visa";

  // Mastercard: 51–55 or 2221–2720
  if (/^5[1-5]\d{14}$/.test(digits)) return "mastercard";
  if (/^2(?:2[2-9]\d|[3-6]\d{2}|7[01]\d|720)\d{12}$/.test(digits)) return "mastercard";

  // Amex: 34 or 37
  if (/^3[47]\d{13}$/.test(digits)) return "amex";

  // Discover: 6011, 622126–622925, 644–649, 65
  if (/^6011\d{12}$/.test(digits)) return "discover";
  if (/^65\d{14}$/.test(digits)) return "discover";
  if (/^64[4-9]\d{13}$/.test(digits)) return "discover";

  // Diners Club: 300–305, 36, 38
  if (/^3(?:0[0-5]\d{11}|[68]\d{12})$/.test(digits)) return "diners";

  // JCB: 3528–3589
  if (/^35(?:2[89]|[3-8]\d)\d{12}$/.test(digits)) return "jcb";

  // UnionPay: 62
  if (/^62\d{14,17}$/.test(digits)) return "unionpay";

  return null;
}

// ── IBAN Validation ─────────────────────────────────────────────────

/**
 * Validate an International Bank Account Number (IBAN).
 *
 * Uses the ISO 13616 mod-97 check.
 */
export function validateIban(iban: string): boolean {
  const cleaned = iban.replace(/[\s-]/g, "").toUpperCase();

  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(cleaned)) return false;

  // Move first 4 characters to end
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);

  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  let numStr = "";
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      numStr += (code - 55).toString();
    } else {
      numStr += ch;
    }
  }

  // Mod-97 on the large number (process in chunks)
  let remainder = 0;
  for (let i = 0; i < numStr.length; i += 7) {
    const chunk = remainder.toString() + numStr.slice(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }

  return remainder === 1;
}

/**
 * Format an IBAN string with spaces every 4 characters.
 */
export function formatIban(iban: string): string {
  const cleaned = iban.replace(/[\s-]/g, "").toUpperCase();
  return cleaned.replace(/(.{4})(?=.)/g, "$1 ");
}

// ── HTML Sanitization ───────────────────────────────────────────────

/** Tags considered dangerous and always removed. */
const DANGEROUS_TAGS = new Set([
  "script", "style", "iframe", "object", "embed", "applet",
  "form", "input", "textarea", "select", "button",
  "link", "meta", "base",
]);

/** Attributes that can execute code. */
const DANGEROUS_ATTRS = /\s*(?:on\w+|srcdoc|formaction|action|xlink:href|data)\s*=/gi;

/**
 * Sanitize HTML by stripping dangerous tags and event-handler attributes.
 *
 * Removes script, style, iframe, form elements, and on* event attributes.
 * Preserves safe HTML structure.
 */
export function sanitizeHtml(html: string): string {
  let result = html;

  // Remove dangerous tags and their content
  for (const tag of DANGEROUS_TAGS) {
    const openClose = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, "gi");
    result = result.replace(openClose, "");
    // Self-closing
    const selfClose = new RegExp(`<${tag}\\b[^>]*/?>`, "gi");
    result = result.replace(selfClose, "");
  }

  // Remove dangerous attributes from remaining tags
  result = result.replace(/<([a-zA-Z][a-zA-Z0-9]*)\s([^>]*?)>/g, (_match, tag: string, attrs: string) => {
    const cleanAttrs = attrs.replace(DANGEROUS_ATTRS, "");
    // Remove javascript: URLs
    const safeAttrs = cleanAttrs.replace(/(?:href|src)\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, "");
    return safeAttrs.trim() ? `<${tag} ${safeAttrs.trim()}>` : `<${tag}>`;
  });

  return result;
}

/**
 * Strip all HTML tags from a string, returning plain text.
 */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}
