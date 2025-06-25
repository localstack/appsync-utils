import { v4 as uuidv4 } from 'uuid';
import { toJsonObject } from './rds/index.js'

class AppSyncUserError extends Error {
  constructor(message, errorType, data, errorInfo) {
    super(message);
    this.name = "AppSyncUserError";
    this.errorType = errorType;
    this.data = data;
    this.errorInfo = errorInfo;
  }
}

export const dynamodbUtils = {
  toDynamoDB: function(value) {
    if (typeof (value) === "number") {
      return this.toNumber(value);
    } else if (typeof (value) === "string") {
      return this.toString(value);
    } else if (typeof (value) === "boolean") {
      return this.toBoolean(value);
    } else if (typeof (value) === "object") {
      if (value.length !== undefined) {
        return this.toList(value);
      } else {
        return this.toMap(value);
      }
    } else {
      throw new Error(`Not implemented for ${value}`);
    }
  },

  toString: function(value) {
    if (value === null) { return null; };

    return { S: value };
  },

  toStringSet: function(value) {
    if (value === null) { return null; };

    return { SS: value };
  },

  toNumber: function(value) {
    if (value === null) { return null; };

    return { N: value };
  },

  toNumberSet: function(value) {
    if (value === null) { return null; };

    return { NS: value };
  },

  toBinary: function(value) {
    if (value === null) { return null; };

    return { B: value };
  },

  toBinarySet: function(value) {
    if (value === null) { return null; };

    return { BS: value };
  },

  toBoolean: function(value) {
    if (value === null) { return null; };

    return { BOOL: value };
  },

  toNull: function() {
    return { NULL: null };
  },

  toList: function(values) {
    let out = [];
    for (const value of values) {
      out.push(this.toDynamoDB(value));
    }
    return { L: out }
  },

  toMap: function(mapping) {
    return { M: this.toMapValues(mapping) };
  },

  toMapValues: function(mapping) {
    let out = {};
    for (const [k, v] of Object.entries(mapping)) {
      out[k] = this.toDynamoDB(v);
    }
    return out;
  },

  toS3Object: function(key, bucket, region, version) {
    let payload;
    if (version === undefined) {
      payload = {
        s3: {
          key,
          bucket,
          region,
        }
      };
    } else {
      payload = {
        s3: {
          key,
          bucket,
          region,
          version,
        }
      };
    };
    return this.toString(JSON.stringify(payload));
  },

  fromS3ObjectJson: function(value) {
    throw new Error("not implemented");
  },
}

const FILTER_CONTAINS = "contains";

export const util = {
  autoId: function() {
    return uuidv4();
  },
  appendError: function(message, errorType, data, errorInfo) {
    const error = { message, errorType, data, errorInfo }
    if( console.appendError ) {
      // LocalStack is adding `appendError` to console to allow adding to context.outErrors
      console.appendError(error)
    } else {
      // This will be handled in LocalStack in a side channel by printing to stderr
      console.error({ message, errorType, data, errorInfo });
    }
  },
  error: function(message, errorType, data, errorInfo) {
    // This will be handled in LocalStack in a side channel by printing to stderr
    console.error({ message, errorType, data, errorInfo });
    throw new AppSyncUserError(message, errorType, data, errorInfo)
  },
  unauthorized: function() {
    // This will be handled in LocalStack in a side channel by printing to stderr
    throw new AppSyncUserError("Unauthorized", "UnauthorizedException")
  },
  time: {
    nowFormatted: function(pattern) {
      // TODO: not completely correct, but close enough probably
      return new Date().toISOString();
    },
    nowISO8601: function() {
      return new Date().toISOString();
    },
  },
  transform: {
    toDynamoDBFilterExpression: function(value) {
      const items = Object.entries(value);
      if (items.length != 1) {
        throw new Error("invalid structure, should have one entry");
      }

      const [key, filter] = items[0];

      const filterItems = Object.entries(filter);
      if (filterItems.length !== 1) {
        throw new Error("invalid structure, should have one filter expression");
      }


      const [filterType, contents] = filterItems[0];
      const expressionName = `#${key}`;
      const expressionValue = `:${key}_${filterType}`;

      let expression;
      let expressionNames = {};
      let expressionValues = {};
      switch (filterType) {
        case FILTER_CONTAINS:
          expression = `(contains(${expressionName},${expressionValue}))`;
          expressionNames[expressionName] = key;
          expressionValues[expressionValue] = util.dynamodb.toDynamoDB(contents);
          break;
        default:
          throw new Error(`Not implemented for ${filterType}`);

      }

      return JSON.stringify({ expression, expressionNames, expressionValues });

    },
    toDynamoDBConditionExpression(condition) {
      const result = generateFilterExpression(condition);
      return JSON.stringify({
        expression: result.expressions.join(' ').trim(),
        expressionNames: result.expressionNames,
        // upstream is missing this value: https://github.com/aws-amplify/amplify-cli/blob/5cc1b556d8081421dc68ee264dac02d5660ffee7/packages/amplify-appsync-simulator/src/velocity/util/transform/index.ts#L11
        expressionValues: result.expressionValues,
      });
    },
  },
  dynamodb: dynamodbUtils,
  rds: { toJsonObject },
};

