export type HttpUtils = {
    /**
     * Copies the header from the map without the restricted set of HTTP headers. You can use this
     * to forward request headers to your downstream HTTP endpoint.
     * @param {any} headers - Headers object
     * @returns {any} - Copy of headers minus restricted HTTP headers
     */
    copyHeaders<T extends {}>(headers: T): any;
    /**
     * Adds a single custom header with the name (String) and value (Object) of the response. The
     * following limitations apply:
     * * Header names can't match any of the existing or restricted AWS or AWS AppSync headers.
     * * Header names can't start with restricted prefixes, such as `x-amzn-` or `x-amz-`.
     * * The size of custom response headers can't exceed 4 KB. This includes header names and values.
     * * You should define each response header once per GraphQL operation. However, if you define a
     *   custom header with the same name multiple times, the most recent definition appears in the
     *   response. All headers count towards the header size limit regardless of naming.
     * ```
     * util.http.addResponseHeader("itemsCount", 7)
     * util.http.addResponseHeader("render", context.args.render)
     * ```
     * @param {string} name - Header name
     * @param {any} value - Header value
     */
    addResponseHeader(name: string, value: any): void;
    /**
     * Adds multiple response headers to the response from the specified map of names (String) and
     * values (Object).
     @see {@link HttpUtils.addResponseHeader} for quick reference to the restrictions.
     * also apply to this method.
     * ```
     * const headersMap = {headerInt: 12, headerString: 'stringValue', headerObject: {field1: 7, field2: 'string'}}
     * util.http.addResponseHeaders(headersMap)
     * ```
     * @param {any} headers - Headers map
     */
    addResponseHeaders(headers: Record<string, any>): void;
};
//# sourceMappingURL=http-utils.d.ts.map