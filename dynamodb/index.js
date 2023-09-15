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

export const scan = (payload) => {
  let out = payload;
  out.operation = "Scan";
  return out;
};

// Not implemented on AWS
// Error: code.js(5,14): error TS2339: Property 'sync' does not exist on type 'typeof import("/var/task/node_modules/@amzn/awsapp-sync-jsvtltranspiler/bundled/@aws-appsync/utils/lib/dynamo-db-helpers")'.
/*
export const sync = (payload) => {
};
*/

const OPERATION_ADD = "OPERATION_ADD";
const OPERATION_APPEND = "OPERATION_APPEND";
const OPERATION_DECREMENT = "OPERATION_DECREMENT";
const OPERATION_INCREMENT = "OPERATION_INCREMENT";
const OPERATION_PREPEND = "OPERATION_PREPEND";
const OPERATION_REPLACE = "OPERATION_REPLACE";
const OPERATION_UPDATE_LIST_ITEM = "OPERATION_UPDATE_LIST_ITEM";

export const update = (payload) => {
  let out = { operation: "UpdateItem" };
  out.key = util.dynamodb.toMapValues(payload.key);
  out.update = {};

  let expressions = [];
  let expressionNames = {};
  let expressionValues = {};
  let idx = 1;
  for (const [k, op] of Object.entries(payload.update)) {

    let expression;
    let expressionName;
    let expressionValue;
    let value;

    switch (op.type) {
      case OPERATION_ADD:
        expressionName = `#expName_${idx}`;
        expressionValue = `:expValue_${idx}`;
        expression = `SET ${expressionName} = ${expressionValue}`;
        value = op.value;
        break;
      case OPERATION_APPEND:
        expressionName = `#expName_${idx}`;
        expressionValue = `:expValue_${idx}`;
        expression = `SET ${expressionName} = list_append(${expressionName}, ${expressionValue})`;
        value = op.items;
        break;
      case OPERATION_DECREMENT:
        expressionName = `#expName_${idx}`;
        expressionValue = `:expValue_${idx}`;
        expression = `SET ${expressionName} = ${expressionName} - ${expressionValue}`;
        value = op.by;
        break;
      default:
        throw new Error(`update not implemented for ${op.type}`);
    }

    expressions.push(expression);
    expressionNames[expressionName] = k;
    expressionValues[expressionValue] = util.dynamodb.toDynamoDB(value);

    idx++;
  }

  out.update.expression = expressions.join(",");
  out.update.expressionNames = expressionNames;
  out.update.expressionValues = expressionValues;

  return out;
};

export const operations = {
  add: (value) => {
    return {type: OPERATION_ADD, value: value};
  },
  append: (value) => {
    return {type: OPERATION_APPEND, items: value};
  },
  decrement: (value) => {
    return {type: OPERATION_DECREMENT, by: value};
  },
  increment: (value) => {
    return {type: OPERATION_INCREMENT, by: value};
  },
  prepend: (value) => {
    return {type: OPERATION_PREPEND, items: value};
  },
  replace: (value) => {
    return {type: OPERATION_REPLACE, value: value};
  },
  // updateListItem: (value) => {
  //   return {type: OPERATION_UPDATE_LIST_ITEM, value: value};
  // },
};
