export * from './resolver-return-types';
import { DynamodbUtil } from './dynamodb-utils';
import { RdsUtil } from './rds-utils';
import { StringUtils } from './string-utils';
import { TimeUtils } from './time-utils';
import { HttpUtils } from './http-utils';
import { XmlUtils } from './xml-utils';
import { MathUtils } from './math-utils';
import { TransformUtils } from './transform-utils';
import { SubscriptionFilter } from './subscription-filter-types';
type SubscriptionInvalidationObject = {
    subscriptionField: string;
    payload: Record<string, any>;
};
/**
 * The Util object contains general utility methods to help you work with data.
 */
export type Util = {
    /**
     * Returns the input string as a JavaScript escaped string.
     * @param {string} value - String value to escape
     * @returns {string} - JavaScript escaped string
     */
    escapeJavaScript(value: string): string;
    /**
     * Returns the input string as an `application/x-www-form-urlencoded` encoded string.
     * @param {string} value - string value to encode
     * @returns {string} - Url encoded string
     */
    urlEncode(value: string): string;
    /**
     * Decodes an `application/x-www-form-urlencoded` encoded string back to its non-encoded form.
     * @param {string} value - String value to decode
     * @returns {string} - Url decoded string
     */
    urlDecode(value: string): string;
    /**
     * Encodes string to a base64 string
     * @param {string} value - string to be encoded
     * @returns {string} - base64 encode string
     */
    base64Encode(bytes: string): string;
    /**
     * Decodes a base64 encoded string
     * @param {string} value - base64 encoded string
     * @returns {string} - base64 decoded string
     */
    base64Decode(value: string): string;
    /**
     * Returns a 128-bit randomly generated UUID.
     * @returns {string} - Randomly generated UUID
     */
    autoId(): string;
    /**
     * Returns a 128-bit randomly generated ULID (Universally Unique Lexicographically Sortable
     * Identifier).
     * @returns {string} - Randomly generated UUID
     */
    autoUlid(): string;
    /**
     * Returns a 128-bit randomly generated KSUID (K-Sortable Unique Identifier) base62 encoded as
     * a String with a length of 27.
     * @returns {string} - Randomly generated UUID
     */
    autoKsuid(): string;
    /**
     * Throws Unauthorized for the field being resolved. Use this in request or response mapping
     * templates to determine whether to allow the caller to resolve the field.
     */
    unauthorized(): never;
    /**
     * Throws a custom error. Use this in request or response mapping templates to detect an error
     * with the request or with the invocation result. You can also specify an `errorType` and a
     * `data` field, and an `errorInfo` field. The `data` value will be added to the corresponding
     * `error` block inside `errors` in the GraphQL response. Note: `data` will be filtered based
     * on the query selection set. The `errorInfo` value will be added to the corresponding `error`
     * block inside `errors` in the GraphQL response. Note: `errorInfo` will NOT be filtered based
     * on the query selection set.
     * @param {string} msg - Custom error message
     * @param {string} errorType? - Custom error type
     * @param {any} data? - Custom data object
     * @param {any} errorInfo? - Error info object
     */
    error(msg: string, errorType?: string, data?: any, errorInfo?: any): never;
    /**
     * Appends a custom error. Use this in request or response mapping templates to detect an error
     * with the request or with the invocation result. You can also specify an `errorType` and a
     * `data` field, and an `errorInfo` field. The `data` value will be added to the corresponding
     * `error` block inside `errors` in the GraphQL response. Note: `data` will be filtered based
     * on the query selection set. The `errorInfo` value will be added to the corresponding `error`
     * block inside `errors` in the GraphQL response. Note: `errorInfo` will NOT be filtered based
     * on the query selection set. Unlike `Util.error`, the template evaluation will not be
     * interuppted, so that data can be returned to the caller.
     * @param  {string} msg - Custom error message
     * @param {string} errorType? - Custom error type
     * @param {any} data? - Custom data object
     * @param {any} errorInfo? - Error info object
     * @returns void
     */
    appendError(msg: string, errorType?: string, data?: any, errorInfo?: any): void;
    /**
     * Returns true if the specified pattern in the first argument matches the supplied data in the
     * second argument. The pattern must be a regular expression such as `Util.matches("a*b",
     * "aaaaab")`. The functionality is based on Pattern, which you can reference for further
     * documentation.
     * @param {string} pattern - Regex pattern to match
     * @param {string} value - Value to match pattern against
     * @returns {boolean} - Indicates match was found
     */
    matches(pattern: string, value: string): boolean;
    /**
     * Returns a String describing the multi-auth type being used by a request, returning back
     * either "IAM Authorization", "User Pool Authorization", "Open ID Connect Authorization", or
     * "API Key Authorization".
     * @returns {string} - Auth type
     */
    authType(): string;
    /**
     * The `util.time` variable contains datetime methods to help generate timestamps, convert
     * between datetime formats, and parse datetime strings. The syntax for datetime formats is
     * based on DateTimeFormatter which you can reference for further documentation. Below we
     * provide some examples, as well as a list of available methods and descriptions.
     */
    time: TimeUtils;
    /**
     * `util.dynamodb` contains helper methods that make it easier to write and read data to Amazon
     * DynamoDB, such as automatic type mapping and formatting. These methods are designed to make
     * mapping primitive types and Lists to the proper DynamoDB input format automatically, which
     * is a Map of the format `{ "TYPE" : VALUE }`.
     */
    dynamodb: DynamodbUtil;
    /**
     * `util.rds` contains helper methods that makes it easier to write and read data from Amazon
     * RDS.
     */
    rds: RdsUtil;
    /**
     * The `util.http` utility provides helper methods that you can use to manage HTTP request
     * parameters and to add response headers.
     */
    http: HttpUtils;
    /**
     *  `util.xml` contains helper methods that can make it easier to translate XML responses
     * to JSON or a Dictionary.
     */
    xml: XmlUtils;
    /**
     * `util.transform` contains helper methods that make it easier to perform complex operations
     * against data sources, such as Amazon DynamoDB filter operations.
     */
    transform: TransformUtils;
    /**
     * `util.math1 contains methods to help with common Math operations.
     */
    math: MathUtils;
    /**
     * `util.str` contains methods to help with common String operations.
     */
    str: StringUtils;
};
type Context<TArgs extends Record<string, any> | unknown = any, TStash extends Record<string, any> = Record<string, any>, TPrev extends Record<string, any> | undefined = any, TSource extends Record<string, any> | undefined = any, TResult extends any = any> = {
    /**
     * A map that contains all GraphQL arguments for this field.
     */
    arguments: TArgs;
    /**
     * A map that contains all GraphQL arguments for this field.
     */
    args: TArgs;
    /**
     * An object that contains information about the caller. For more information about the
     * structure of this field, see Identity.
     */
    identity: Identity;
    /**
     * A map that contains the resolution of the parent field.
     */
    source?: TSource;
    /**
     * Contains potential error generated by a request.
     */
    error?: {
        /**
         * Details about the message
         */
        message: string;
        /**
         * type of error
         */
        type: string;
    };
    /**
     * The stash is a map that is made available inside each resolver and function mapping
     * template. The same stash instance lives through a single resolver execution. This means
     * that you can use the stash to pass arbitrary data across request and response mapping
     * templates, and across functions in a pipeline resolver. The stash exposes the same
     * methods as the Java Map data structure.
     */
    stash: TStash;
    /**
     * A container for the results of this resolver. This field is available only to response
     * mapping templates.
     *
     * For example, if you're resolving the author field of the following query:
     * ```
     * query {
     *     getPost(id: 1234) {
     *         postId
     *         title
     *         content
     *         author {
     *             id
     *             name
     *         }
     *     }
     * }
     * ```
     *
     * Then the full context variable that is available when processing a response mapping template might be:
     * ```
     * {
     *   "arguments" : {
     *     id: "1234"
     *   },
     *   "source": {},
     *   "result" : {
     *       "postId": "1234",
     *       "title": "Some title",
     *       "content": "Some content",
     *       "author": {
     *         "id": "5678",
     *         "name": "Author Name"
     *       }
     *   },
     *   "identity" : {
     *       "sourceIp" : ["x.x.x.x"],
     *       "userArn" : "arn:aws:iam::123456789012:user/appsync",
     *       "accountId" : "666666666666",
     *       "user" : "AIDAAAAAAAAAAAAAAAAAA"
     *   }
     * }
     * ```
     */
    result: TResult;
    /**
     * The result of whatever previous operation was executed in a pipeline resolver. If the
     * previous operation * was the pipeline resolver request mapping template, then
     * `context.prev.result` represents the output of the evaluation of the template, and is made
     * available to the first function in the pipeline. If the previous operation was the first
     * function, then context.prev.result represents the output of the first function, and is made
     * available to the second function in the pipeline. If the previous operation was the last
     * function, then context.prev.result represents the output of the first function, and is made
     * available to the second function in the pipeline. If the previous operation was the last
     * function, then context.prev.result represents the output of the last function, and is made
     * available to the pipeline resolver response mapping template.
     */
    prev: TPrev;
    /**
     * AWS AppSync supports passing custom headers from clients and accessing them in your GraphQL
     * resolvers by using context.request.headers. You can then use the header values for actions
     * such as inserting data into a data source or authorization checks.
     */
    request: Request;
    /**
     * An object that contains information about the GraphQL request. For the structure of this
     * field, see Info.
     */
    info: Info;
};
export type Identity = AppSyncIdentityIAM | AppSyncIdentityCognito | AppSyncIdentityOIDC | AppSyncIdentityLambda | undefined | null;
export type AppSyncIdentityIAM = {
    /**
     * The AWS account ID of the caller.
     */
    accountId: string;
    /**
     * The Amazon Cognito identity pool ID associated with the caller.
     */
    cognitoIdentityPoolId: string;
    /**
     * The Amazon Cognito identity ID of the caller.
     */
    cognitoIdentityId: string;
    /**
     * The source IP address of the caller that AWS AppSync receives. If the request doesn't
     * include the `x-forwarded-for` header, the source IP value contains only a single IP address
     * from the TCP connection. If the request includes a `x-forwarded-for` header, the source IP
     * is a list of IP addresses from the `x-forwarded-for` header, in addition to the IP address
     * from the TCP connection.
     */
    sourceIp: string[];
    /**
     * The user name of the authenticated user. In the case of `AMAZON_COGNITO_USER_POOLS`
     * authorization, the value of username is the value of attribute `cognito:username`. In the
     * case of `AWS_IAM` authorization, the value of username is the value of the AWS user
     * principal. If you're using IAM authorization with credentials vended from Amazon Cognito
     * identity pools, we recommend that you use `cognitoIdentityId`.
     */
    username: string;
    /**
     * The Amazon Resource Name (ARN) of the IAM user.
     */
    userArn: string;
    /**
     * Either authenticated or unauthenticated based on the identity type.
     */
    cognitoIdentityAuthType: string;
    /**
     * A comma-separated list of external identity provider information used in obtaining the
     * credentials used to sign the request.
     */
    cognitoIdentityAuthProvider: string;
};
export type AppSyncIdentityCognito = {
    /**
     * The source IP address of the caller that AWS AppSync receives. If the request doesn't
     * include the `x-forwarded-for` header, the source IP value contains only a single IP address
     * from the TCP connection. If the request includes a `x-forwarded-for` header, the source IP
     * is a list of IP addresses from the `x-forwarded-for` header, in addition to the IP address
     * from the TCP connection.
     */
    sourceIp: string[];
    /**
     * The user name of the authenticated user. In the case of `AMAZON_COGNITO_USER_POOLS`
     * authorization, the value of username is the value of attribute `cognito:username`. In the
     * case of `AWS_IAM` authorization, the value of username is the value of the AWS user
     * principal. If you're using IAM authorization with credentials vended from Amazon Cognito
     * identity pools, we recommend that you use `cognitoIdentityId`.
     */
    username: string;
    /**
     * The groups the authenticated user belongs to.
     */
    groups: string[] | null;
    /**
     * The UUID of the authenticated user.
     */
    sub: string;
    /**
     * The token issuer.
     */
    issuer: string;
    /**
     * The claims that the user has.
     */
    claims: any;
    /**
     * The default authorization strategy for this caller (ALLOW or DENY).
     */
    defaultAuthStrategy: string;
};
export type AppSyncIdentityOIDC = {
    /**
     * The UUID of the authenticated user.
     */
    sub: string;
    /**
     * The token issuer.
     */
    issuer: string;
    /**
     * The claims that the user has.
     */
    claims: any;
};
export type AppSyncIdentityLambda = {
    /**
     * content returned by the Lambda function authorizing the request.
     */
    resolverContext: any;
};
export type Extensions = {
    /**
     * Evicts an item from the AWS AppSync server-side cache. The first argument is the type name.
     * The second argument is the field name. The third argument is an object containing key-value pair
     * items that specify the caching key value. You must put the items in the object in the same order
     * as the caching keys in the cached resolver's cachingKey.
     * __Note:__ This utility works only for mutations, not queries.
     */
    evictFromApiCache(typeName: string, fieldName: string, keyValuePair: Record<string, string>): void;
    /**
     * Defines enhanced subscription filters. Each subscription notification event is
     * evaluated against provided subscription filters and delivers notifications to
     * clients if all filters evaluate to true.
     * @param filter
     */
    setSubscriptionFilter(filter: SubscriptionFilter): void;
    /**
     * Defines subscription invalidation filters. Subscription filters are evaluated
     * against the invalidation payload, then invalidate a given subscription if the
     * filters evaluate to true
     * @param filter
     */
    setSubscriptionInvalidationFilter(filter: SubscriptionFilter): void;
    /**
     * Used to initiate a subscription invalidation from a mutation.
     *
     * The InvalidationObject defines the following:
     *   * subscriptionField – The GraphQL schema subscription to invalidate. A single subscription,
     *     defined as a string in the subscriptionField, is considered for invalidation.
     *   * payload – A key-value pair list that's used as the input for invalidating subscriptions
     *     if the invalidation filter evaluates to true against their values.
     *
     * @param obj
     */
    invalidateSubscriptions(obj: SubscriptionInvalidationObject): void;
};
export type Request = {
    /**
     * AWS AppSync supports passing custom headers from clients and accessing them in your GraphQL
     * resolvers by using context.request.headers. You can then use the header values for actions
     * such as inserting data into a data source or authorization checks.
     */
    headers: any;
    /**
     * AWS AppSync supports configuring a custom domain that you can use to access your GraphQL and
     * real-time endpoints for your APIs. When making a request with a custom domain name, you can
     * get the domain name using context.request.domainName.
     */
    domainName: string | null;
};
export type Info = {
    /**
     * The name of the field that is currently being resolved.
     */
    fieldName: string;
    /**
     * The name of the parent type for the field that is currently being resolved.
     */
    parentTypeName: string;
    /**
     * A map which holds all variables that are passed into the GraphQL request.
     */
    variables: Record<string, any>;
    /**
     * A list representation of the fields in the GraphQL selection set. Fields that are aliased
     * are referenced only by the alias name, not the field name. The following example shows this
     * in detail.
     */
    selectionSetList: string[];
    /**
     * A string representation of the selection set, formatted as GraphQL schema definition
     * language (SDL). Although fragments aren't merged into the selection set, inline fragments
     * are preserved, as shown in the following example.
     */
    selectionSetGraphQL: string;
};
/**
 * The runtime object provides information and control over the current execution AppSync function
 * or resolver.
 */
