import { AppSyncUserError } from '../errors.js';

// AWS leaks the exception its own implementation raises for a malformed tagged template. It is
// reproduced verbatim, like the rest of these messages.
const TEMPLATE_ARITY_ERROR = "java.lang.IllegalArgumentException: Unexpected argument passed to sql tagged template";

/**
 * Extract the value from the field given a row from sqlStatementResults.
 * 
 * See https://docs.aws.amazon.com/rdsdataservice/latest/APIReference/API_Field.html.
 */
function extractFieldValue(field) {
  // Handle isNull.
  if (field.isNull === true) {
    return null;
  }

  // Handle arrayValue.
  if ('arrayValue' in field) {
    const { arrayValue } = field;

    // Handle arrayValues.
    if (arrayValue.arrayValues) {
      return arrayValue.arrayValues.map(field => extractFieldValue(field));
    }
    
    // Handle stringValues, doubleValues, longValues and booleanValues.
    return Object.values(arrayValue)[0] ?? [];
  }

  // Handle stringValue, doubleValue, longValue, booleanValue and blobValue.
  return Object.values(field)[0];
}

export function toJsonObject(inputStr) {
  // on AWS inputStr is always a string, but on LocalStack the input may be an object.
  let input;
  try {
    input = JSON.parse(inputStr);
  } catch (SyntaxError) {
    input = inputStr;
  }
  let perStatement = [];
  for (const { records, columnMetadata } of input.sqlStatementResults) {
    const statement = [];
    if(typeof records === 'undefined' ){
      statement.push({});
    } else {
      for (const record of records) {
        const row = {};
        if (record.length !== columnMetadata.length) {
          // TODO: what to do here?!
          throw new Error("TODO");
        }

        for (const colNo in record) {
          // Use label if available, otherwise use name.
          const metadata = columnMetadata[colNo];
          const colName = metadata.label ?? metadata.name;

          // Extract the value from the field.
          const value = extractFieldValue(record[colNo]);
          if (value !== null) {
            row[colName] = value;
          }
        }

        statement.push(row);
      }
    }
    perStatement.push(statement);
  }
  return perStatement;
}

export function sql(strings, ...keys) {
  // AWS validates the arity when the template is built, not when it is rendered
  if (strings.length !== (keys.length + 1)) {
    throw new AppSyncUserError(TEMPLATE_ARITY_ERROR);
  }

  return { strings, keys };
}

// `sql` returns `{ strings, keys }`, and both keys are present even for a template that
// interpolates nothing
function isSqlTemplate(value) {
  return (value != null) && (value.strings !== undefined) && (value.keys !== undefined);
}


/**
 * Every statement constructor validates its payload the same way, and does so when it is called
 * rather than when the statement is rendered - so the message names the constructor, not the
 * `create*Statement` it was going to be passed to.
 */
function statementPayload(properties, verb) {
  if (properties === undefined) {
    throw new AppSyncUserError(`An argument is expected to be passed to ${verb}`);
  }

  if ((properties === null) || (typeof properties !== 'object') || Array.isArray(properties)) {
    throw new AppSyncUserError("Expected payload to be an Object.");
  }

  return properties;
}

export function select(s) {
  return { type: "SELECT", properties: statementPayload(s, 'select') };
}

export function insert(s) {
  return { type: "INSERT", properties: statementPayload(s, 'insert') };
}

export function update(s) {
  return { type: "UPDATE", properties: statementPayload(s, 'update') };
}

export function remove(s) {
  return { type: "REMOVE", properties: statementPayload(s, 'remove') };
}

// SQL operators for the simple comparison conditions, shared by the direct form (`{ eq: 1 }`) and
// the `size` form (`{ size: { eq: 1 } }`)
const COMPARISON_OPERATORS = {
  eq: '=',
  ne: '!=',
  gt: '>',
  lt: '<',
  ge: '>=',
  le: '<=',
};

