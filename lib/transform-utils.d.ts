import { SubscriptionFilter } from './subscription-filter-types';
export type Prettify<T> = {
    [k in keyof T]: T[k];
} & {};
export type DynamoDBAttributeTypeValues = '_null' | 'string' | 'stringSet' | 'number' | 'numberSet' | 'binary' | 'binarySet' | 'boolean' | 'list' | 'map';
type DynamoDBAttributeOperator = {
    attributeType?: DynamoDBAttributeTypeValues | null;
    attributeExists?: boolean | null;
};
type DynamoDBOperator<T> = DynamoDBAttributeOperator & T;
export type DynamoDBEqualityOperators<T> = {
    ne?: T | null;
    eq?: T | null;
};
type DynamoDBScalarNumberOperators<T> = DynamoDBEqualityOperators<T> & {
    le?: T | null;
    lt?: T | null;
    ge?: T | null;
    gt?: T | null;
    in?: T[] | null;
};
type DynamoDBNumberOperators<T> = DynamoDBScalarNumberOperators<T> & {
    between?: [T, T] | null;
};
type DynamoDBStringOperators<T> = DynamoDBScalarNumberOperators<T> & {
    beginsWith?: T | null;
    contains?: T | null;
    notContains?: T | null;
};
type DynamoDBBooleanOperators<T> = DynamoDBEqualityOperators<T>;
type DynamoDBArrayOperators<T> = {
    contains?: T | null;
    notContains?: T | null;
};
export type DynamoDBExpressionOperation<TOperand = unknown> = TOperand extends (infer U)[] ? DynamoDBOperator<DynamoDBArrayOperators<NonNullable<U>>> : TOperand extends boolean ? DynamoDBOperator<DynamoDBBooleanOperators<NonNullable<boolean>>> : TOperand extends number ? DynamoDBOperator<DynamoDBNumberOperators<NonNullable<number>>> : TOperand extends string ? DynamoDBOperator<DynamoDBStringOperators<NonNullable<string>>> : TOperand extends Record<string, unknown> ? ShallowDynamoDBFilterObject<TOperand> : any;
export type ShallowDynamoDBFilterObject<T = unknown> = T extends Record<string, any> ? Prettify<{
    [k in keyof T]?: DynamoDBExpressionOperation<NonNullable<T[k]>> | null;
}> : any;
export type DynamoDBFilterObject<T = unknown> = T extends Record<string, any> ? Prettify<ShallowDynamoDBFilterObject<NonNullable<T>> & {
    and?: DynamoDBFilterObject<T> | DynamoDBFilterObject<T>[] | null;
    or?: DynamoDBFilterObject<T> | DynamoDBFilterObject<T>[] | null;
    not?: DynamoDBFilterObject<T> | null;
}> : {};
type OpenSearchBaseOperators = {
    exists?: boolean;
};
type OpenSearchEqualityOperators<T> = {
    eq?: T;
    ne?: T;
};
type OpenSearchScalarNumberOperators<T> = OpenSearchEqualityOperators<T> & {
    gt?: T;
    gte?: T;
    lt?: T;
    lte?: T;
};
type OpenSearchNumberOperators<T> = OpenSearchScalarNumberOperators<T> & {
    range?: [T, T];
};
type OpenSearchStringOperators<T> = OpenSearchEqualityOperators<T> & {
    match?: T;
    matchPhrase?: T;
    matchPhrasePrefix?: T;
    wildcard?: T;
    regexp?: T;
    multiMatch?: T;
};
type OpenSearchBooleanOperators<T> = OpenSearchEqualityOperators<T>;
export type OpenSearchQueryOperation<TOperand = unknown> = TOperand extends boolean ? OpenSearchBaseOperators & OpenSearchBooleanOperators<boolean> : TOperand extends number ? OpenSearchBaseOperators & OpenSearchNumberOperators<number> : TOperand extends string ? OpenSearchBaseOperators & OpenSearchStringOperators<string> : TOperand extends boolean[] ? OpenSearchBaseOperators & OpenSearchBooleanOperators<boolean> : TOperand extends number[] ? OpenSearchBaseOperators & OpenSearchNumberOperators<number> : TOperand extends string[] ? OpenSearchBaseOperators & OpenSearchStringOperators<string> : any;
export type ShallowOpenSearchQueryObject<T = unknown> = T extends Record<string, any> ? Prettify<{
    [k in keyof T]?: OpenSearchQueryOperation<NonNullable<T[k]>>;
}> : any;
export type OpenSearchQueryObject<T = unknown> = T extends Record<string, any> ? Prettify<ShallowOpenSearchQueryObject<NonNullable<T>> & {
    and?: OpenSearchQueryObject<T>[];
    or?: OpenSearchQueryObject<T>[];
    not?: OpenSearchQueryObject<T>;
}> : {};
export type SubscriptionFilterEqualityOperators<T> = {
    eq?: T;
    ne?: T;
};
export type SubscriptionFilterScalarNumberOperators<T> = SubscriptionFilterEqualityOperators<T> & {
    gt?: T;
    ge?: T;
    lt?: T;
    le?: T;
    in?: T[];
};
export type SubscriptionFilterNumberOperators<T> = SubscriptionFilterScalarNumberOperators<T> & {
    between?: [T, T];
};
export type SubscriptionFilterStringOperators<T> = SubscriptionFilterScalarNumberOperators<T> & {
    beginsWith?: T;
    contains?: T;
    notContains?: T;
    between?: [T, T];
};
export type SubscriptionFilterBooleanOperators<T> = SubscriptionFilterEqualityOperators<T>;
export type SubscriptionFilterArrayOperators<T> = {
    contains?: T;
    notContains?: T;
    containsAny?: T[];
};
export type SubscriptionFilterOperation<TOperand = unknown> = TOperand extends boolean ? SubscriptionFilterBooleanOperators<boolean> : TOperand extends number ? SubscriptionFilterNumberOperators<number> : TOperand extends string ? SubscriptionFilterStringOperators<string> : TOperand extends boolean[] ? SubscriptionFilterArrayOperators<boolean> : TOperand extends number[] ? SubscriptionFilterArrayOperators<number> : TOperand extends string[] ? SubscriptionFilterArrayOperators<string> : any;
export type ShallowSubscriptionFilterObject<T = unknown> = T extends Record<string, any> ? Prettify<{
    [k in keyof T]?: SubscriptionFilterOperation<NonNullable<T[k]>>;
}> : any;
export type SubscriptionFilterObject<T = unknown> = T extends Record<string, any> ? Prettify<ShallowSubscriptionFilterObject<NonNullable<T>> & {
    and?: SubscriptionFilterObject<T>[];
    or?: SubscriptionFilterObject<T>[];
}> : {};
export type SubscriptionFilterRuleObject<T = unknown> = T extends Record<string, any> ? ShallowSubscriptionFilterObject<T> : {};
type ExcludeConditions<T> = Exclude<T, 'and' | 'or'>;
export type SubscriptionFilterExcludeKeysType<T> = T extends Record<infer K, any> ? ExcludeConditions<K>[] : string[];
export type TransformUtils = {
    /**
     * Converts an input string to a filter expression for use with DynamoDB.
     * Input:
     * ```
     * util.transform.toDynamoDBFilterExpression({
     *     "title":{
     *       "contains":"Hello World"
     *     }
     *   })
     * ```
     * Output:
     * ```
     * {
     *     "expression" : "contains(#title, :title_contains)"
     *     "expressionNames" : {
     *         "#title" : "title",
     *     },
     *     "expressionValues" : {
     *         ":title_contains" : { "S" : "Hello World" }
     *     },
     * }
     * ```
     * @param {DynamoDBFilterObject<T>} filterObject - Object representing DynamoDB filter
     * @returns {string} - DynamoDB filter expression stringified object
     */
    toDynamoDBFilterExpression<T extends {
        [key: Exclude<string, 'and' | 'or' | 'not'>]: any;
    } = Record<string, any>>(filterObject: DynamoDBFilterObject<T>): string;
    /**
     * Converts the given input into its equivalent DynamoDB condition expression, returning it as a Json string.
     *
     * The default Operator is assumed to be `AND`. The method behaves similarly as toDynamoDBFilterExpression, except
     * that it supports the remaining method that Dynamo condition expression supports, such as size, attribute_exists.
     * @param  {any} conditionObject Object representing DynamoDB condition
     * @returns string the evaluated DynamoDB condition
     */
    toDynamoDBConditionExpression<T extends {
        [key: Exclude<string, 'and' | 'or' | 'not'>]: any;
    } = Record<string, any>>(conditionObject: DynamoDBFilterObject<T>): string;
    /**
     * Converts the given input into its equivalent OpenSearch Query DSL expression, returning it
     * as a JSON string.
      * Input:
     * ```
     * util.transform.toElasticsearchQueryDSL({
     *     "upvotes":{
     *         "ne":15,
     *         "range":[
     *             10,
     *             20
     *         ]
     *     },
     *     "title":{
     *         "eq":"hihihi",
     *         "wildcard":"h*i"
     *     }
     *   })
     * ```
  
     * Output:
     * ```
     * {
     *     "bool":{
     *       "must":[
     *           {
     *             "bool":{
     *               "must":[
     *                   {
     *                     "bool":{
     *                       "must_not":{
     *                         "term":{
     *                           "upvotes":15
     *                         }
     *                       }
     *                     }
     *                   },
     *                   {
     *                     "range":{
     *                       "upvotes":{
     *                         "gte":10,
     *                         "lte":20
     *                       }
     *                     }
     *                   }
     *               ]
     *             }
     *           },
     *           {
     *             "bool":{
     *               "must":[
     *                   {
     *                     "term":{
     *                       "title":"hihihi"
     *                     }
     *                   },
     *                   {
     *                   "wildcard":{
     *                       "title":"h*i"
     *                     }
     *                   }
     *               ]
     *             }
     *           }
     *       ]
     *     }
     * }
     * ```
     * The default operator is assumed to be AND.
     * @param {any} obj - Object representing OpenSearch Query
     * @returns {string} - JSON string of an OpenSearch Query DSL expression
     */
    toElasticsearchQueryDSL<T extends {
        [key: Exclude<string, 'and' | 'or' | 'not'>]: any;
    } = Record<string, any>>(obj: OpenSearchQueryObject<T>): string;
    /**
     * Converts a Map input object to a `SubscriptionFilter` expression object. The
     * `util.transform.toSubscriptionFilter` method is used as an input to the
     * `extensions.setSubscriptionFilter()` extension.
     * For more information, @see {@link https://docs.aws.amazon.com/appsync/latest/devguide/extensions.html#extensions-setSubscriptionInvalidationFilter|extensions.setSubscriptionFilter}
     
     * @param {Record<string, unknown>} obj - a Map input object that's converted to the `SubscriptionFilter` expression object
     * @param {string[]} ignoredFields - a List of field names that will be ignored in the first obj
     * @param {Record<string, unknown>} rules - a Map input object of strict rules that's
     * included while constructing the `SubscriptionFilter` expression object. These strict rules are
     * included in the `SubscriptionFilter` expression object in such a way that at least one of the
     * rules will be satisfied to pass the subscription filter.
     * @returns {SubscriptionFilter} Subscription Filter expression object
     */
    toSubscriptionFilter<T = Record<string, any>>(obj: SubscriptionFilterObject<T>, ignoredFields?: SubscriptionFilterExcludeKeysType<T>, rules?: SubscriptionFilterRuleObject<T>): SubscriptionFilter;
};
export {};
//# sourceMappingURL=transform-utils.d.ts.map