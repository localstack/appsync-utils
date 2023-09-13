import { DynamoDBScanRequest, DynamoDBQueryRequest, DynamoDBPutItemRequest, DynamoDBSyncRequest, DynamoDBDeleteItemRequest, DynamoDBUpdateItemRequest, DynamoDBGetItemRequest } from './resolver-return-types';
import { DynamoDBFilterObject, DynamoDBEqualityOperators, Prettify } from './transform-utils';
type DynamoDBSelectAttributes = 'ALL_ATTRIBUTES' | 'ALL_PROJECTED_ATTRIBUTES' | 'SPECIFIC_ATTRIBUTES';
type DynamoDBKeyPrimitives = string | number;
type DynamoDBPrimitiveFields<T> = {
    [K in keyof T]: T[K] extends DynamoDBKeyPrimitives ? K : never;
}[keyof T];
export type DynamoDBKey<T = unknown> = T extends Record<string, unknown> ? Prettify<Pick<{
    [K in keyof T]?: T[K] extends any[] ? never : T[K];
}, DynamoDBPrimitiveFields<T>>> : {};
type DynamoDBKeyConditionScalarNumberOperators<T> = DynamoDBEqualityOperators<T> & {
    le?: T;
    lt?: T;
    ge?: T;
    gt?: T;
};
type DynamoDBKeyConditionNumberOperators<T> = DynamoDBKeyConditionScalarNumberOperators<T> & {
    between?: [T, T];
};
type DynamoDBKeyConditionStringOperators<T> = DynamoDBKeyConditionNumberOperators<T> & {
    beginsWith?: T;
};
type DynamoDBKeyConditionExpressionOperation<TOperand = unknown> = TOperand extends number ? DynamoDBKeyConditionNumberOperators<NonNullable<number>> : TOperand extends string ? DynamoDBKeyConditionStringOperators<NonNullable<string>> : never;
type DynamoDBKeyCondition<T = unknown> = T extends Record<string, unknown> ? Prettify<Pick<{
    [k in keyof T]?: T[k] extends DynamoDBKeyPrimitives ? DynamoDBKeyConditionExpressionOperation<T[k]> : never;
}, DynamoDBPrimitiveFields<T>>> : {};
export type ScanInput<T> = {
    /**
     * optional name of the index to scan
     */
    index?: string | null;
    /**
     * optional max number of results to return
     */
    limit?: number | null;
    /**
     * optional filter to apply to the results after retrieving it from the table
     */
    filter?: DynamoDBFilterObject<T> | null;
    /**
     * Optional pagination token to continue a previous query. This would have been obtained from a previous query
     */
    nextToken?: string | null;
    /**
     * an optional boolean to indicate consistent reads when querying DynamoDB defaults to false.
     */
    consistentRead?: boolean | null;
    totalSegments?: number;
    segment?: number;
    /**
     * attributes to return from DynamoDB. By default, the AWS AppSync DynamoDB resolver only returns
     * attributes that are projected into the index. The supported values are
     * `ALL_ATTRIBUTES`
     *  - Returns all of the item attributes from the specified table or index.
     *     If you query a local secondary index, DynamoDB fetches the entire item from
     *     the parent table for each matching item in the index. If the index is
     *     configured to project all item attributes, all of the data can be obtained from
     *     the local secondary index and no fetching is required.
     *
     * `ALL_PROJECTED_ATTRIBUTES`
     *  - Returns all attributes that have been projected into the index.
     *     If the index is configured to project all attributes, this return value is
     *     equivalent to specifying `ALL_ATTRIBUTES`.
     *
     * `SPECIFIC_ATTRIBUTES`
     *  - Returns only the attributes listed in `ProjectionExpression`.
     *     This return value is equivalent to specifying `ProjectionExpression` without
     *     specifying any value for `AttributesToGet`.
     *
     */
    select?: DynamoDBSelectAttributes;
    /**
     * optional boolean to indicate whether the query is performed in ascending or descending order.
     *
     * @default true
     */
    scanIndexForward?: boolean | null;
};
export type QueryInput<T> = ScanInput<T> & {
    /**
     * specify a key condition that describes items to query. For a given index the
     * the condition for partition key should be an equality and sort key can be
     * a comparison or a beginsWith (when its a string). Only number and string
     * types are supported for partition key and sort key.
     *
     * @example
     * If there is an UserType
     * ```typescript
     * type UserType = {
     *   id: string;
     *   name: string;
     *   age: number;
     *   isVerified: boolean;
     *   friendsIds: string[]
     * }
     * ```
     * The query can only include the following fields:
     * `id`, `name` and `age`
     * ```typescript
     *
     * const query: QueryInput<UserType> = {
     * query: {
     *   name: { eq: 'John' },
     *   age: { gt: 20 },
    *   }
    * }
     ```
     * @See [DynamoDB Key Conditions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LegacyConditionalParameters.KeyConditions.html) for details
     */
    query: DynamoDBKeyCondition<Required<T>>;
};
export type RemoveInput<T = unknown> = {
    /**
     * A required parameter that specifies the key of the item in DynamoDB that is being removed.
     * DynamoDB items may have a single hash key, or a hash key and sort key.
     * @example
     * If a table user has only hash key with user id then key would look like this
     * ```typescript
     *    type User = {
     *      id: number;
     *      name: string;
     *       age: number;
     *       isVerified: boolean;
     *    }
     *  const key: DynamoDBKey<User> = {
     *    id: 1,
     *   }
     * ```
     *
     * If the table user has a hash key (id) and sort key(name) then key would
     *  look like this
     * ```typescript
     *    type User = {
     *      id: number;
     *      name: string;
     *      age: number;
     *      isVerified: boolean;
     *      friendsIds: string[]
     *    }
     *    const key: DynamoDBKey<User> = {
     *      id: 1,
     *      name: 'XXXXXXXXXX',
     *    }
     * ```
     */
    key: DynamoDBKey<T>;
    /**
     * When you remove an object in DynamoDB by using the remove, you can optionally
     * specify a condition expression that controls whether the request should succeed
     * or not, based on the state of the object already in DynamoDB before the operation
     * is performed.
     *
     * @See [Condition expression](https://docs.aws.amazon.com/appsync/latest/devguide/resolver-mapping-template-reference-dynamodb.html#aws-appsync-resolver-mapping-template-reference-dynamodb-condition-expressions)
     * @See [Condition expression syntax](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.SpecifyingConditions.html)
     * @example
     * The following is a DeleteItem expression containing a condition that allows the operation succeed only if the owner of the document matches
     * the user making the request.
     * ```typescript
     * type Task = {
     *   id: string;
     *   title: string;
     *   description: string;
     *   owner: string;
     *   isComplete: boolean;
     * }
     * const condition: DynamoDBFilterObject<Task> = {
     *   owner: { eq: 'XXXXXXXXXXXXXXXX' },
     * }
     * remove<Task>({
     *    key: {
     *      id: 'XXXXXXXXXXXXXXXX',
     *   },
     *   condition,
     * });
     ```
     */
    condition?: DynamoDBFilterObject<T>;
    /**
     * When enabled, customPartitionKey value modifies the format of the ds_sk and ds_pk
     * records used by the delta sync table when versioning has been enabled.
     * When enabled, the processing of the populateIndexFields entry is also enabled.
     * @see[Conflict detection and sync](https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-sync.html)
     */
    customPartitionKey?: string;
    /**
     * A boolean value that, when enabled along with the customPartitionKey,
     * creates new entries for each record in the delta sync table, specifically
     * in the gsi_ds_pk and gsi_ds_sk columns. For more information,
     * @see[Conflict detection and sync](https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-sync.html)
     */
    populateIndexFields?: boolean;
    _version?: number;
};
export type PutInput<T = unknown> = {
    /**
     * A required parameter that specifies the key of the item in DynamoDB that is being put.
     * DynamoDB items may have a single hash key, or a hash key and sort key.
     * @example
     * If a table user has only hash key with user id then key would look like this
     * ```typescript
     *    type User = {
     *      id: number;
     *      name: string;
     *       age: number;
     *       isVerified: boolean;
     *    }
     *  const key: DynamoDBKey<User> = {
     *    id: 1,
     *   }
     * ```
     *
     * If the table user has a hash key (id) and sort key(name) then key would
     *  look like this
     * ```typescript
     *    type User = {
     *      id: number;
     *      name: string;
     *      age: number;
     *      isVerified: boolean;
     *      friendsIds: string[]
     *    }
     *    const key: DynamoDBKey<User> = {
     *      id: 1,
     *      name: 'XXXXXXXX',
     *    }
     * ```
     */
    key: DynamoDBKey<T>;
    /**
     * The rest of the attributes of the item to be put into DynamoDB.
     */
    item: Partial<T>;
    /**
     * When you put an objects in DynamoDB by using the put, you can optionally
     * specify a condition expression that controls whether the request should succeed
     * or not, based on the state of the object already in DynamoDB before the operation
     * is performed.
     *
     * @See [Condition expression](https://docs.aws.amazon.com/appsync/latest/devguide/resolver-mapping-template-reference-dynamodb.html#aws-appsync-resolver-mapping-template-reference-dynamodb-condition-expressions)
     * @See [Condition expression syntax](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.SpecifyingConditions.html)
     * @example
     * The following put condition expression that allows the operation succeed only if the owner of the document matches
     * the user making the request.
     * ```typescript
     * type Task = {
     *   id: string;
     *   title: string;
     *   description: string;
     *   owner: string;
     *   isComplete: boolean;
     * }
     * const condition: DynamoDBFilterObject<Task> = {
     *   owner: { eq: 'XXXXXXXXXXXXXXXX' },
     * }
     * put<Task>({
     *    key: {
     *      id: 'XXXXXXXXXXXXXXXX',
     *   },
     *   condition,
     *   item: {
     *     title: 'New Task',
     *     description: 'New Task Description',
     *     owner: 'XXXXXXXXXXXXXXXX',
     *     isComplete: false,
     *  }
     * });
     ```
     */
    condition?: DynamoDBFilterObject<T> | null;
    /**
     * When enabled, this string value modifies the format of the ds_sk and ds_pk
     * records used by the delta sync table when versioning has been enabled.
     * When enabled, the processing of the populateIndexFields entry is also enabled.
     * @see[Conflict detection and sync](https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-sync.html)
     */
    customPartitionKey?: string;
    /**
     * A boolean value that, when enabled along with the customPartitionKey,
     * creates new entries for each record in the delta sync table, specifically
     * in the gsi_ds_pk and gsi_ds_sk columns. For more information,
     * @see[Conflict detection and sync](https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-sync.html)
     */
    populateIndexFields?: boolean;
    _version?: number;
};
export type GetInput<T = unknown> = {
    /**
     * A required parameter that specifies the key of the item in DynamoDB.
     * DynamoDB items may have a single hash key, or a hash key and sort key.
     * @example
     * If a table user has only hash key with user id then key would look like this
     * ```typescript
     *    type User = {
     *      id: number;
     *      name: string;
     *       age: number;
     *       isVerified: boolean;
     *    }
     *  const key: DynamoDBKey<User> = {
     *    id: 1,
     *   }
     * ```
     *
     * If the table user has a hash key (id) and sort key(name) then key would
     *  look like this
     * ```typescript
     *    type User = {
     *      id: number;
     *      name: string;
     *      age: number;
     *      isVerified: boolean;
     *      friendsIds: string[]
     *    }
     *    const key: DynamoDBKey<User> = {
     *      id: 1,
     *      name: 'XXXXXXXXXX',
     *    }
     * ```
     */
    key: DynamoDBKey<T>;
    /**
     * Optional boolean to specify if you want to perform a strongly consistent read with DynamoDB
     * @default false
     */
    consistentRead?: boolean;
};
export interface DynamoDBOperationAdd<T> {
    _type: 'add';
}
export interface DynamoDBOperationRemove {
    _type: 'remove';
}
export interface DynamoDBOperationReplace<T> {
    _type: 'replace';
}
export interface DynamoDBOperationIncrement {
    _type: 'increment';
}
export interface DynamoDBOperationDecrement {
    _type: 'decrement';
}
export interface DynamoDBOperationAppend<T> {
    _type: 'append';
}
export interface DynamoDBOperationPrepend<T> {
    _type: 'prepend';
}
export interface DynamoDBOperationUpdateListItem<T> {
    _type: 'updateListItem';
}
type DynamoDBOperation = {
    /**
     * Helper function to add a new attribute item when updating DynamoDB.
     * @param payload
     * @example
     * ```typescript
     * import { update, operations } from '@aws-appsync/utils/dynamodb';
     * export function request(ctx) {
       *    const updateObj = {
       *      address: operations.add({
       *          street1: '123 Main St',
       *          city: 'New York',
       *          zip: '10001',
       *      }),
       *    };
       *    return update({ key: { id: 1 }, update: updateObj });
     * }
     * ```
     */
    add<T>(payload: T): DynamoDBOperationAdd<T>;
    /**
     * Helper function to remove an attribute from the item when updating DynamoDB.
     */
    remove(): DynamoDBOperationRemove;
    /**
     * Helper function to replace an existing attribute when updating an item in DynamoDB.
     * This is useful when you want to update entire object or sub object in the attribute and not just
     * the keys in the payload
     * @param payload
     */
    replace<T>(payload: T): DynamoDBOperationReplace<T>;
    /**
     * Helper function to increment the existing attribute value in the item when updating DynamoDB.
     * @optional @param by   number to add to the existing attribute value.
     */
    increment(by?: number): DynamoDBOperationIncrement;
    /**
     * Helper function to decrement the existing attribute value in the item when updating DynamoDB.
     * @optional @param by number to subtract to the existing attribute value.
     */
    decrement(by?: number): DynamoDBOperationDecrement;
    /**
     * Helper function to append to the existing list in DynamoDB
     * @param payload array of items to append to the existing attribute value.
     */
    append<T>(payload: T[]): DynamoDBOperationAppend<T>;
    /**
     * Helper function to prepend to the existing list in DynamoDB
     * @param payload array of items to prepend to the existing attribute value.
     */
    prepend<T>(payload: T[]): DynamoDBOperationPrepend<T>;
    /**
     * Helper function to replace an item in list
     * @param payload item to update in the list in DynamoDB
     * @param index index of the item to update in the list
     */
    updateListItem<T>(payload: T, index: number): DynamoDBOperationUpdateListItem<T>;
};
export type DynamoDBUpdateArrayOperators<T> = DynamoDBOperationAdd<T[]> | DynamoDBOperationReplace<T> | DynamoDBOperationRemove | DynamoDBOperationAppend<T[]> | DynamoDBOperationPrepend<T[]> | DynamoDBOperationUpdateListItem<T>[] | T[];
export type RemoveOpOnOptional<T, K extends keyof T> = T[K] extends {} ? never : DynamoDBOperationRemove;
export type DynamoDBUpdateObjectShallow<T = unknown> = T extends Record<string, unknown> ? {
    [k in keyof T]?: DynamoDBUpdateObjectShallow<NonNullable<T[k]>> | RemoveOpOnOptional<T, k>;
} | DynamoDBOperationAdd<T> | DynamoDBOperationReplace<T> : T extends (infer U)[] ? DynamoDBUpdateArrayOperators<U> | T : T extends number ? T | DynamoDBOperationIncrement | DynamoDBOperationDecrement : T | DynamoDBOperationAdd<T> | DynamoDBOperationReplace<T>;
export type DynamoDBUpdateObject<T = unknown> = T extends Record<string, unknown> ? {
    [k in keyof T]?: DynamoDBUpdateObjectShallow<NonNullable<T[k]>> | RemoveOpOnOptional<T, k>;
} : {};
export type DynamoDBUpdateInput<T = unknown> = {
    /**
     * A required parameter that specifies the key of the item in DynamoDB that is being updated.
     * DynamoDB items may have a single hash key, or a hash key and sort key.
     * @example
     * If a table user has only hash key with user id then key would look like this
     * ```typescript
     *    type User = {
     *      id: number;
     *      name: string;
     *       age: number;
     *       isVerified: boolean;
     *    }
     *  const key: DynamoDBKey<User> = {
     *    id: 1,
     *   }
     * ```
     *
     * If the table user has a hash key (id) and sort key(name) then key would
     *  look like this
     * ```typescript
     *    type User = {
     *      id: number;
     *      name: string;
     *      age: number;
     *      isVerified: boolean;
     *      friendsIds: string[]
     *    }
     *    const key: DynamoDBKey<User> = {
     *      id: 1,
     *      name: 'XXXXXXXXX',
     *    }
     * ```
     */
    key: DynamoDBKey<T>;
    /**
     * An object that specifies the attributes to be updated and the new values for them.
     * The update object can be used `add`, `remove`,`replace`, `increment`, `decrement`, `append`, `prepend`, `updateListItem`
     * @example
     * Given the following User table
     * ```typescript
     * type User = {
     *   id: string;
     *   name: string;
     *   age?: number;
     *   address?: {
     *      street1: string;
     *      street2?: string;
     *      city: string;
     *      zip: string;
     *   };
     *   friendsCount: number;
     *   isVerified: boolean;
     *   friendsIds: number[];
     * }
     * ```
     * ----------
     * To add a address to the table the update object would look like this
     * ```typescript
     * import { update, operations } from '@aws-appsync/utils/dynamodb';
     * const updateObj: DynamoDBUpdateObject<User> = {
     *   address: operations.add({
     *       street1: '123 Main St',
     *       city: 'New York',
     *       zip: '10001',
     *   }),
     * };
     * update({key: { id: 1 }, update: updateObj});
     * ```
     * ----------
     * to remove address
     * ```typescript
     * import { update, operations } from '@aws-appsync/utils/dynamodb';
     * const updateObj: DynamoDBUpdateObject<User> = {
     *   address: operations.remove(),
     * };
     * update({key: { id: 1 }, update: updateObj});   * ```
     * ----------
     * to replace address
     * ```typescript
     * import { update, operations } from '@aws-appsync/utils/dynamodb';
     * const updateObj: DynamoDBUpdateObject<User> = {
     *   address: operations.replace({
     *       street1: '123 Main St',
     *       street2: 'Apt. 1',
     *       city: 'New York',
     *       zip: '10001',
     *   }),
     * };
     * update({key: { id: 1 }, update: updateObj});
     * ```
     * ----------
     * to increment friendsCount by 10
     * ```typescript
     * import { update, operations } from '@aws-appsync/utils/dynamodb';
     * const updateObj: DynamoDBUpdateObject<User> = {
     *     friendsCount: operations.increment(10),
     * };
     * update({key: { id: 1 }, update: updateObj});
     * ```
     * ----------
     * to decrement friendsCount by 10
     * ```typescript
     * import { update, operations } from '@aws-appsync/utils/dynamodb';
     * const updateObj: DynamoDBUpdateObject<User> = {
     *     friendsCount: operations.decrement(10),
     * };
     * update({key: { id: 1 }, update: updateObj});
     * ```
     * ----------
     * to append friendsIds with friendId
     * ```typescript
     * import { update, operations } from '@aws-appsync/utils/dynamodb';
     * const newFriendIds = [101, 104, 111];
     * const updateObj: DynamoDBUpdateObject<User> = {
     *     friendsIds:  operations.append(newFriendIds),
     * };
     * update({key: { id: 1 }, update: updateObj});
     *```
     * ----------
     * to prepend friendsIds with friendId
     * ```typescript
     * import { update, operations } from '@aws-appsync/utils/dynamodb';
     * const newFriendIds = [101, 104, 111];
     * const updateObj: DynamoDBUpdateObject<User> = {
     *     friendsIds:  operations.prepend(newFriendIds),
     * };
     * update({key: { id: 1 }, update: updateObj});
     *```
     * ----------
     * to to update 2nd and 3rd item in the friends list
     * ```typescript
     * import { update, operations } from '@aws-appsync/utils/dynamodb';
     * const newFriendIds = [
     *   operations.updateListItem('102', 1),
     *   operations.updateListItem('112', 2),
     * ];
     * const updateObj: DynamoDBUpdateObject<User> = {
     *   friendsIds: newFriendIds
     * }
     * update({key: { id: 1 }, update: updateObj});
     * ```
     */
    update: DynamoDBUpdateObject<T>;
    /**
     * When you update an objects in DynamoDB by using the update method, you can optionally
     * specify a condition expression that controls whether the request should succeed
     * or not, based on the state of the object already in DynamoDB before the operation
     * is performed.
     *
     * @See [Condition expression](https://docs.aws.amazon.com/appsync/latest/devguide/resolver-mapping-template-reference-dynamodb.html#aws-appsync-resolver-mapping-template-reference-dynamodb-condition-expressions)
     * @See [Condition expression syntax](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.SpecifyingConditions.html)
     * @example
     * The following DeleteItem a condition expression that allows the operation succeed only if the owner of the document matches
     * the user making the request.
     * ```typescript
     * type User = {
     *   id: string;
     *   name: string;
     *   age?: number;
     *   address?: {
     *       street1: string;
     *       street2?: string;
     *       city: string;
     *       zip: string;
     *   };
     *   friendsCount: number;
     *   isVerified: boolean;
     *   friendsIds: number[];
     * }
     *
     * const condition: DynamoDBFilterObject<User> = {
     *   name: { eq: 'XXXXXXXXXXXXXXXX' },
     * }
     * ddbHelper.update<User>({
     *     key: {
     *       id: 'XXXXXXXXXXXXXXXX',
     *   },
     *   condition,
     *   update: {
     *     isVerified:  true,
     *   }
     * });
     *```
     */
    condition?: DynamoDBFilterObject<T>;
    /**
     * When enabled, customPartitionKey value modifies the format of the ds_sk and ds_pk
     * records used by the delta sync table when versioning has been enabled.
     * When enabled, the processing of the populateIndexFields entry is also enabled.
     * @see[Conflict detection and sync](https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-sync.html)
     */
    customPartitionKey?: string;
    /**
     * A boolean value that, when enabled along with the customPartitionKey,
     * creates new entries for each record in the delta sync table, specifically
     * in the gsi_ds_pk and gsi_ds_sk columns. For more information,
     * @see[Conflict detection and sync](https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-sync.html)
     */
    populateIndexFields?: boolean;
    _version?: number;
};
export type DynamoDBSyncInput<T = unknown> = {
    /**
     * The partition key of the Base table used when performing a Sync operation.
     * This field allows a Sync operation to be performed when the table utilizes a
     * custom partition key. This is an optional field.
     */
    basePartitionKey?: string;
    /**
     * The index used for the Sync operation. This index is required to enable a Sync operation on the
     * whole delta store table when the table uses a custom partition key.
     * The Sync operation will be performed on the GSI (created on gsi_ds_pk and gsi_ds_sk).
     *  This field is optional.
     */
    deltaIndexName?: string;
    /**
     * optional maximum number of items to evaluate at a single time.
     * If omitted, the default limit will be set to 100 items.
     * The maximum value for this field is 1000 items.
     */
    limit?: number | null;
    nextToken?: string | null;
    /**
     * The moment, in epoch milliseconds, when the last successful Sync operation started.
     * If specified, only items that have changed after lastSync are returned.
     * This field is optional, and should only be populated after retrieving all pages
     * from an initial Sync operation. If omitted, results from the Base table will be
     * returned, otherwise, results from the Delta table will be returned.
     */
    lastSync?: number;
    /**
     * optional filter to apply to the results after retrieving it from the table
     */
    filter?: DynamoDBFilterObject<T> | null;
};
/**
 * Generates DynamoDBQueryRequest object to make a [Query](https://docs.aws.amazon.com/appsync/latest/devguide/js-resolver-reference-dynamodb.html#js-aws-appsync-resolver-reference-dynamodb-query)
 * request to DynamoDB.
 * @param payload {QueryInput} - Query input object
 * @returns {DynamoDBQueryRequest}
 * @example
 * ```typescript
 * import * as ddb from '@aws-appsync/utils/dynamodb';
 *
 * export function request(ctx) {
 *    return ddb.query({ query: { id: { eq: ctx.args.id } } });
 * }
 * ```
 */
