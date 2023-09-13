export type DynamoDBStringResult = {
    S: string;
};
export type DynamoDBStringSetResult = {
    SS: string[];
};
export type DynamoDBNumberResult = {
    N: number;
};
export type DynamoDBNumberSetResult = {
    NS: string[];
};
export type DynamoDBBinaryResult = {
    B: string;
};
export type DynamoDBBinarySetResult = {
    BS: string[];
};
export type DynamoDBBooleanResult = {
    BOOL: boolean;
};
export type DynamoDBNullResult = {
    NULL: null;
};
export type DynamoDBReturnType<T> = T extends string ? DynamoDBStringResult : T extends number ? DynamoDBNumberResult : T extends boolean ? DynamoDBBooleanResult : T extends null ? DynamoDBNullResult : T extends Record<string, unknown> ? DynamoDBMapResult<T> : T extends Array<infer U> ? DynamoDBListResult<U> : null;
export type DynamoDBMapResult<T extends Record<string, unknown>> = {
    M: {
        [K in keyof T]: DynamoDBReturnType<T[K]>;
    };
};
export type DynamoDBListResult<T> = {
    L: DynamoDBReturnType<T>[];
};
export type OptionalInputType<T> = T | null | undefined;
export type DynamodbUtil = {
    /**
     * General object conversion tool for DynamoDB that converts input objects to the appropriate
     * DynamoDB representation. It's opinionated about how it represents some types: for instance it will
     * use lists ("L") rather than sets ("SS", "NS", "BS"). This returns an object that describes
     * the DynamoDB attribute value.
     *
     * String example:
     * Input:
     * ```
     * util.dynamodb.toDynamoDB("foo")
     `* ``
     * Output:
     * ```
     * { "S" : "foo" }
     * ```
     *
     * Object example:
     * Input:
     * ```
     * util.dynamodb.toDynamoDB({ "foo": "bar", "baz" : 1234, "beep": [ "boop" ] })
     * ```
     * Output:
     * ```
     * {
     *   "M": {
     *     "foo": { "S": "bar" },
     *     "baz": { "N": 1234 },
     *     "beep": {
     *       "L": [{ "S": "boop" }]
     *     }
     *   }
     * }
     * ```
     * @param obj
     * @returns {object|null} - DynamoDB attribute object
     */
    toDynamoDB<T>(obj: T): DynamoDBReturnType<T>;
    /**
     * Convert an input string to the DynamoDB string format. This returns an object that describes
     * the DynamoDB attribute value.
     * @param {string|null|undefined} obj Object to convert to DynamoDB attribute value
     * @returns {DynamoDBReturnType<T>} - DynamoDB attribute object as string
     */
    toString(obj: OptionalInputType<string>): DynamoDBStringResult | null;
    /**
     * Converts a lists with Strings to the DynamoDB string set format. This returns an object that
     * describes the DynamoDB attribute value.
     
     * Input:
     * ```
     * util.dynamodb.toStringSet([ "foo", "bar", "baz" ])
     * ```
     * Output:
     * ```
     * { "SS" : [ "foo", "bar", "baz" ] }
     * ```
     * @param list - List to convert to DynamoDB attribute value
     * @returns {any} - DynamoDB attribute object
     */
    toStringSet(list: OptionalInputType<string[]>): DynamoDBStringSetResult | null;
    /**
     * Converts a number to the DynamoDB number format. This returns an object that describes the
     * DynamoDB attribute value.
     * Input:
     * ```
     * util.dynamodb.toNumber(12345)
     * ```
     * Output:
     * ````
     * { "N" : 12345 }
     * ```
     * @param {number} num - Number to convert to DynamoDB attribute value
     * @returns {DynamoDBNumberResult} - DynamoDB attribute object
     */
    toNumber(num: OptionalInputType<number>): DynamoDBNumberResult | null;
    /**
     * Converts a list of numbers to the DynamoDB number set format. This returns an object that
     * describes the DynamoDB attribute value.
     * ```
     * Input:      util.dynamodb.toNumberSet([ 1, 23, 4.56 ])
     * Output:     { "NS" : [ 1, 23, 4.56 ] }
     * ```
     * @param {number[]} numbers - Numbers to convert to DynamoDB number set
     * @returns {DynamoDBNumberSetResult} - DynamoDB attribute object
     */
    toNumberSet(numbers: OptionalInputType<number[]>): DynamoDBNumberSetResult | null;
    /**
     * Converts binary data encoded as a base64 string to DynamoDB binary format. This returns an
     * object that describes the DynamoDB attribute value.
     * Input:
     * ```
     * util.dynamodb.toBinary("foo")
     * ```
     * Output:
     * ```
     * { "B" : "foo" }
     * ```
     * @param {string} value - Base64 encoded string
     * @returns {DynamoDBBinaryResult} - DynamoDB attribute object
     */
    toBinary(value: OptionalInputType<string>): DynamoDBBinaryResult | null;
    /**
     * Converts a list of binary data encoded as base64 strings to DynamoDB binary set format. This
     * returns an object that describes the DynamoDB attribute value.
     * Input:
     * ```
     * util.dynamodb.toBinarySet([ "foo", "bar", "baz" ])
     * ```
     * Output:
     * ```
     * { "BS" : [ "foo", "bar", "baz" ] }
     * ```
     * @param {string[]} values - Base64 encoded string array
     * @returns {DynamoDBBinarySetResult} - DynamoDB attribute object
     */
    toBinarySet(values: OptionalInputType<string[]>): DynamoDBBinarySetResult | null;
    /**
     * Converts a Boolean to the appropriate DynamoDB Boolean format. This returns an object that
     * describes the DynamoDB attribute value.
     * Input:
     * ```
     * util.dynamodb.toBoolean(true)
     * ```
     * Output:
     * ```
     * { "BOOL" : true }
     * ```
     * @param {boolean} value - value to convert to DynamoDB attribute
     * @returns {DynamoDBBooleanResult} - DynamoDB attribute object
     */
    toBoolean(value: OptionalInputType<boolean>): DynamoDBBooleanResult | null;
    /**
     * Converts a Boolean to the appropriate DynamoDB Boolean format. This returns an object that
     * describes the DynamoDB attribute value.
     * Input:
     * ```
     * util.dynamodb.toNull()
     * ```
     * Output:
     * ```
     * { "NULL" : null }
     * ```
     * @returns {DynamoDBNullResult} - DynamoDB attribute object
     */
    toNull(): DynamoDBNullResult;
    /**
     * Converts a list of object to DynamoDB list format. Each item in the list is also converted
     * to its appropriate DynamoDB format. It's opinionated about how it represents some of the
     * nested objects: e.g., it will use lists ("L") rather than sets ("SS", "NS", "BS"). This
     * returns an object that describes the DynamoDB attribute value.
     * Input:
     * ```util.dynamodb.toList([ "foo", 123, { "bar" : "baz" } ])```
     * Output:
     * ```
     * {
     *  "L": [
     *    { "S": "foo" },
     *    { "N": 123 },
     *    {
     *      "M": {
     *        "bar": { "S": "baz" }
     *      }
     *    }
     *  ]
     * }
     * ```
     * @param {unknown[]} value - value to convert to DynamoDB attribute
     * @returns {DynamoDBListResult} - DynamoDB attribute object
     */
    toList<T>(value: OptionalInputType<T>): T extends Array<infer L> ? DynamoDBListResult<L> : null;
    /**
     * Converts a map to DynamoDB map format. Each value in the map is also converted to its
     * appropriate DynamoDB format. It's opinionated about how it represents some of the nested
     * objects: e.g., it will use lists ("L") rather than sets ("SS", "NS", "BS"). This returns
     * an object that describes the DynamoDB attribute value.
     * Input:
     * ```
     * util.dynamodb.toMap({ "foo": "bar", "baz" : 1234, "beep": [ "boop"] })
     * ```
     * Output:
     * ```
     * {
     *   "M": {
     *     "foo": { "S": "bar" },
     *     "baz": { "N": 1234 },
     *     "beep": {
     *       "L": [{ "S": "boop" }]
     *     }
     *   }
     * }
     * ```
     * @param {Record<string, unknown>} value - value to convert to DynamoDB attribute
     * @returns {{ M: Record<string, DynamoDBReturnType>}} - DynamoDB attribute object
     */
    toMap<T>(value: T): T extends Record<string, unknown> ? DynamoDBMapResult<T> : null;
    /**
     * Creates a copy of the map where each value has been converted to its appropriate DynamoDB
     * format. It's opinionated about how it represents some of the nested objects: for instance it will
     * use lists ("L") rather than sets ("SS", "NS", "BS").
     * ```
     * Input:
     * ```
     * util.dynamodb.toMapValues({ "foo": "bar", "baz" : 1234, "beep": [ "boop"] })
     * ```
     * Output:
     * ```
     * {
     *   "foo": { "S": "bar" },
     *   "baz": { "N": 1234 },
     *   "beep": {
     *     "L": [{ "S": "boop" }]
     *   }
     * }
     * ```
     * Note: this is slightly different to `util.dynamodb.toMap(Map)` as it returns only the
     * contents of the DynamoDB attribute value, but not the whole attribute value itself. For
     * example, the following statements are exactly the same:
     * ```
     * util.dynamodb.toMapValues(obj)
     * util.dynamodb.toMap(obj)["M"]
     * ```
     *
     * @param {Readonly<Record<string, unknown>>} value - value to convert to DynamoDB attribute
     * @returns {Record<string, DynamoDBReturnType> } - DynamoDB attribute object
     */
    toMapValues<T>(value: T): T extends Record<string, unknown> ? {
        [K in keyof T]: DynamoDBReturnType<T[K]>;
    } : null;
    /**
     * Converts the key, bucket and region into the DynamoDB S3 Object representation. This returns
     * an object that describes the DynamoDB attribute value.
     * Input:
     * ```
     * util.dynamodb.toS3Object("foo", "bar", "baz")
     * ```
     * Output:
     * ```
     * { "S" : "{ \"s3\" : { \"key\" : \"foo\", \"bucket\" : \"bar", \"region\" : \"baz" } }" }
     * ```
     * @param {string} key - S3 object key
     * @param {string} bucket - S3 bucket
     * @param {string} region - AWS Region
     * @returns {DynamoDBStringResult} - DynamoDB attribute object
     */
    toS3Object(key: string, bucket: string, region: string): DynamoDBStringResult | null;
    /**
     * Converts the key, bucket, region and optional version into the DynamoDB S3 Object
     * representation. This returns an object that describes the DynamoDB attribute value.
     * Input:
     * ```
     * util.dynamodb.toS3Object("foo", "bar", "baz", "beep")
     * ```
     * Output:
     * ```
     * {
     *   "S": "{ \"s3\" : { \"key\" : \"foo\", \"bucket\" : \"bar\", \"region\" : \"baz\", \"version\" = \"beep\" } }"
     * }
     *
     * ```
     * @param {string} key - S3 object key
     * @param {string} bucket - S3 bucket
     * @param {string} region - AWS Region
     * @param {string} version - S3 object version
     * @returns {DynamoDBStringResult} - DynamoDB attribute object
     */
    toS3Object(key: string, bucket: string, region: string, version: string): DynamoDBStringResult | null;
    /**
     * Accepts the string value of a DynamoDB S3 Object and returns a map that contains the key,
     * bucket, region and optional version.
     * @param s3ObjectString S3 object key
     * @returns {any} DynamoDB attribute object
     */
    fromS3ObjectJson(s3ObjectString: string): any;
};
//# sourceMappingURL=dynamodb-utils.d.ts.map
