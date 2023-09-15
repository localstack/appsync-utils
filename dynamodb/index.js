import { util } from '..';

// TODO: consistentRead
// TODO: projection
export const get = (input) => {
  let out = { operation: "GetItem" };
  out.key = util.dynamodb.toMapValues(input.key);
  return out;
};

// TODO: condition
// TODO: customPartitionKey
// TODO: populateIndexFields
// TODO: _version
export const put = (payload) => {
  let out = { operation: "PutItem" };
  out.key = {};
  for (const [k, v] of Object.entries(payload.key)) {
    out.key[k] = util.dynamodb.toDynamoDB(v);
  }
  out.attributeValues = {};
  for (const [k, v] of Object.entries(payload.item)) {
    out.attributeValues[k] = util.dynamodb.toDynamoDB(v);
  }

  return out;
};

export const remove = (payload) => {
  let out = { operation: "DeleteItem" };
  out.key = util.dynamodb.toMapValues(payload.key);
  return out;
};