export declare function query<T = unknown>(payload: QueryInput<T>): DynamoDBQueryRequest;
/**
 * Generates DynamoDBScanRequest to make a [Scan](https://docs.aws.amazon.com/appsync/latest/devguide/js-resolver-reference-dynamodb.html#js-aws-appsync-resolver-reference-dynamodb-scan) request
 * to DynamoDB.
 * @param payload lets you specify
 * @returns { DynamoDBScanRequest }
 */
export declare function scan<T = unknown>(payload: ScanInput<T>): DynamoDBScanRequest;
/**
 * Generates a DynamoDBUpdateItemRequest to make a [UpdateItem](https://docs.aws.amazon.com/appsync/latest/devguide/js-resolver-reference-dynamodb.html#js-aws-appsync-resolver-reference-dynamodb-updateitem)
 * request to DynamoDB.
 * @param payload
 */
export declare function update<T = unknown>(payload: DynamoDBUpdateInput<T>): DynamoDBUpdateItemRequest;
/**
 * Generates DynamoDBDeleteItemRequest object to make a [DeleteItem](https://docs.aws.amazon.com/appsync/latest/devguide/js-resolver-reference-dynamodb.html#js-aws-appsync-resolver-reference-dynamodb-deleteitem)
 * request to DynamoDB.
 * @param payload
 * @returns { DynamoDBDeleteItemRequest }
 * @example
 * ```typescript
 * import * as ddb from '@aws-appsync/utils/dynamodb';
 *
 * export function request(ctx) {
 *    return ddb.remove({ key: { id: ctx.args.id } });
 * }
 * ```
 */
