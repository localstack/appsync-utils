import { util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

export function request(ctx) {
  return ddb.operations.updateListItem('foo', 10);
}

export function response(ctx) {
}
