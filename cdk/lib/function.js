import { util } from '@aws-appsync/utils';
import { select } from '@aws-appsync/utils/rds';
import { get } from '@aws-appsync/utils/dynamodb';

export function request(ctx) {
  return {
    payload: {
      value: "my-string",
    },
  };
}

export function response(ctx) {
  return ctx.result;
}
