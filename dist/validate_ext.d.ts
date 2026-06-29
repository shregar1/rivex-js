/**
 * Validation extensions — Luhn, credit card, IBAN, HTML sanitization.
 *
 * Pure Node.js implementations (no native dependencies).
 */
/**
 * Validate a number string using the Luhn algorithm.
 *
 * Commonly used for credit card numbers, IMEI, etc.
 */
export declare function luhnCheck(number: string): boolean;
/**
 * Detect the card type from a card number.
 *
 * @returns Card type name or null if unrecognized
 */
export declare function cardType(number: string): string | null;
/**
 * Validate an International Bank Account Number (IBAN).
 *
 * Uses the ISO 13616 mod-97 check.
 */
export declare function validateIban(iban: string): boolean;
/**
 * Format an IBAN string with spaces every 4 characters.
 */
export declare function formatIban(iban: string): string;
/**
 * Sanitize HTML by stripping dangerous tags and event-handler attributes.
 *
 * Removes script, style, iframe, form elements, and on* event attributes.
 * Preserves safe HTML structure.
 */
export declare function sanitizeHtml(html: string): string;
/**
 * Strip all HTML tags from a string, returning plain text.
 */
export declare function stripHtmlTags(html: string): string;
//# sourceMappingURL=validate_ext.d.ts.map