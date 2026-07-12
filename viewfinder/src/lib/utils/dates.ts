import { CalendarDateTime } from "@internationalized/date";
import { DateTime } from "luxon";

// try to parse a value as a date using Luxon; returns DateTime or undefined
export function tryParseDate(v: any): DateTime | undefined {
    if (v == null || v === undefined) {
        return undefined;
    }

    if (typeof v === "string") {
        const s = v.trim();
        // Try ISO first
        let dt = DateTime.fromISO(s);
        if (dt.isValid) {
            return dt;
        }

        // Try RFC2822
        dt = DateTime.fromRFC2822(s);
        if (dt.isValid) {
            return dt;
        }
        // If it's numeric string, try as epoch
        const n = Number(s);
        if (!Number.isNaN(n)) {
            if (n > 1e12) {
                return DateTime.fromMillis(n);
            }

            if (n > 1e10) {
                return DateTime.fromMillis(n);
            }

            if (n > 1e9) {
                return DateTime.fromSeconds(n);
            }
        }
        return undefined;
    }

    if (typeof v === "number") {
        // Treat only large numbers as epoch timestamps (seconds or milliseconds).
        // Small integers (like image width/height, counts) should NOT be parsed as dates.
        if (v > 1e12) {
            return DateTime.fromMillis(v);
        }

        if (v > 1e10) {
            return DateTime.fromMillis(v);
        }

        if (v > 1e9) {
            return DateTime.fromSeconds(v);
        }

        return undefined;
    }

    return undefined;
}

/**
 * Returns the user's local IANA timezone identifier (e.g. "America/New_York").
 */
export function getLocalTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Converts a CalendarDateTime to a standard JavaScript Date in the user's local timezone.
 */
export function calendarDateTimeToDate(cdt: CalendarDateTime): Date {
    return cdt.toDate(getLocalTimeZone());
}

/**
 * Converts a standard JavaScript Date to a CalendarDateTime.
 */
export function toCalendarDateTime(d: Date): CalendarDateTime {
    return new CalendarDateTime(
        d.getFullYear(),
        d.getMonth() + 1,
        d.getDate(),
        d.getHours(),
        d.getMinutes(),
        d.getSeconds()
    );
}