class StatementBuilder {
  constructor({ quoteChar, functionName, supportsReturning = true }) {
    this.quoteChar = quoteChar;
    // named in the messages AWS raises for a statement it cannot make sense of
    this.functionName = functionName;
    this.supportsReturning = supportsReturning;
    this.result = {
      statements: [],
      variableMap: {},
      variableTypeHintMap: {},
    };

    this.variableIndex = 0;
  }

  render(statements) {
    if (statements.length === 0) {
      throw new AppSyncUserError(`An argument is expected to be passed to ${this.functionName}`);
    }

    for (const stmt of statements) {
      if (typeof stmt === "string") {
        // a raw SQL string passes straight through
        this.renderRawTemplateStatement(stmt);
      } else if (isSqlTemplate(stmt)) {
        this.renderTaggedTemplateStatement(stmt.strings, stmt.keys);
      } else if ((stmt != null) && (stmt.type !== undefined) && (stmt.properties !== undefined)) {
        this.renderStructuredStatement(stmt.type, stmt.properties);
      } else {
        this.unsupportedStatement();
      }
    }

    return this.result;
  }

  unsupportedStatement() {
    throw new AppSyncUserError(`Unsupported type is passed as argument to ${this.functionName}`);
  }

  renderRawTemplateStatement(query) {
    this.result.statements.push(query);
  }

  renderTaggedTemplateStatement(strings, keys) {
    this.result.statements.push(this.renderTemplate(strings, keys));
  }

  /**
   * Interpolate a `sql` tagged template, binding every interpolated value to a variable. A whole
   * statement can be a template, and so can a `where` clause, so this returns the fragment rather
   * than pushing it.
   */
  renderTemplate(strings, keys) {
    if (strings.length !== (keys.length + 1)) {
      throw new AppSyncUserError(TEMPLATE_ARITY_ERROR);
    }

    let stmt = strings[0];
    for (let i = 0; i < keys.length; i++) {
      stmt = `${stmt}${this.newVariable(keys[i])}${strings[i + 1]}`;
    }

    return stmt;
  }

  /**
   * Assemble a statement from its clause fragments the way AWS does: a fragment that renders to
   * nothing contributes nothing at all, and the finished statement is right-trimmed. That is what
   * turns an empty column list into `SELECT FROM "t"` rather than `SELECT  FROM "t"`. AWS emits
   * these dangling keywords too - the SQL is invalid on both sides - so they are reproduced
   * byte-for-byte instead of being silently repaired into valid-but-different SQL.
   */
  joinClauses(parts) {
    return parts.filter(part => part !== "" && part != null).join(' ').trimEnd();
  }

