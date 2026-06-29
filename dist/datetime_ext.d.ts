/**
 * Datetime extensions — cron validation, timezone conversion.
 *
 * Pure Node.js implementations (no native dependencies).
 * Uses the built-in Intl API for timezone operations.
 */
/**
 * Validate a basic cron expression (5-field format).
 *
 * Fields: minute hour day-of-month month day-of-week
 *
 * Supports: numbers, ranges (1-5), lists (1,3,5), steps (*​/15),
 * wildcards (*), and standard named months/days.
 */
export declare function cronValidate(expression: string): boolean;
/**
 * Convert a datetime string from one timezone to another.
 *
 * Uses the built-in Intl.DateTimeFormat API for timezone support.
 * Accepts any IANA timezone identifier (e.g. "America/New_York", "Europe/London").
 *
 * @param datetime ISO 8601 datetime string (interpreted in `fromTz` if no offset present)
 * @param fromTz Source IANA timezone
 * @param toTz Target IANA timezone
 * @returns ISO 8601 string in the target timezone
 */
export declare function convertTimezone(datetime: string, fromTz: string, toTz: string): string;
//# sourceMappingURL=datetime_ext.d.ts.map