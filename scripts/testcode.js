import { util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

export function request(ctx) {
  return util.transform.toDynamoDBFilterExpression({
    "title":{
      "contains":"Hello World"
    }
  });
}

export function response(ctx) {
}
