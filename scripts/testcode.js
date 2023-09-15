import { util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

export function request(ctx) {
  return ddb.update({ key: { id: "test" }, update: { values: ddb.operations.replace({ a: 10 }) }});
}

export function response(ctx) {
}