  renderStructuredStatement(type, properties) {
    switch (type) {
      case "SELECT": {
        const { columns, where, orderBy, limit, offset } = properties;
        const parts = ["SELECT"];

        // an absent column list means every column. Anything else is validated, so `columns: []`
        // still leaves a dangling `SELECT`, like AWS
        parts.push(columns == null ? '*' : this.renderColumnList(columns));

        parts.push(`FROM ${this.resolveTableName(properties, true)}`);
        parts.push(...this.buildWhereParts(where));

        if (orderBy != null) {
          if (!Array.isArray(orderBy)) {
            throw new AppSyncUserError("orderBy expects an array.");
          }

          // an empty sort list drops the whole clause, ORDER BY keyword included, like AWS
          if (orderBy.length > 0) {
            parts.push('ORDER BY', orderBy.map(item => this.renderOrderByItem(item)).join(', '));
          }
        }

        // limit/offset are optional and may be passed as null; 0 is a valid value
        if (limit != null) {
          parts.push(`LIMIT ${this.renderRowCount(limit, 'limit')}`);
        }

        if (offset != null) {
          parts.push(`OFFSET ${this.renderRowCount(offset, 'offset')}`);
        }

        this.result.statements.push(this.joinClauses(parts));
        break;
      }
      case "REMOVE": {
        const { where, returning, } = properties;
        const parts = [`DELETE FROM ${this.resolveTableName(properties)}`];

        parts.push(...this.buildWhereParts(where));

        if (returning) {
          parts.push('RETURNING', this.renderReturning(returning));
        }

        this.result.statements.push(this.joinClauses(parts));
        break;
      }
      case "INSERT": {
        const { returning } = properties;
        const values = this.resolveValues(properties, 'insert');
        const parts = [`INSERT INTO ${this.resolveTableName(properties)}`];

        let columnTextItems = [];
        let valuesTextItems = [];
        for (const [columnName, value] of Object.entries(values)) {
          columnTextItems.push(this.quoteIdentifier(columnName));
          valuesTextItems.push(this.renderValue(value));
        }
        parts.push(`(${columnTextItems.join(', ')}) VALUES (${valuesTextItems.join(', ')})`);

        if (returning) {
          parts.push('RETURNING', this.renderReturning(returning));
        }

        this.result.statements.push(this.joinClauses(parts));
        break;
      }
      case "UPDATE": {
        const { where } = properties;
        const values = this.resolveValues(properties, 'update');
        const parts = [`UPDATE ${this.resolveTableName(properties)}`, 'SET'];

        let columnDefinitionItems = [];
        for (const [columnName, value] of Object.entries(values)) {
          columnDefinitionItems.push(`${this.quoteIdentifier(columnName)} = ${this.renderValue(value)}`);
        }
        parts.push(columnDefinitionItems.join(', '));

        parts.push(...this.buildWhereParts(where));

        this.result.statements.push(this.joinClauses(parts));
        break;
      }
      default:
        this.unsupportedStatement();
    }
  }

  buildWhereParts(where) {
    if (where == null) {
      return [];
    }

    // the whole clause may be a `sql` tagged template instead of a condition object, sharing the
    // statement's variable numbering
    if (isSqlTemplate(where)) {
      const rendered = this.renderTemplate(where.strings, where.keys);
      return rendered ? ['WHERE', rendered] : [];
    }

    if ((typeof where !== 'object') || Array.isArray(where)) {
      throw new AppSyncUserError("WHERE values are expected to be SQL templates or a condition object.");
    }

    // a `where` that renders to nothing - `{}`, `{ and: [] }`, or a column with no condition -
    // drops the WHERE keyword along with its body
    const clause = this.buildWhereClause(where);
    return clause ? ['WHERE', clause] : [];
  }

  renderOrderByItem(item) {
    if ((item == null) || (typeof item !== 'object') || Array.isArray(item)) {
      throw new AppSyncUserError("orderBy item expected to be an object.");
    }

    const { column, dir } = item;
    if (typeof column !== 'string') {
      throw new AppSyncUserError("orderBy item expected to have property column.");
    }

    // AWS uppercases `dir` and accepts only ASC or DESC. Interpolating it raw would let a caller
    // inject arbitrary SQL through the sort direction. Only a string is checked at all: any other
    // value, null included, means ASC, while an empty string is rejected - matching AWS.
    const direction = typeof dir !== 'string' ? 'ASC' : dir.toUpperCase();
    if ((direction !== 'ASC') && (direction !== 'DESC')) {
      throw new AppSyncUserError(`orderBy dir can have either ASC or DESC found ${dir}.`);
    }

    return `${this.quoteIdentifier(column)} ${direction}`;
  }

  renderReturning(returning) {
    // the column list is validated before the dialect is considered: a malformed `returning` on
    // MySQL is reported as malformed, not as unsupported
    const columns = this.renderColumnList(returning);

    // MySQL has no RETURNING clause and AWS refuses the key outright rather than emitting SQL the
    // engine would reject
    if (!this.supportsReturning) {
      throw new AppSyncUserError("returning is not supported in MySQL.");
    }

    return columns;
  }

