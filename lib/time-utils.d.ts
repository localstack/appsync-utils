export type TimeUtils = {
    /**
     * Returns a String representation of UTC in ISO8601 format.
     * @returns {string} - Current time formatted ISO8601
     */
    nowISO8601(): string;
    /**
     * Returns the number of seconds from the epoch of 1970-01-01T00:00:00Z to now.
     * @returns {number} - Current time in seconds
     */
    nowEpochSeconds(): number;
    /**
     * Returns the number of milliseconds from the epoch of 1970-01-01T00:00:00Z to now.
     * @returns {number} - Current time in milliseconds
     */
    nowEpochMilliSeconds(): number;
    /**
     * Returns a string of the current timestamp in UTC using the specified format from a String
     * input type.
     * @param {string} formatString - Date format string
     * @returns {string} - Current time formatted
     */
    nowFormatted(formatString: string): string;
    /**
     * Returns a string of the current timestamp for a timezone using the specified format and
     * timezone from String input types.
     * @param {string} formatString - Date format string
     * @param {string} timezone - Timezone
     * @returns {string} - Current time formatted
     */
    nowFormatted(formatString: string, timezone: string): string;
    /**
     * Parses a timestamp passed as a String, along with a format, and return the timestamp as
     * milliseconds since epoch.
     * @param {string} timestamp - Formatted timestamp
     * @param {string} formatString - Date format string
     * @returns {number} - Parsed time
     */
    parseFormattedToEpochMilliSeconds(timestamp: string, formatString: string): number;
    /**
     * Parses a timestamp passed as a String, along with a format and time zone, and return the
     * timestamp as milliseconds since epoch.
     * @param {string} timestamp - Formatted timestamp
     * @param {string} formatString - Date format string
     * @param {string} timezone - Timezone
     * @returns {number} - Parsed time
     */
    parseFormattedToEpochMilliSeconds(timestamp: string, formatString: string, timezone: string): number;
    /**
     * Parses an ISO8601 timestamp, passed as a String, and return the timestamp as milliseconds
     * since epoch.
     * @param {string} timestamp - ISO 8601 timestamp
     * @returns {number} - Parsed timestamp in milliseconds
     */
    parseISO8601ToEpochMilliSeconds(timestamp: string): number;
    /**
     * Converts an epoch milliseconds timestamp to an epoch seconds timestamp.
     * @param {number} milliseconds - Milliseconds since epoch
     * @returns {number} - Seconds since epoch
     */
    epochMilliSecondsToSeconds(milliseconds: number): number;
    /**
     * Converts a epoch milliseconds timestamp to an ISO8601 timestamp.
     * @param {number} milliseconds - Milliseconds since epoch
     * @returns {string} - Date in ISO 8601 format
     */
    epochMilliSecondsToISO8601(milliseconds: number): string;
    /**
     * Converts a epoch milliseconds timestamp, passed as long, to a timestamp formatted according
     * to the supplied format in UTC.
     * @param {number} milliseconds - Milliseconds since epoch
     * @param {string} formatString - Date format string
     * @returns {string} - Formatted timestamp
     */
    epochMilliSecondsToFormatted(milliseconds: number, formatString: string): string;
    /**
     * Converts a epoch milliseconds timestamp, passed as long, to a timestamp formatted according
     * to the supplied format in UTC.
     * @param {number} milliseconds - Milliseconds since epoch
     * @param {string} formatString - Date format string
     * @param {string} timezone - Timezone
     * @returns {string} - Formatted timestamp
     */
    epochMilliSecondsToFormatted(milliseconds: number, formatString: string, timezone: string): string;
};
//# sourceMappingURL=time-utils.d.ts.map