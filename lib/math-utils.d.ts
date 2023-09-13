export type MathUtils = {
    /**
     * Takes a double and rounds it to the nearest integer.
     * @param {number} input
     * @returns {number} - Rounded integer
     */
    roundNum: (input: number) => number;
    /**
     * Takes two numbers and returns the minimum value between the two numbers.
     * @param {number} input1
     * @param {number} input2
     * @returns {number} - Minimum value
     */
    minVal: (input1: number, input2: number) => number;
    /**
     * Takes two numbers and returns the maximum value between the two numbers.
     * @param {number} input1
     * @param {number} input2
     * @returns {number} - Maximum value
     */
    maxVal: (input1: number, input2: number) => number;
    /**
     * Returns a random double between 0 and 1.
     *
     * This function shouldn't be used for anything that needs high entropy
     * randomness (for example, cryptography).
     * @returns {number} - Random double between 0 and 1
     */
    randomDouble: () => number;
    /**
     * Returns a random integer value within the specified range,
     * with the first argument specifying the lower value of the range and the second argument specifying the upper value of the range.
     *
     * This function shouldn't be used for anything that needs high entropy
     * randomness (for example, cryptography).
     * @param {number} start - lower value of the range
     * @param {number} end - upper value of the range
     * @returns {number}  Random integer value within the specified range
     */
    randomWithinRange: (start: number, end: number) => number;
};
//# sourceMappingURL=math-utils.d.ts.map