import { v4 as uuidv4 } from 'uuid';
import { toJsonObject } from './rds/index.js'
import { AppSyncUserError } from './errors.js'

export const dynamodbUtils = {
  toDynamoDB: function(value) {
    if (value === null) {
      return this.toNull();
    }
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
    // takes the JSON string an S3 link is stored as, not the `{S: ...}` attribute wrapping it
    if (typeof value !== "string") {
      return null;
    }
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      return null;
    }
    const s3 = parsed?.s3;
    if (!s3) {
      return null;
    }
    const out = { bucket: s3.bucket, region: s3.region, key: s3.key };
    if (s3.version !== undefined) {
      out.version = s3.version;
    }
    return out;
  },
}

// The strings `util.authType()` returns, see
// https://docs.aws.amazon.com/appsync/latest/devguide/resolver-util-reference.html
const AUTH_TYPE_API_KEY = "API Key Authorization";
const AUTH_TYPE_IAM = "IAM Authorization";
const AUTH_TYPE_USER_POOL = "User Pool Authorization";
const AUTH_TYPE_OIDC = "Open ID Connect Authorization";
const AUTH_TYPE_LAMBDA = "Lambda Authorization";

// AppSync populates `ctx.identity` with a shape that is specific to the authorization mode of the
// API, so the mode can be recovered from the identity alone. `keys` is the complete set of keys
// the mode's identity may carry and `required` the ones it always carries, both taken from the
// recordings described on `authTypeFromIdentity`.
const IDENTITY_SCHEMAS = [
  {
    authType: AUTH_TYPE_IAM,
    keys: ["accountId", "cognitoIdentityPoolId", "cognitoIdentityId", "sourceIp", "username",
      "userArn", "cognitoIdentityAuthType", "cognitoIdentityAuthProvider"],
    required: ["accountId", "sourceIp", "username", "userArn"],
  },
  {
    authType: AUTH_TYPE_USER_POOL,
    keys: ["sourceIp", "username", "groups", "sub", "issuer", "claims", "defaultAuthStrategy"],
    required: ["sourceIp", "username", "sub", "issuer", "claims", "defaultAuthStrategy"],
  },
  {
    authType: AUTH_TYPE_OIDC,
    keys: ["sub", "issuer", "claims"],
    required: ["sub", "issuer", "claims"],
  },
  {
    // `resolverContext` is what the authorizer returned, and an authorizer may return nothing at
    // all, so an identity with no keys whatsoever is a Lambda identity to AWS
    authType: AUTH_TYPE_LAMBDA,
    keys: ["resolverContext"],
    required: [],
  },
];

// Recorded from `EvaluateCode` against every identity shape in the AppSync resolver context
// reference plus the ambiguous mixtures: an identity belongs to a mode when all of its keys are
// keys of that mode and every key the mode requires is present and not null. Foreign keys rule a
// mode out rather than being ignored, so `{sub, issuer, claims, username}` is an incomplete user
// pool identity and not an OIDC one. The modes are mutually exclusive under those two rules, so
// the order below only makes the outcome deterministic. Anything unmatched, an absent identity
// included, is an API key request, which is the mode that populates no identity at all.
function authTypeFromIdentity(identity) {
  if (identity === null || typeof identity !== "object" || Array.isArray(identity)) {
    return AUTH_TYPE_API_KEY;
  }
  const keys = Object.keys(identity);
  for (const schema of IDENTITY_SCHEMAS) {
    const noForeignKeys = keys.every((key) => schema.keys.includes(key));
    const hasRequired = schema.required.every((key) => identity[key] !== null && identity[key] !== undefined);
    if (noForeignKeys && hasRequired) {
      return schema.authType;
    }
  }
  return AUTH_TYPE_API_KEY;
}

// The context of the request being resolved. Every function on `util` is otherwise pure, but
// `util.authType()` describes the request while having no access to the `ctx` the resolver
// receives, so the host installs the context here before handing control to the resolver. Shared
// by every request in the process, hence the host sets it immediately before the call.
let resolverContext = null;

export function setResolverContext(ctx) {
  resolverContext = ctx ?? null;
}

export const util = {
  autoId: function() {
    return uuidv4();
  },
  appendError: function(message, errorType, data, errorInfo) {
    const error = { message, errorType, data, errorInfo }
    if( console.appendError ) {
      // LocalStack is adding `appendError` to console, allowing to push errors to `context.outErrors`
      console.appendError(error)
    } else {
      // To avoid breaking code where `appendError` is not implemented, we instead print to stderr
      console.error({ message, errorType, data, errorInfo });
    }
  },
  error: function(message, errorType, data, errorInfo) {
    throw new AppSyncUserError(message, errorType, data, errorInfo)
  },
  unauthorized: function() {
    throw new AppSyncUserError("Unauthorized", "UnauthorizedException")
  },
  authType: function() {
    return authTypeFromIdentity(resolverContext?.identity);
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
    toDynamoDBFilterExpression: function(filter) {
      return transformToExpression(filter);
    },
    toDynamoDBConditionExpression: function(condition) {
      return transformToExpression(condition);
    },
    toSubscriptionFilter: function(filter, ignoredFields, rules) {
      return toSubscriptionFilter(filter, ignoredFields, rules);
    },
  },
  dynamodb: dynamodbUtils,
  rds: { toJsonObject },
};

