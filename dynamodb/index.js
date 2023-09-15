import { util } from '..';

export const get = (input) => {
  let out = { operation: "GetItem" };

  for (const [k, v] of Object.entries(input)) {
    out[k] = util.dynamodb.toMapValues(v);
  }

  return out;
};
