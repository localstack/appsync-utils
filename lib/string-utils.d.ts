export type NormalizationType = 'nfc' | 'nfd' | 'nfkc' | 'nfkd';
export type StringUtils = {
    /**
     * Normalizes a string using one of the four unicode normalization forms: NFC, NFD, NFKC, or
     * NFKD. The first argument is the string to normalize. The second argument is either "nfc",
     * "nfd", "nfkc", or "nfkd" specifying the normalization type to use for the normalization
     * process.
     * @param {string} value - Value to be normalized
     * @param {('nfc' | 'nfd' | 'nfkc' | 'nfkd')} normalizationType Normalization type
     * @returns {string} Normalized string
     */
    normalize(value: string, normalizationType: NormalizationType): string;
};
//# sourceMappingURL=string-utils.d.ts.map