// Both entry points of `util.transform` build a DynamoDB expression out of the same filter object.
// Every case recorded from AWS produced byte identical output for the two of them, so they share
// one builder. An attribute is referenced as `#<field>` and a value placeholder is named after the
// nesting it sits in, the field and the operator, as in `:and_0_content_eq`.

const COMPARISON_OPERATORS = {
  eq: "=",
  ne: "<>",
  lt: "<",
  le: "<=",
  gt: ">",
  ge: ">=",
};

// rendered as `<function>(<target>,<value>)`, without a space after the comma
const FUNCTION_OPERATORS = {
  contains: "contains",
  notContains: "NOT contains",
  beginsWith: "begins_with",
};

// `attributeType` takes the friendly name of a DynamoDB type rather than the type code itself
const ATTRIBUTE_TYPE_CODES = {
  _null: "NULL",
  string: "S",
  stringSet: "SS",
  number: "N",
  numberSet: "NS",
  binary: "B",
  binarySet: "BS",
  boolean: "BOOL",
  list: "L",
  map: "M",
};

// A filter AWS cannot turn into an expression, an unknown operator or an operand of the wrong type
// for its operator, comes back as `null` rather than as an error. The builder throws this to unwind
// and the entry point turns it back into `null`.
class InvalidFilter extends Error {}

const isFilterObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const hasOperator = (operators, operator) => Object.hasOwn(operators, operator);

// The `{expression, expressionNames, expressionValues}` object a DynamoDB request carries.
// `util.transform` serialises it, while the `dynamodb` module embeds it as an object, so both go
// through the one builder. `null` for a filter that cannot be rendered, matching `util.transform`.
export function buildDynamoDBExpression(filter) {
  try {
    const node = buildFilter(filter, [], false);
    return {
      expression: node.expression,
      expressionNames: node.expressionNames,
      expressionValues: node.expressionValues,
    };
  } catch (error) {
    if (error instanceof InvalidFilter) {
      return null;
    }
    throw error;
  }
}

function transformToExpression(filter) {
  const expression = buildDynamoDBExpression(filter);
  return expression === null ? null : JSON.stringify(expression);
}

// `wrap` parenthesises a group that holds more than one member. The filter as a whole is never
// wrapped, every group below it is. Members that render to nothing are joined all the same, which
// is what leaves a dangling joiner on AWS for a filter such as `{a: {eq: 1}, b: {}}`.
function joinFilters(nodes, joiner, wrap) {
  const expression = nodes.map((node) => node.expression).join(` ${joiner} `);
  return {
    expression: wrap && nodes.length > 1 ? `(${expression})` : expression,
    expressionNames: Object.assign({}, ...nodes.map((node) => node.expressionNames)),
    expressionValues: Object.assign({}, ...nodes.map((node) => node.expressionValues)),
  };
}

// `path` is the nesting the value placeholders are named after: the `and`/`or` groups with their
// index, `not`, then the field and one `size` per level of size nesting.
function buildFilter(filter, path, wrap) {
  if (!isFilterObject(filter)) {
    throw new InvalidFilter();
  }
  const nodes = Object.entries(filter).map(([key, value]) => {
    if (key === "and" || key === "or") {
      return buildGroup(key, value, path);
    }
    if (key === "not") {
      return buildNegation(value, path);
    }
    return buildField(key, value, [...path, key], false);
  });
  return joinFilters(nodes, "AND", wrap);
}

function buildGroup(key, members, path) {
  // AWS takes the list form only, even though its own types also describe a map
  if (!Array.isArray(members)) {
    throw new InvalidFilter();
  }
  const nodes = members.map((member, index) => buildFilter(member, [...path, key, index], false));
  return joinFilters(nodes, key === "or" ? "OR" : "AND", true);
}

function buildNegation(filter, path) {
  const node = buildFilter(filter, [...path, "not"], true);
  return { ...node, expression: `(NOT ${node.expression})` };
}

function buildField(field, operators, path, sized) {
  if (!isFilterObject(operators)) {
    throw new InvalidFilter();
  }
  const name = `#${field}`;
  const target = sized ? `size(${name})` : name;
  const nodes = Object.entries(operators).map(([operator, operand]) => {
    if (operator === "size") {
      // nesting `size` deepens the placeholder but never nests the call itself
      return buildField(field, operand, [...path, operator], true);
    }
    return buildOperator(target, operator, operand, `:${[...path, operator].join("_")}`);
  });
  const node = joinFilters(nodes, "AND", true);
  // a field contributes its name even when it carries no operator at all
  return { ...node, expressionNames: { [name]: field, ...node.expressionNames } };
}

