import { v4 as uuidv4 } from 'uuid';

import { generateFilterExpression } from "./transform/dynamodb-filter";
import { dynamodbUtils } from './dynamodb-utils';

const FILTER_CONTAINS = "contains";

export const util = {
  autoId: function() {
    return uuidv4();
  },
  transform: {
    toDynamoDBFilterExpression: function(value) {
      const items = Object.entries(value);
      if (items.length != 1) {
        throw new Error("invalid structure, should have one entry");
      }

      const [key, filter] = items[0];

      const filterItems = Object.entries(filter);
      if (filterItems.length !== 1) {
        throw new Error("invalid structure, should have one filter expression");
      }


      const [filterType, contents] = filterItems[0];
      const expressionName = `#${key}`;
      const expressionValue = `:${key}_${filterType}`;

      let expression;
      let expressionNames = {};
      let expressionValues = {};
      switch (filterType) {
        case FILTER_CONTAINS:
          expression = `(contains(${expressionName},${expressionValue}))`;
          expressionNames[expressionName] = key;
          expressionValues[expressionValue] = util.dynamodb.toDynamoDB(contents);
          break;
        default:
          throw new Error(`Not implemented for ${filterType}`);

      }

      return JSON.stringify({ expression, expressionNames, expressionValues });

    },
    toDynamoDBConditionExpression(condition) {
      const result = generateFilterExpression(condition);
      return JSON.stringify({
        expression: result.expressions.join(' ').trim(),
        expressionNames: result.expressionNames,
        // upstream is missing this value: https://github.com/aws-amplify/amplify-cli/blob/5cc1b556d8081421dc68ee264dac02d5660ffee7/packages/amplify-appsync-simulator/src/velocity/util/transform/index.ts#L11
        expressionValues: result.expressionValues,
      });
    },
  },
  dynamodb: dynamodbUtils,
};
