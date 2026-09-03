import { util, buildDynamoDBExpression } from '../index.js';

const toKey = (key) => util.dynamodb.toMapValues(key);

// An optional argument that was not given is left out of the request entirely, and a null is the
// same as absent for every one of them.
function withOptional(request, optional) {
  for (const [field, value] of Object.entries(optional)) {
    if (value !== undefined && value !== null) {
      request[field] = value;
    }
  }
  return request;
}

// A `condition`, `filter` or key condition travels as an expression object rather than as the JSON
// string `util.transform` produces. Unlike the update expression below, an expression that binds no
// value carries no `expressionValues` at all.
//
// The clauses come out in the order the fields were written. AWS orders them by its own object
// iteration instead, which for some sets of field names is neither the written order nor sorted, so
// a condition on several fields can be joined in a different order there. `AND` commutes, so the
// two mean the same thing.
function toExpression(filter) {
  if (filter === undefined || filter === null) {
    return undefined;
  }
  const built = buildDynamoDBExpression(filter);
  if (built === null) {
    return undefined;
  }
  const expression = { expression: built.expression, expressionNames: built.expressionNames };
  if (Object.keys(built.expressionValues).length) {
    expression.expressionValues = built.expressionValues;
  }
  return expression;
}

// A projection aliases every segment of every path, so `nested.field` becomes `#expName_2.#expName_3`
// and a segment used twice keeps the one alias.
function toProjection(projection) {
  if (!Array.isArray(projection) || projection.length === 0) {
    return undefined;
  }
  const names = new Map();
  const alias = (segment) => {
    if (!names.has(segment)) {
      names.set(segment, `#expName_${names.size + 1}`);
    }
    return names.get(segment);
  };
  const expression = projection
    .map((path) => String(path).split(".").map(alias).join("."))
    .join(", ");
  const expressionNames = {};
  for (const [segment, name] of names) {
    expressionNames[name] = segment;
  }
  return { expression, expressionNames };
}

// Operations

const OPERATION_ADD = "OPERATION_ADD";
const OPERATION_APPEND = "OPERATION_APPEND";
const OPERATION_DECREMENT = "OPERATION_DECREMENT";
const OPERATION_INCREMENT = "OPERATION_INCREMENT";
const OPERATION_PREPEND = "OPERATION_PREPEND";
const OPERATION_REMOVE = "OPERATION_REMOVE";
const OPERATION_REPLACE = "OPERATION_REPLACE";
const OPERATION_UPDATE_LIST_ITEM = "OPERATION_UPDATE_LIST_ITEM";

export const operations = {
  add: (value) => {
    return { type: OPERATION_ADD, value: value };
  },
  append: (value) => {
    return { type: OPERATION_APPEND, items: value };
  },
  decrement: (value) => {
    return { type: OPERATION_DECREMENT, by: value };
  },
  increment: (value) => {
    return { type: OPERATION_INCREMENT, by: value };
  },
  prepend: (value) => {
    return { type: OPERATION_PREPEND, items: value };
  },
  remove: () => {
    return { type: OPERATION_REMOVE };
  },
  replace: (value) => {
    return { type: OPERATION_REPLACE, value: value };
  },
  updateListItem: (value, index) => {
    return { type: OPERATION_UPDATE_LIST_ITEM, value: value, index: index };
  },
};

const isOperation = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  typeof value.type === "string" &&
  value.type.startsWith("OPERATION_");

const isListItemOperations = (value) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => isOperation(item) && item.type === OPERATION_UPDATE_LIST_ITEM);

// `increment` and `decrement` step by one when they are given nothing to step by
const stepBy = (by) => (by === undefined || by === null ? 1 : by);

// An update expression carries one `SET` clause list followed by one `REMOVE` clause list, so the
// attribute aliases are numbered in the order the clauses come out rather than the order they were
// written. An attribute keeps a single alias however many clauses mention it.
function toUpdateExpression(update) {
  const sets = [];
  const removes = [];

  for (const [field, operation] of Object.entries(update)) {
    if (isListItemOperations(operation)) {
      for (const item of operation) {
        sets.push({ field, render: (name, value) => `${name}[${item.index}] = ${value(item.value)}` });
      }
      continue;
    }
    if (!isOperation(operation)) {
      // a bare value updates the attribute to it, the same as `replace`
      sets.push({ field, render: (name, value) => `${name} = ${value(operation)}` });
      continue;
    }
    switch (operation.type) {
      case OPERATION_ADD:
      case OPERATION_REPLACE:
        sets.push({ field, render: (name, value) => `${name} = ${value(operation.value)}` });
        break;
      case OPERATION_APPEND:
        sets.push({ field, render: (name, value) => `${name} = list_append(${name}, ${value(operation.items)})` });
        break;
      case OPERATION_PREPEND:
        sets.push({ field, render: (name, value) => `${name} = list_append(${value(operation.items)}, ${name})` });
        break;
      case OPERATION_INCREMENT:
        sets.push({ field, render: (name, value) => `${name} = ${name} + ${value(stepBy(operation.by))}` });
        break;
      case OPERATION_DECREMENT:
        sets.push({ field, render: (name, value) => `${name} = ${name} - ${value(stepBy(operation.by))}` });
        break;
      case OPERATION_REMOVE:
        removes.push({ field });
        break;
      case OPERATION_UPDATE_LIST_ITEM:
        sets.push({
          field,
          render: (name, value) => `${name}[${operation.index}] = ${value(operation.value)}`,
        });
        break;
      default:
        throw new Error(`update not implemented for ${operation.type}`);
    }
  }

  const names = new Map();
  const nameOf = (field) => {
    if (!names.has(field)) {
      names.set(field, `#expName_${names.size + 1}`);
    }
    return names.get(field);
  };
  const expressionValues = {};
  const valueOf = (value) => {
    const placeholder = `:expValue_${Object.keys(expressionValues).length + 1}`;
    expressionValues[placeholder] = util.dynamodb.toDynamoDB(value);
    return placeholder;
  };

  const clauses = [];
  if (sets.length) {
    clauses.push(`SET ${sets.map(({ field, render }) => render(nameOf(field), valueOf)).join(", ")}`);
  }
  if (removes.length) {
    clauses.push(`REMOVE ${removes.map(({ field }) => nameOf(field)).join(", ")}`);
  }

  const expressionNames = {};
  for (const [field, name] of names) {
    expressionNames[name] = field;
  }
  return { expression: clauses.join(" "), expressionNames, expressionValues };
}