function buildOperator(target, operator, operand, value) {
  const leaf = (expression, expressionValues = {}) => ({
    expression,
    expressionNames: {},
    expressionValues,
  });

  if (hasOperator(COMPARISON_OPERATORS, operator)) {
    return leaf(`(${target} ${COMPARISON_OPERATORS[operator]} ${value})`, {
      [value]: dynamodbUtils.toDynamoDB(operand),
    });
  }
  if (hasOperator(FUNCTION_OPERATORS, operator)) {
    return leaf(`(${FUNCTION_OPERATORS[operator]}(${target},${value}))`, {
      [value]: dynamodbUtils.toDynamoDB(operand),
    });
  }

  switch (operator) {
    case "between": {
      // anything the range does not need is ignored, but it does need both ends
      if (!Array.isArray(operand) || operand.length < 2) {
        throw new InvalidFilter();
      }
      return leaf(`(${target} BETWEEN ${value}_start AND ${value}_end)`, {
        [`${value}_start`]: dynamodbUtils.toDynamoDB(operand[0]),
        [`${value}_end`]: dynamodbUtils.toDynamoDB(operand[1]),
      });
    }
    case "in": {
      if (!Array.isArray(operand)) {
        throw new InvalidFilter();
      }
      // an empty list leaves AWS with no operand to render and it emits this literal
      if (operand.length === 0) {
        return leaf("(null)");
      }
      const values = operand.map((_operand, index) => `${value}_${index}`);
      return leaf(
        // the only operator whose comma is followed by a space
        `(${target} IN (${values.join(", ")}))`,
        Object.fromEntries(values.map((name, index) => [name, dynamodbUtils.toDynamoDB(operand[index])])),
      );
    }
    case "attributeExists": {
      if (typeof operand !== "boolean") {
        throw new InvalidFilter();
      }
      return leaf(`(${operand ? "attribute_exists" : "attribute_not_exists"}(${target}))`);
    }
    case "attributeType": {
      if (typeof operand !== "string" || !hasOperator(ATTRIBUTE_TYPE_CODES, operand)) {
        throw new InvalidFilter();
      }
      return leaf(`(attribute_type(${target},${value}))`, {
        [value]: dynamodbUtils.toDynamoDB(ATTRIBUTE_TYPE_CODES[operand]),
      });
    }
    default:
      throw new InvalidFilter();
  }
}

// `util.transform.toSubscriptionFilter` expands a filter into the disjunctive normal form AppSync
// delivers subscriptions against: a list of groups, each an AND of individual filters, the groups
// themselves OR-ed. Recorded from AWS, which validates nothing - an unknown operator is passed
// straight through, and `not` is treated as an ordinary field name rather than a negation.

// every operator of a field, every member of an `or`, and every rule is an alternative, so the
// groups multiply out
const crossFilters = (groups, alternatives) =>
  groups.flatMap((group) => alternatives.map((alternative) => [...group, ...alternative]));

function subscriptionFilterAlternatives(field, operators) {
  if (!isFilterObject(operators)) {
    throw new InvalidFilter();
  }
  return Object.entries(operators).map(([operator, value]) => [{ fieldName: field, operator, value }]);
}

function expandSubscriptionFilter(filter, ignoredFields) {
  if (!isFilterObject(filter)) {
    throw new InvalidFilter();
  }
  let groups = [[]];
  for (const [key, value] of Object.entries(filter)) {
    if (key === "and") {
      if (!Array.isArray(value)) {
        throw new InvalidFilter();
      }
      for (const member of value) {
        groups = crossFilters(groups, expandSubscriptionFilter(member, ignoredFields));
      }
      continue;
    }
    if (key === "or") {
      if (!Array.isArray(value)) {
        throw new InvalidFilter();
      }
      groups = crossFilters(groups, value.flatMap((member) => expandSubscriptionFilter(member, ignoredFields)));
      continue;
    }
    if (ignoredFields.includes(key)) {
      continue;
    }
    groups = crossFilters(groups, subscriptionFilterAlternatives(key, value));
  }
  return groups;
}

function toSubscriptionFilter(filter, ignoredFields, rules) {
  const ignored = Array.isArray(ignoredFields) ? ignoredFields : [];
  let groups;
  try {
    groups = expandSubscriptionFilter(filter, ignored);
    if (isFilterObject(rules)) {
      // a rule is satisfied when any one of them holds, so they multiply onto every group
      const alternatives = Object.entries(rules).flatMap(([field, operators]) =>
        subscriptionFilterAlternatives(field, operators),
      );
      if (alternatives.length) {
        groups = crossFilters(groups, alternatives);
      }
    }
  } catch (error) {
    if (error instanceof InvalidFilter) {
      return null;
    }
    throw error;
  }
  // a group that collected no filter at all is dropped, so an empty filter yields an empty list
  return { filterGroup: groups.filter((filters) => filters.length).map((filters) => ({ filters })) };
}
