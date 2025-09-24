/**
 * Timezone Utility Functions
 * 
 * This utility provides consistent timezone handling across the entire backend system.
 * All date/time operations should use these functions to ensure consistency.
 */

export class TimezoneUtil {
    /**
     * IST timezone constant
     */
    static readonly IST_TIMEZONE = 'Asia/Kolkata';
    
    /**
     * IST offset in milliseconds (UTC+05:30)
     */
    static readonly IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

    /**
     * Convert a UTC date to IST for display purposes
     * @param utcDate - Date in UTC
     * @returns Date object (no manual offset - let formatting methods handle timezone)
     */
    static toIST(utcDate: Date): Date {
        // Return the original date - let the formatting methods handle timezone conversion
        return new Date(utcDate);
    }

    /**
     * Format date for display in IST timezone
     * @param date - Date to format
     * @param options - Intl.DateTimeFormatOptions
     * @returns Formatted date string in IST
     */
    static formatDateIST(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
        const defaultOptions: Intl.DateTimeFormatOptions = {
            timeZone: this.IST_TIMEZONE,
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            ...options
        };
        return new Date(date).toLocaleDateString('en-IN', defaultOptions);
    }

    /**
     * Format time for display in IST timezone
     * @param date - Date to format
     * @param options - Intl.DateTimeFormatOptions
     * @returns Formatted time string in IST
     */
    static formatTimeIST(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
        const defaultOptions: Intl.DateTimeFormatOptions = {
            timeZone: this.IST_TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            ...options
        };
        return new Date(date).toLocaleTimeString('en-GB', defaultOptions);
    }

    static formatTimeUTC(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
        const defaultOptions: Intl.DateTimeFormatOptions = {
            timeZone: "UTC",   // keep UTC
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            ...options,
        };
        return new Date(date).toLocaleTimeString("en-US", defaultOptions);
    }

    /**
     * Format date and time for display in IST timezone
     * @param date - Date to format
     * @param options - Intl.DateTimeFormatOptions
     * @returns Formatted date and time string in IST
     */
    static formatDateTimeIST(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
        const defaultOptions: Intl.DateTimeFormatOptions = {
            timeZone: this.IST_TIMEZONE,
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            ...options
        };
        return new Date(date).toLocaleString('en-IN', defaultOptions);
    }

    /**
     * Create start of day in UTC for database queries
     * @param date - Date to get start of day for
     * @returns Start of day in UTC
     */
    static getStartOfDayUTC(date: Date): Date {
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        return startOfDay;
    }

    /**
     * Create end of day in UTC for database queries
     * @param date - Date to get end of day for
     * @returns End of day in UTC
     */
    static getEndOfDayUTC(date: Date): Date {
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);
        return endOfDay;
    }

    /**
     * Get current time in IST
     * @returns Current time (let formatting methods handle timezone conversion)
     */
    static nowIST(): Date {
        // Return current time - let the formatting methods handle timezone conversion
        return new Date();
    }

    /**
     * Get current time in UTC
     * @returns Current time in UTC
     */
    static nowUTC(): Date {
        return new Date();
    }

    /**
     * Parse date string and ensure it's treated as UTC
     * @param dateString - Date string to parse
     * @returns Date object in UTC
     */
    static parseAsUTC(dateString: string): Date {
        return new Date(dateString);
    }

    /**
     * Create date range for database queries (start and end of day in UTC)
     * @param date - Date to create range for
     * @returns Object with start and end of day in UTC
     */
    static createDateRangeUTC(date: Date): { start: Date; end: Date } {
        return {
            start: this.getStartOfDayUTC(date),
            end: this.getEndOfDayUTC(date)
        };
    }
}

/**
 * Common timezone formatting functions for easy import
 */
export const formatDateIST = TimezoneUtil.formatDateIST;
export const formatTimeIST = TimezoneUtil.formatTimeIST;
export const formatDateTimeIST = TimezoneUtil.formatDateTimeIST;
export const toIST = TimezoneUtil.toIST;
export const nowIST = TimezoneUtil.nowIST;
export const nowUTC = TimezoneUtil.nowUTC;