  /**
   * Validate and quote a list of column names. AWS applies the same rules, and raises the same
   * messages, for a select's `columns` and an insert or delete's `returning`.
   */
  renderColumnList(columns) {
    // AWS accepts either the bare string `*` or an array of column names
    if (columns === '*') {
      return columns;
    }

    if (!Array.isArray(columns)) {
      throw new AppSyncUserError("Expected column to be * or an array.");
    }

    return columns.map(name => {
      if (typeof name !== 'string') {
        throw new AppSyncUserError("Invalid type in column array.");
      }

      return this.quoteIdentifier(name);
    }).join(', ');
  }

  resolveValues(properties, verb) {
    const { values } = properties;
    if (values == null) {
      throw new AppSyncUserError(`values are expected to be passed to ${verb}`);
    }

    if ((typeof values !== 'object') || Array.isArray(values)) {
      // AWS's wording, grammar included
      throw new AppSyncUserError("Expected values to an Object.");
    }

    return values;
  }

  /**
   * LIMIT and OFFSET are bound as numbers, and AWS coerces a numeric string on the way in. An
   * empty string is the one value coercion would quietly turn into 0, and AWS rejects it.
   */
  renderRowCount(value, keyword) {
    const count = value === '' ? NaN : Number(value);
    if (Number.isNaN(count)) {
      throw new AppSyncUserError(`${keyword} expects a number.`);
    }

    return this.newVariable(count);
  }

  renderValue(value) {
    // AWS inlines a NULL literal for a nullish value instead of binding a variable to it. Note
    // that `false` and `0` are perfectly valid bound values, hence the nullish and not falsy test.
    if (value == null) {
      return 'NULL';
    }

    return this.newVariable(value);
  }

  newVariable(value, addTypeHint = true) {
    const name = `:P${this.variableIndex}`;
    if (value.type) {
      this.result.variableMap[name] = value.value;
      if (addTypeHint) {
        this.result.variableTypeHintMap[name] = value.type;
      }
    } else {
      this.result.variableMap[name] = value;
    }
    this.variableIndex++;
    return name;
  }

  buildWhereClause(where, startGrouping = "", endGrouping = "", default_operator="AND") {
    let blocks = [];
    for (const key in where) {
      if ( ["or", "and"].includes(key)) {
        const ops = key.toUpperCase();
        if (!Array.isArray(where[key])) {
          throw new AppSyncUserError(`${key} expects conditions to be an array`);
        }
        const parts = where[key].map(part => {
          // only a condition object is accepted here - unlike a top-level `where`, a nested `sql`
          // template is refused
          if ((part == null) || (typeof part !== 'object') || Array.isArray(part) || isSqlTemplate(part)) {
            throw new AppSyncUserError(`Expected ${key} to be an Object.`);
          }

          return this.buildWhereClause(part, "(", ")", ops);
        });
        const group = parts.join(` ${ops} `);
        // an `and`/`or` holding no conditions contributes nothing at all: emitting the grouping on
        // its own would produce `WHERE ()`
        if (group !== "") {
          blocks.push(`${startGrouping}${group}${endGrouping}`);
        }
      } else {
        // implicit single clause
        const block = {};
        block[key] = where[key];
        blocks.push(this.buildWhereStatement(block, startGrouping, endGrouping));
      }
    }

    return blocks.join(` ${default_operator} `);
  }

  buildWhereStatement(defn, startGrouping = "(", endGrouping = ")") {
    const columnName = Object.keys(defn)[0];
    const condition = defn[columnName];

    if ((condition == null) || (typeof condition !== 'object') || Array.isArray(condition)) {
      throw new AppSyncUserError("Expected condition to be an Object.");
    }

    // several conditions on the same column are ANDed together
    const statements = Object.keys(condition).map(
      conditionType => this.buildCondition(columnName, condition[conditionType], conditionType)
    );

    // a column that renders nothing - carrying no condition at all, e.g. an optional filter the
    // resolver left empty, or only an empty `size` - contributes nothing, and must not pick up the
    // grouping on its way out or it would produce `WHERE ()`
    const joined = statements.join(" AND ");
    return joined === "" ? "" : `${startGrouping}${joined}${endGrouping}`;
  }

