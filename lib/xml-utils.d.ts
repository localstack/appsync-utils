export type XmlUtils = {
    /**
     * Converts an XML string to a Dictionary.
     * ```
     * Input:
     *
     * <?xml version="1.0" encoding="UTF-8"?>
     * <posts>
     * <post>
     *   <id>1</id>
     *   <title>Getting started with GraphQL</title>
     * </post>
     * </posts>
     *
     * Output (JSON representation):
     *
     * {
     *   "posts":{
     *     "post":{
     *       "id":1,
     *       "title":"Getting started with GraphQL"
     *     }
     *   }
     * }
     * ```
     * @param {string} xml - XML string
     * @returns Record<string, any> - Object representation of XML
     */
    toMap(xml: string): Record<string, any> | null;
    /**
     * Converts an XML string to a JSON string. This is similar to toMap, except that the output is
     * a string. This is useful if you want to directly convert and return the XML response from an
     * HTTP object to JSON.
     * @param {string} xml - XML string
     * @returns {string} - JSON representation of XML
     */
    toJsonString(xml: string): string;
    /**
     * Converts an XML string to a JSON string with an optional Boolean parameter to determine if
     * you want to string-encode the JSON.
     * @param {string} xml - XML string
      * @param {boolean} stringEncode - Boolean to determine if you want to string-encode the JSON
     * @returns {string} - String encoded JSON representation of XML
     */
    toJsonString(xml: string, stringEncode: boolean): string;
};
//# sourceMappingURL=xml-utils.d.ts.map