export declare function remove<T>(payload: RemoveInput<T>): DynamoDBDeleteItemRequest;
/**
 * Generates a DynamoDBPutItemRequest object to make a [PutItem](https://docs.aws.amazon.com/appsync/latest/devguide/js-resolver-reference-dynamodb.html#js-aws-appsync-resolver-reference-dynamodb-putitem)
 * request to DynamoDB.
 * @param payload
 * @returns DynamoDBPutItemRequest
 * @example
 * ```typescript
 * import * as ddb from '@aws-appsync/utils/dynamodb';
 *
 * export function request(ctx) {
 *    return ddb.put({ key: { id: util.autoId() }, item: ctx.args });
 * }
 * ```
 */
export declare function put<T>(payload: PutInput<T>): DynamoDBPutItemRequest;
/**
 * Generates a DynamoDBGetItemRequest object to make a [GetItem](https://docs.aws.amazon.com/appsync/latest/devguide/js-resolver-reference-dynamodb.html#js-aws-appsync-resolver-reference-dynamodb-getitem)
 * request to DynamoDB.
 * @param payload
 * @returns DynamoDBGetItemRequest
 * @example
 * ```typescript
* import { get } from '@aws-appsync/utils/dynamodb';
* export function request(ctx) {
*     return get({ key: { id: ctx.args.id } });
* }
 ```
 */
export declare function get<T>(payload: GetInput<T>): DynamoDBGetItemRequest;
/**
 * Generates an DynamoDBSyncRequest object to make a [Sync](https://docs.aws.amazon.com/appsync/latest/devguide/js-resolver-reference-dynamodb.html#js-aws-appsync-resolver-reference-dynamodb-sync)
 * request and receive only data altered since last query (the delta updates). requests can only be made to versioned DynamoDB data sources.
 * @param payload
 * @returns DynamoDBGetItemRequest
 * @example
 * ```typescript
 * import * as ddb from '@aws-appsync/utils/dynamodb';
 *
 * export function request(ctx) {
 *    const { limit = 10, nextToken, lastSync } = ctx.args;
 *    return ddb.sync({ limit, nextToken, lastSync });
 * }
 * ```
 */
export declare function sync<T>(payload: DynamoDBSyncInput<T>): DynamoDBSyncRequest;
export declare const operations: DynamoDBOperation;
export {};
//# sourceMappingURL=dynamodb-helpers.d.ts.map