type Runtime = {
    /**
     * Invoking this function will halt execution of the current function (AppSync Function) or
     * resolver (Unit or Pipeline Resolver) depending on the current context and return the specified
     * object as the result.
     *  * When called in an AppSync function request handler, the data Source and response handler
     *    are skipped and the next function request handler (or the pipeline resolver response
     *    handler if this was the last AppSync function) is called.
     *  * When called in an AppSync pipeline resolver request handler, the pipeline execution is
     *    skipped, and the pipeline resolver response handler is called immediately.
     *
     * @param obj Optional return value
     */
    earlyReturn(obj?: unknown): never;
};
declare global {
    var util: Util;
    var extensions: Extensions;
    var runtime: Runtime;
}
declare const util: Util;
declare const extensions: Extensions;
declare const runtime: Runtime;
export { DynamoDBBinaryResult, DynamoDBBooleanResult, DynamoDBBinarySetResult, DynamoDBListResult, DynamoDBMapResult, DynamoDBNullResult, DynamoDBNumberResult, DynamoDBNumberSetResult, DynamoDBStringResult, DynamoDBStringSetResult, DynamoDBReturnType, } from './dynamodb-utils';
export { DynamoDBExpressionOperation, DynamoDBFilterObject, OpenSearchQueryObject, OpenSearchQueryOperation, ShallowSubscriptionFilterObject, SubscriptionFilterExcludeKeysType, SubscriptionFilterObject, SubscriptionFilterOperation, SubscriptionFilterRuleObject, } from './transform-utils';
export { SubscriptionFilter } from './subscription-filter-types';
export { util, extensions, runtime, Context };
//# sourceMappingURL=index.d.ts.map