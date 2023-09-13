export type Key = {
    [key: string]: AttributeValue;
};
export type AttributeValue = unknown;
export type AttributeValueList = AttributeValue[];
export type ConsistentRead = boolean;
export type PutItemInputAttributeMap = {
    [key: string]: AttributeValue;
};
export type AttributeMap = {
    [key: string]: AttributeValue;
};
export type AttributeName = string;
export type AttributeNameList = AttributeName[];
export type ExpressionAttributeNameMap = {
    [key: string]: AttributeName;
};
export type ExpressionAttributeNameVariable = string;
export type ExpressionAttributeValueMap = {
    [key: string]: AttributeValue;
};
export type ExpressionAttributeValueVariable = string;
export type ConditionCheckExpression = {
    expression: string;
    expressionNames?: ExpressionAttributeNameMap;
    expressionValues?: ExpressionAttributeValueMap;
    equalsIgnore?: string[];
    consistentRead?: boolean;
    conditionalCheckFailedHandler?: {
        strategy: 'Custom' | 'Reject';
        lambdaArn?: string;
    };
};
export type TransactConditionCheckExpression = {
    expression: string;
    expressionNames?: ExpressionAttributeNameMap;
    expressionValues?: ExpressionAttributeValueMap;
    returnValuesOnConditionCheckFailure: boolean;
};
export type DynamoDBExpression = {
    expression: string;
    expressionNames?: ExpressionAttributeNameMap;
    expressionValues?: ExpressionAttributeValueMap;
};
export type DynamoDBProjectionExpression = {
    expression: string;
    expressionNames?: Record<string, string>;
};
export type DynamoDBGetItemRequest = {
    operation: 'GetItem';
    key: Key;
    consistentRead?: ConsistentRead;
    projection?: DynamoDBProjectionExpression;
};
/**
 * @deprecated Use DynamoDBGetItemRequest
 */
export type DynamoDBGetItem = DynamoDBGetItemRequest;
export type DynamoDBPutItemRequest = {
    operation: 'PutItem';
    key: Key;
    attributeValues: PutItemInputAttributeMap;
    condition?: ConditionCheckExpression;
    customPartitionKey?: string;
    populateIndexFields?: boolean;
    _version?: number;
};
export type DynamoDBUpdateItemRequest = {
    operation: 'UpdateItem';
    key: Key;
    update: DynamoDBExpression;
    condition?: ConditionCheckExpression;
    customPartitionKey?: string;
    populateIndexFields?: boolean;
    _version?: number;
};
export type DynamoDBDeleteItemRequest = {
    operation: 'DeleteItem';
    key: Key;
    condition?: ConditionCheckExpression;
    customPartitionKey?: string;
    populateIndexFields?: boolean;
    _version?: number;
};
export type DynamoDBQueryRequest = {
    operation: 'Query';
    query: DynamoDBExpression;
    index?: string;
    nextToken?: string;
    limit?: number;
    scanIndexForward?: boolean;
    consistentRead?: boolean;
    select?: 'ALL_ATTRIBUTES' | 'ALL_PROJECTED_ATTRIBUTES';
    filter?: DynamoDBExpression;
    projection?: DynamoDBProjectionExpression;
};
export type DynamoDBScanRequest = {
    operation: 'Scan';
    index?: string;
    limit?: number;
    consistentRead?: boolean;
    nextToken?: string;
    totalSegments?: number;
    segment?: number;
    filter?: DynamoDBExpression;
    projection?: DynamoDBProjectionExpression;
};
export type DynamoDBSyncRequest = {
    operation: 'Sync';
    basePartitionKey?: string;
    deltaIndexName?: string;
    limit?: number;
    nextToken?: string;
    lastSync?: number;
    filter?: DynamoDBExpression;
};
export type DynamoDBBatchGetItemRequest = {
    operation: 'BatchGetItem';
    tables: {
        [tableName: string]: {
            keys: Key[];
            consistentRead?: boolean;
        };
    };
    projection?: DynamoDBProjectionExpression;
};
export type DynamoDBBatchDeleteItemRequest = {
    operation: 'BatchDeleteItem';
    tables: {
        [tableName: string]: Key[];
    };
};
export type DynamoDBBatchPutItemRequest = {
    operation: 'BatchPutItem';
    tables: {
        [tableName: string]: PutItemInputAttributeMap[];
    };
};
export type DynamoDBTransactGetItemsRequest = {
    operation: 'TransactGetItems';
    transactItems: {
        table: string;
        key: Key;
    }[];
};
export type DynamoDBTransactWriteItemsRequest = {
    operation: 'TransactWriteItems';
    transactItems: TransactItem[];
};
type TransactItem = TransactWritePutItem | TransactWriteUpdateItem | TransactWriteDeleteItem | TransactWriteConditionCheckItem;
type TransactWritePutItem = {
    table: string;
    operation: 'PutItem';
    key: Key;
    attributeValues: PutItemInputAttributeMap;
    condition?: TransactConditionCheckExpression;
};
type TransactWriteUpdateItem = {
    table: string;
    operation: 'UpdateItem';
    key: Key;
    update: DynamoDBExpression;
    condition?: TransactConditionCheckExpression;
};
type TransactWriteDeleteItem = {
    table: string;
    operation: 'DeleteItem';
    key: Key;
    condition?: TransactConditionCheckExpression;
};
type TransactWriteConditionCheckItem = {
    table: string;
    operation: 'ConditionCheck';
    key: Key;
    condition?: TransactConditionCheckExpression;
};
export type HTTPRequest = {
    method: 'PUT' | 'POST' | 'GET' | 'DELETE' | 'PATCH';
    params?: {
        query?: {
            [key: string]: any;
        };
        headers?: {
            [key: string]: string;
        };
        body?: string;
    };
    resourcePath: string;
};
export type RDSRequest = {
    statements: string[];
    variableMap: unknown;
};
export type OpenSearchRequest = {
    operation: 'GET' | 'POST' | ' PUT' | 'HEAD' | 'DELETE';
    path: string;
    params?: Partial<{
        headers: unknown;
        queryString: unknown;
        body: unknown;
    }>;
};
export type LambdaRequest = {
    operation: 'Invoke' | 'BatchInvoke';
    payload: unknown;
};
export type NONERequest = {
    payload: unknown;
};
export {};
//# sourceMappingURL=resolver-return-types.d.ts.map