  buildCondition(columnName, rawValue, conditionType) {
    const column = this.quoteIdentifier(columnName);
    const path = `${columnName}.${conditionType}`;

    switch (conditionType) {
      case "size":
        return this.buildSizeCondition(column, rawValue, path);
      case "between":
        return this.buildBetweenCondition(column, rawValue, path);
      case "attributeExists":
        // AWS wants a real boolean here rather than anything truthy
        return `${column} IS ${this.requireBoolean(rawValue, path) ? "NOT " : ""}NULL`;
      case "contains":
        // the wildcards make `contains` a substring match rather than an equality test
        return `${column} LIKE ${this.newVariable(`%${this.requireString(rawValue, path)}%`)}`;
      case "beginsWith":
        return `${column} LIKE ${this.newVariable(`${this.requireString(rawValue, path)}%`)}`;
      case "notContains":
        // deliberately unwrapped - AWS adds no wildcards to notContains
        return `${column} NOT LIKE ${this.newVariable(this.requireString(rawValue, path))}`;
      default: {
        const operator = COMPARISON_OPERATORS[conditionType];
        if (!operator) {
          throw new AppSyncUserError(`Unsupported condition ${path}.`);
        }

        // unlike the same comparison under `size`, a direct comparison against a nullish value is
        // rejected rather than rendered as `= NULL`
        return `${column} ${operator} ${this.newVariable(this.requireNonNull(rawValue, path))}`;
      }
    }
  }

  buildBetweenCondition(target, rawValue, path) {
    // AWS uses two distinct messages here: one for a value that is not an array at all, another
    // for an array of the wrong length
    if (!Array.isArray(rawValue)) {
      throw new AppSyncUserError(`${path} condition expects an array with length of 2.`);
    }

    if (rawValue.length !== 2) {
      throw new AppSyncUserError(`${path} condition expects an array with 2 values but received an array with length ${rawValue.length}.`);
    }

    // mapping in order keeps the bound variables numbered low-then-high
    const [low, high] = rawValue.map(bound => this.renderValue(bound));
    return `${target} BETWEEN ${low} AND ${high}`;
  }

  buildSizeCondition(column, rawValue, path) {
    if ((typeof rawValue !== 'object') || (rawValue === null) || Array.isArray(rawValue)) {
      throw new AppSyncUserError(`Expected ${path} to be an Object.`);
    }

    // the comparison runs against the column's length, with the target repeated for each operator.
    // An empty object renders nothing, like any other empty condition.
    const target = `LENGTH (${column})`;
    const statements = Object.keys(rawValue).map(operator => {
      if (operator === "between") {
        // the path stays the outer `<column>.size` in the error message, matching AWS
        return this.buildBetweenCondition(target, rawValue[operator], path);
      }

      const comparison = COMPARISON_OPERATORS[operator];
      if (!comparison) {
        throw new AppSyncUserError(`${path} has invalid size operator.`);
      }

      // unlike a direct comparison, a nullish value here is inlined rather than rejected
      return `${target} ${comparison} ${this.renderValue(rawValue[operator])}`;
    });

    return statements.join(" AND ");
  }

  requireNonNull(value, path) {
    if (value == null) {
      throw new AppSyncUserError(`Value for ${path} can't be null.`);
    }

    return value;
  }

  requireString(value, path) {
    // AWS rejects a non-string for the wildcard conditions instead of coercing it
    if (typeof this.requireNonNull(value, path) !== 'string') {
      throw new AppSyncUserError(`${path} expects a string value to be passed.`);
    }

    return value;
  }