// embedded here because imports don't yet work
const OPERATOR_MAP = {
  ne: '<>',
  eq: '=',
  lt: '<',
  le: '<=',
  gt: '>',
  ge: '>=',
  in: 'contains',
};

const FUNCTION_MAP = {
  contains: 'contains',
  notContains: 'NOT contains',
  beginsWith: 'begins_with',
};

export function generateFilterExpression(filter, prefix, parent) {
  const expr = Object.entries(filter).reduce(
    (sum, [name, value]) => {
      let subExpr = {
        expressions: [],
        expressionNames: {},
        expressionValues: {},
      };
      const fieldName = createExpressionFieldName(parent);
      const filedValueName = createExpressionValueName(parent, name, prefix);

      switch (name) {
        case 'or':
        case 'and': {
          const JOINER = name === 'or' ? 'OR' : 'AND';
          if (Array.isArray(value)) {
            subExpr = scopeExpression(
              value.reduce((expr, subFilter, idx) => {
                const newExpr = generateFilterExpression(subFilter, [prefix, name, idx].filter((i) => i !== null).join('_'));
                return merge(expr, newExpr, JOINER);
              }, subExpr),
            );
          } else {
            subExpr = generateFilterExpression(value, [prefix, name].filter((val) => val !== null).join('_'));
          }
          break;
        }
        case 'not': {
          subExpr = scopeExpression(generateFilterExpression(value, [prefix, name].filter((val) => val !== null).join('_')));
          subExpr.expressions.unshift('NOT');
          break;
        }
        case 'between': {
          const expr1 = createExpressionValueName(parent, 'between_1', prefix);
          const expr2 = createExpressionValueName(parent, 'between_2', prefix);
          const exprName = createExpressionName(parent);
          const subExprExpr = `${createExpressionFieldName(parent)} BETWEEN ${expr1} AND ${expr2}`;
          const exprValues = {
            ...createExpressionValue(parent, 'between_1', value[0], prefix),
            ...createExpressionValue(parent, 'between_2', value[1], prefix),
          };
          subExpr = {
            expressions: [subExprExpr],
            expressionNames: exprName,
            expressionValues: exprValues,
          };
          break;
        }
        case 'ne':
        case 'eq':
        case 'gt':
        case 'ge':
        case 'lt':
        case 'le': {
          const operator = OPERATOR_MAP[name];
          subExpr = {
            expressions: [`(${fieldName} ${operator} ${filedValueName})`],
            expressionNames: createExpressionName(parent),
            expressionValues: createExpressionValue(parent, name, value, prefix),
          };
          break;
        }
        case 'attributeExists': {
          const existsName = value === true ? 'attribute_exists' : 'attribute_not_exists';
          subExpr = {
            expressions: [`(${existsName}(${fieldName}))`],
            expressionNames: createExpressionName(parent),
            expressionValues: [],
          };
          break;
        }
        case 'contains':
        case 'notContains':
        case 'beginsWith': {
          const functionName = FUNCTION_MAP[name];
          subExpr = {
            expressions: [`(${functionName}(${fieldName}, ${filedValueName}))`],
            expressionNames: createExpressionName(parent),
            expressionValues: createExpressionValue(parent, name, value, prefix),
          };
          break;
        }
        case 'in': {
          const operatorName = OPERATOR_MAP[name];
          subExpr = {
            expressions: [`(${operatorName}(${filedValueName}, ${fieldName}))`],
            expressionNames: createExpressionName(parent),
            expressionValues: createExpressionValue(parent, name, value, prefix),
          };
          break;
        }
        default:
          subExpr = scopeExpression(generateFilterExpression(value, prefix, name));
      }
      return merge(sum, subExpr);
    },
    {
      expressions: [],
      expressionNames: {},
      expressionValues: {},
    },
  );

  return expr;
}

function merge(expr1, expr2, joinCondition = 'AND') {
  if (!expr2.expressions.length) {
    return expr1;
  }

  const res = {
    expressions: [...expr1.expressions, expr1.expressions.length ? joinCondition : '', ...expr2.expressions],
    expressionNames: { ...expr1.expressionNames, ...expr2.expressionNames },
    expressionValues: { ...expr1.expressionValues, ...expr2.expressionValues },
  };
  return res;
}

function createExpressionValueName(fieldName, op, prefix) {
  return `:${[prefix, fieldName, op].filter((name) => name).join('_')}`;
}
function createExpressionName(fieldName) {
  return {
    [createExpressionFieldName(fieldName)]: fieldName,
  };
}

function createExpressionFieldName(fieldName) {
  return `#${fieldName}`;
}
function createExpressionValue(fieldName, op, value, prefix) {
  const exprName = createExpressionValueName(fieldName, op, prefix);
  const exprValue = dynamodbUtils.toDynamoDB(value);
  return {
    [`${exprName}`]: exprValue,
  };
}

function scopeExpression(expr) {
  const result = { ...expr };
  result.expressions = result.expressions.filter((e) => !!e);
  if (result.expressions.length > 1) {
    result.expressions = ['(' + result.expressions.join(' ') + ')'];
  }
  return result;
}
