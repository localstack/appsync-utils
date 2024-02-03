import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return ctx;
}

export function response(ctx) {
  return ctx.prev.result.value;
}
