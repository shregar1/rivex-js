/**
 * Datetime extensions — cron validation, timezone conversion.
 *
 * Pure Node.js implementations (no native dependencies).
 * Uses the built-in Intl API for timezone operations.
 */
// ── Cron Validation ─────────────────────────────────────────────────
/**
 * Validate a basic cron expression (5-field format).
 *
 * Fields: minute hour day-of-month month day-of-week
 *
 * Supports: numbers, ranges (1-5), lists (1,3,5), steps (*​/15),
 * wildcards (*), and standard named months/days.
 */
export function cronValidate(expression) {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5)
        return false;
    const ranges = [
        [0, 59], // minute
        [0, 23], // hour
        [1, 31], // day of month
        [1, 12], // month
        [0, 7], // day of week (0 and 7 = Sunday)
    ];
    for (let i = 0; i < 5; i++) {
        if (!validateCronField(parts[i], ranges[i][0], ranges[i][1])) {
            return false;
        }
    }
    return true;
}
function validateCronField(field, min, max) {
    // Handle lists: "1,5,10"
    const items = field.split(",");
    for (const item of items) {
        if (!validateCronItem(item, min, max))
            return false;
    }
    return true;
}
function validateCronItem(item, min, max) {
    // Step: "*/5" or "1-10/2"
    const slashIdx = item.indexOf("/");
    let base = item;
    if (slashIdx !== -1) {
        base = item.slice(0, slashIdx);
        const step = item.slice(slashIdx + 1);
        if (!/^\d+$/.test(step) || parseInt(step, 10) < 1)
            return false;
    }
    // Wildcard
    if (base === "*")
        return true;
    // Range: "1-5"
    const dashIdx = base.indexOf("-");
    if (dashIdx !== -1) {
        const left = base.slice(0, dashIdx);
        const right = base.slice(dashIdx + 1);
        if (!/^\d+$/.test(left) || !/^\d+$/.test(right))
            return false;
        const l = parseInt(left, 10);
        const r = parseInt(right, 10);
        return l >= min && r <= max && l <= r;
    }
    // Single number
    if (!/^\d+$/.test(base))
        return false;
    const val = parseInt(base, 10);
    return val >= min && val <= max;
}
// ── Timezone Conversion ─────────────────────────────────────────────
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
export function convertTimezone(datetime, fromTz, toTz) {
    // If the datetime has no timezone offset, interpret it in the source timezone.
    // We do this by finding the UTC offset of fromTz at the given local time, then
    // constructing a proper UTC timestamp.
    let date;
    const hasOffset = /[Zz]|[+-]\d{2}(:\d{2})?$/.test(datetime.trim());
    if (hasOffset) {
        date = new Date(datetime);
    }
    else {
        // Interpret the naive datetime in fromTz by computing the offset
        const naive = new Date(datetime + "Z"); // parse as UTC first
        if (isNaN(naive.getTime())) {
            throw new Error(`Invalid datetime string: ${datetime}`);
        }
        // Find the offset of fromTz at approximately this time
        const fromFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: fromTz,
            timeZoneName: "shortOffset",
        });
        const fromParts = fromFormatter.formatToParts(naive);
        const fromTzName = fromParts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
        const fromOffsetMs = parseOffsetToMs(fromTzName);
        // The naive time is the local time in fromTz, so UTC = local - offset
        date = new Date(naive.getTime() - fromOffsetMs);
    }
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid datetime string: ${datetime}`);
    }
    // Format in the target timezone
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: toTz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        fractionalSecondDigits: 3,
    });
    const parts = formatter.formatToParts(date);
    const get = (type) => parts.find((p) => p.type === type)?.value ?? "00";
    const year = get("year");
    const month = get("month");
    const day = get("day");
    const hour = get("hour") === "24" ? "00" : get("hour");
    const minute = get("minute");
    const second = get("second");
    const fractionalSecond = get("fractionalSecond");
    // Compute the UTC offset for the target timezone
    const targetFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: toTz,
        timeZoneName: "shortOffset",
    });
    const tzParts = targetFormatter.formatToParts(date);
    const tzName = tzParts.find((p) => p.type === "timeZoneName")?.value ?? "+00:00";
    // Parse offset from format like "GMT+5:30" or "GMT-8"
    let offsetStr = "+00:00";
    if (tzName === "GMT") {
        offsetStr = "+00:00";
    }
    else {
        const offsetMatch = tzName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
        if (offsetMatch) {
            const sign = offsetMatch[1];
            const hours = offsetMatch[2].padStart(2, "0");
            const minutes = (offsetMatch[3] ?? "00").padStart(2, "0");
            offsetStr = `${sign}${hours}:${minutes}`;
        }
    }
    return `${year}-${month}-${day}T${hour}:${minute}:${second}.${fractionalSecond}${offsetStr}`;
}
// ── Internal helpers ────────────────────────────────────────────────
function parseOffsetToMs(tzName) {
    if (tzName === "GMT")
        return 0;
    const match = tzName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
    if (!match)
        return 0;
    const sign = match[1] === "+" ? 1 : -1;
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3] ?? "0", 10);
    return sign * (hours * 60 + minutes) * 60 * 1000;
}
//# sourceMappingURL=datetime_ext.js.map