  requireBoolean(value, path) {
    if (typeof this.requireNonNull(value, path) !== 'boolean') {
      throw new AppSyncUserError(`${path} expects a boolean value to be passed.`);
    }

    return value;
  }

  resolveTableName(properties, allowFrom = false) {
    const { table, from } = properties;

    // `from` is an alias for `table`, but only in select(): insert/update/remove ignore the key
    // entirely, and only select() rejects the two being passed together
    if (allowFrom && (table != null) && (from != null)) {
      throw new AppSyncUserError("'from' and 'table' keys cannot be used together");
    }

    if (allowFrom && (table == null) && (from != null)) {
      // `from` carries its own type message, and rejects the array `table` would too
      if ((typeof from !== 'string') && ((typeof from !== 'object') || Array.isArray(from))) {
        throw new AppSyncUserError("'from' value is expected to be string or object.");
      }

      return this.renderTableName(from);
    }

    if (table == null) {
      throw new AppSyncUserError("'table' or 'from' key is required.");
    }

    return this.renderTableName(table);
  }

  /**
   * A table is named either by a string or by a single-entry alias object, which AWS renders with
   * the *value* as the table name and the *key* as the alias: `{ persons: "p" }` becomes
   * `"p" as "persons"`.
   */
  renderTableName(name) {
    if (typeof name === 'string') {
      return this.quoteIdentifier(name);
    }

    if ((typeof name !== 'object') || Array.isArray(name)) {
      throw new AppSyncUserError("table name is expected to be a string or alias.");
    }

    const entries = Object.entries(name);
    if (entries.length > 1) {
      throw new AppSyncUserError("table alias is allowed only one key-value pair.");
    }

    if (entries.length === 0) {
      // an exception AWS's own implementation leaks for an empty alias object, reproduced verbatim
      // so error handling behaves the same here as it does against AWS
      throw new AppSyncUserError("java.util.NoSuchElementException");
    }

    const [alias, actual] = entries[0];
    if (typeof actual !== 'string') {
      throw new AppSyncUserError("Table alias value is expected to be a string.");
    }

    return `${this.quoteIdentifier(actual)} as ${this.quoteIdentifier(alias)}`;
  }

  quoteIdentifier(rawName) {
    // A bare `*` stays unquoted (`SELECT *`), matching AWS AppSync. Note that AWS quotes the
    // star in a qualified identifier (`persons.*` becomes `"persons"."*"`), so only the exact
    // string `*` is special-cased.
    if (rawName === '*') {
      return rawName;
    }
    // Split schema/table-qualified identifiers (e.g. "schema.table" or "table.column") on `.`
    // and quote each segment individually, matching AWS AppSync (e.g. `"schema"."table"`)
    // rather than quoting the whole string as one literal identifier (`"schema.table"`).
    return rawName.split('.').map(part => `${this.quoteChar}${part}${this.quoteChar}`).join('.');
  }
}

export function createPgStatement(...statements) {
  let builder = new StatementBuilder({
    quoteChar: '"',
    functionName: 'createPgStatement',
  });
  return builder.render(statements);
}

export function createMySQLStatement(...statements) {
  let builder = new StatementBuilder({
    quoteChar: '`',
    functionName: 'createMySQLStatement',
    supportsReturning: false,
  });
  return builder.render(statements);
}


export const typeHint = {
  DECIMAL: function (value) {
    return {
      type: "DECIMAL",
      value,
    };
  },
  JSON: function (value) {
    return {
      type: "JSON",
      value,
    };
  },
  TIME: function (value) {
    return {
      type: "TIME",
      value,
    };
  },
  DATE: function (value) {
    return {
      type: "DATE",
      value,
    };
  },
  UUID: function (value) {
    return {
      type: "UUID",
      value,
    };
  },
  TIMESTAMP: function (value) {
    return {
      type: "TIMESTAMP",
      value: value.toISOString(),
    };
  }
};
