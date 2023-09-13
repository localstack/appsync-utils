import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return util.dynamodb.toNumber(10);
}

// Stub function, not used
export function response(ctx) {
}
