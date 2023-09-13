import { DynamoDBStringResult, OptionalInputType } from "./lib/dynamodb-utils";

import type { DynamoDBBinaryResult, DynamoDBBinarySetResult, DynamoDBBooleanResult, DynamoDBFilterObject, DynamoDBListResult, DynamoDBMapResult, DynamoDBNullResult, DynamoDBNumberResult, DynamoDBNumberSetResult, DynamoDBReturnType, DynamoDBStringSetResult, OpenSearchQueryObject, SubscriptionFilter, SubscriptionFilterExcludeKeysType, SubscriptionFilterObject, SubscriptionFilterRuleObject, Util } from "./lib/index.d";
import { NormalizationType } from "./lib/string-utils";

export const util: Util = {
  escapeJavaScript: function(value: string): string {
    throw new Error("Function not implemented.");
  },
  urlEncode: function(value: string): string {
    throw new Error("Function not implemented.");
  },
  urlDecode: function(value: string): string {
    throw new Error("Function not implemented.");
  },
  base64Encode: function(bytes: string): string {
    throw new Error("Function not implemented.");
  },
  base64Decode: function(value: string): string {
    throw new Error("Function not implemented.");
  },
  autoId: function(): string {
    throw new Error("Function not implemented.");
  },
  autoUlid: function(): string {
    throw new Error("Function not implemented.");
  },
  autoKsuid: function(): string {
    throw new Error("Function not implemented.");
  },
  unauthorized: function(): never {
    throw new Error("Function not implemented.");
  },
  error: function(msg: string, errorType?: string | undefined, data?: any, errorInfo?: any): never {
    throw new Error("Function not implemented.");
  },
  appendError: function(msg: string, errorType?: string | undefined, data?: any, errorInfo?: any): void {
    throw new Error("Function not implemented.");
  },
  matches: function(pattern: string, value: string): boolean {
    throw new Error("Function not implemented.");
  },
  authType: function(): string {
    throw new Error("Function not implemented.");
  },
  time: {
    nowISO8601: function(): string {
      throw new Error("Function not implemented.");
    },
    nowEpochSeconds: function(): number {
      throw new Error("Function not implemented.");
    },
    nowEpochMilliSeconds: function(): number {
      throw new Error("Function not implemented.");
    },
    nowFormatted: function(formatString: string): string {
      throw new Error("Function not implemented.");
    },
    parseFormattedToEpochMilliSeconds: function(timestamp: string, formatString: string): number {
      throw new Error("Function not implemented.");
    },
    parseISO8601ToEpochMilliSeconds: function(timestamp: string): number {
      throw new Error("Function not implemented.");
    },
    epochMilliSecondsToSeconds: function(milliseconds: number): number {
      throw new Error("Function not implemented.");
    },
    epochMilliSecondsToISO8601: function(milliseconds: number): string {
      throw new Error("Function not implemented.");
    },
    epochMilliSecondsToFormatted: function(milliseconds: number, formatString: string): string {
      throw new Error("Function not implemented.");
    }
  },
  dynamodb: {
    toDynamoDB: function <T>(obj: T): DynamoDBReturnType<T> {
      throw new Error("Function not implemented.");
    },
    toString: function(obj: OptionalInputType<string>): DynamoDBStringResult | null {
      if (obj) {
        return { S: obj };
      } else {
        return null;
      }
    },
    toStringSet: function(list: OptionalInputType<string[]>): DynamoDBStringSetResult | null {
      if (list) {
        return { SS: list };
      } else {
        return null;
      }
    },
    toNumber: function(num: OptionalInputType<number>): DynamoDBNumberResult | null {
      if (num) {
        return { N: num };
      } else {
        return null;
      }
    },
    toNumberSet: function(numbers: OptionalInputType<number[]>): DynamoDBNumberSetResult | null {
      if (numbers) {
        return { NS: numbers };
      } else {
        return null;
      }
    },
    toBinary: function(value: OptionalInputType<string>): DynamoDBBinaryResult | null {
      throw new Error("Function not implemented.");
    },
    toBinarySet: function(values: OptionalInputType<string[]>): DynamoDBBinarySetResult | null {
      throw new Error("Function not implemented.");
    },
    toBoolean: function(value: OptionalInputType<boolean>): DynamoDBBooleanResult | null {
      throw new Error("Function not implemented.");
    },
    toNull: function(): DynamoDBNullResult {
      throw new Error("Function not implemented.");
    },
    toList: function <T>(value: OptionalInputType<T>): T extends (infer L)[] ? DynamoDBListResult<L> : null {
      throw new Error("Function not implemented.");
    },
    toMap: function <T>(value: T): T extends Record<string, unknown> ? DynamoDBMapResult<T> : null {
      throw new Error("Function not implemented.");
    },
    toMapValues: function <T>(value: T): T extends Record<string, unknown> ? { [K in keyof T]: DynamoDBReturnType<T[K]>; } : null {
      throw new Error("Function not implemented.");
    },
    toS3Object: function(key: string, bucket: string, region: string): DynamoDBStringResult | null {
      throw new Error("Function not implemented.");
    },
    fromS3ObjectJson: function(s3ObjectString: string) {
      throw new Error("Function not implemented.");
    }
  },
  rds: {
    toJsonObject: function(serializedSQLResult: string): Record<string, any> | null {
      throw new Error("Function not implemented.");
    }
  },
  http: {
    copyHeaders: function <T extends {}>(headers: T) {
      throw new Error("Function not implemented.");
    },
    addResponseHeader: function(name: string, value: any): void {
      throw new Error("Function not implemented.");
    },
    addResponseHeaders: function(headers: Record<string, any>): void {
      throw new Error("Function not implemented.");
    }
  },
  xml: {
    toMap: function(xml: string): Record<string, any> | null {
      throw new Error("Function not implemented.");
    },
    toJsonString: function(xml: string): string {
      throw new Error("Function not implemented.");
    }
  },
  transform: {
    toDynamoDBFilterExpression: function <T extends { [key: string]: any; } = Record<string, any>>(filterObject: DynamoDBFilterObject<T>): string {
      throw new Error("Function not implemented.");
    },
    toDynamoDBConditionExpression: function <T extends { [key: string]: any; } = Record<string, any>>(conditionObject: DynamoDBFilterObject<T>): string {
      throw new Error("Function not implemented.");
    },
    toElasticsearchQueryDSL: function <T extends { [key: string]: any; } = Record<string, any>>(obj: OpenSearchQueryObject<T>): string {
      throw new Error("Function not implemented.");
    },
    toSubscriptionFilter: function <T = Record<string, any>>(obj: SubscriptionFilterObject<T>, ignoredFields?: SubscriptionFilterExcludeKeysType<T> | undefined, rules?: SubscriptionFilterRuleObject<T> | undefined): SubscriptionFilter {
      throw new Error("Function not implemented.");
    }
  },
  math: {
    roundNum: function(input: number): number {
      throw new Error("Function not implemented.");
    },
    minVal: function(input1: number, input2: number): number {
      throw new Error("Function not implemented.");
    },
    maxVal: function(input1: number, input2: number): number {
      throw new Error("Function not implemented.");
    },
    randomDouble: function(): number {
      throw new Error("Function not implemented.");
    },
    randomWithinRange: function(start: number, end: number): number {
      throw new Error("Function not implemented.");
    }
  },
  str: {
    normalize: function(value: string, normalizationType: NormalizationType): string {
      throw new Error("Function not implemented.");
    }
  }
};
// util.dynamodb.toString = (obj: OptionalInputType<string>): DynamoDBStringResult | null => {
//   if (obj) {
//     return {S: obj};
//   } else {
//     return null;
//   }
// };

// export { util };