// Requests

export const get = (payload) => {
  return withOptional(
    { operation: "GetItem", key: toKey(payload.key) },
    { consistentRead: payload.consistentRead, projection: toProjection(payload.projection) },
  );
};

export const put = (payload) => {
  return withOptional(
    {
      operation: "PutItem",
      key: toKey(payload.key),
      attributeValues: util.dynamodb.toMapValues(payload.item),
    },
    {
      condition: toExpression(payload.condition),
      _version: payload._version,
      customPartitionKey: payload.customPartitionKey,
      populateIndexFields: payload.populateIndexFields,
    },
  );
};

export const remove = (payload) => {
  return withOptional(
    { operation: "DeleteItem", key: toKey(payload.key) },
    { condition: toExpression(payload.condition), _version: payload._version },
  );
};

export const update = (payload) => {
  return withOptional(
    {
      operation: "UpdateItem",
      key: toKey(payload.key),
      update: toUpdateExpression(payload.update),
    },
    { condition: toExpression(payload.condition), _version: payload._version },
  );
};

export const scan = (payload = {}) => {
  return withOptional(
    { operation: "Scan" },
    {
      index: payload.index,
      limit: payload.limit,
      nextToken: payload.nextToken,
      consistentRead: payload.consistentRead,
      segment: payload.segment,
      totalSegments: payload.totalSegments,
      filter: toExpression(payload.filter),
      projection: toProjection(payload.projection),
    },
  );
};

export const query = (payload) => {
  return withOptional(
    { operation: "Query", query: toExpression(payload.query) },
    {
      index: payload.index,
      limit: payload.limit,
      nextToken: payload.nextToken,
      consistentRead: payload.consistentRead,
      scanIndexForward: payload.scanIndexForward,
      select: payload.select,
      filter: toExpression(payload.filter),
      projection: toProjection(payload.projection),
    },
  );
};

export const sync = (payload = {}) => {
  return withOptional(
    { operation: "Sync" },
    {
      basePartitionKey: payload.basePartitionKey,
      deltaIndexName: payload.deltaIndexName,
      limit: payload.limit,
      nextToken: payload.nextToken,
      lastSync: payload.lastSync,
      filter: toExpression(payload.filter),
    },
  );
};

export const batchGet = (payload) => {
  const tables = {};
  for (const [table, request] of Object.entries(payload.tables)) {
    tables[table] = withOptional(
      { keys: request.keys.map(toKey) },
      { consistentRead: request.consistentRead, projection: toProjection(request.projection) },
    );
  }
  return { operation: "BatchGetItem", tables };
};

export const batchPut = (payload) => {
  const tables = {};
  for (const [table, items] of Object.entries(payload.tables)) {
    tables[table] = items.map((item) => util.dynamodb.toMapValues(item));
  }
  return { operation: "BatchPutItem", tables };
};

export const batchDelete = (payload) => {
  const tables = {};
  for (const [table, keys] of Object.entries(payload.tables)) {
    tables[table] = keys.map(toKey);
  }
  return { operation: "BatchDeleteItem", tables };
};

export const transactGet = (payload) => {
  const transactItems = payload.items.map((item) =>
    withOptional({ table: item.table, key: toKey(item.key) }, { projection: toProjection(item.projection) }),
  );
  return { operation: "TransactGetItems", transactItems };
};

export const transactWrite = (payload) => {
  const transactItems = payload.items.map((item) => {
    if (item.putItem) {
      const { table, key, item: attributes, condition } = item.putItem;
      return withOptional(
        {
          table,
          operation: "PutItem",
          key: toKey(key),
          attributeValues: util.dynamodb.toMapValues(attributes),
        },
        { condition: toExpression(condition) },
      );
    }
    if (item.updateItem) {
      const { table, key, update: updateObject, condition } = item.updateItem;
      return withOptional(
        { table, operation: "UpdateItem", key: toKey(key), update: toUpdateExpression(updateObject) },
        { condition: toExpression(condition) },
      );
    }
    if (item.deleteItem) {
      const { table, key, condition } = item.deleteItem;
      return withOptional(
        { table, operation: "DeleteItem", key: toKey(key) },
        { condition: toExpression(condition) },
      );
    }
    const { table, key, condition } = item.conditionCheck;
    return withOptional(
      { table, operation: "ConditionCheck", key: toKey(key) },
      { condition: toExpression(condition) },
    );
  });
  return { operation: "TransactWriteItems", transactItems };
};

// Set helpers. The `util.dynamodb` versions of these accept a null and answer one; these do not.

export const toStringSet = (list) => ({ SS: list });

export const toNumberSet = (numbers) => ({ NS: numbers });

export const toBinarySet = (values) => ({ BS: values });
