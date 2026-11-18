import { codeError } from '../errors.js';

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
    throw codeError(TEMPLATE_ARITY_ERROR);
  }

  return { strings, keys };
}

// `sql` returns `{ strings, keys }`, and both keys are present even for a template that
// interpolates nothing
function isSqlTemplate(value) {
  return (value != null) && (value.strings !== undefined) && (value.keys !== undefined);
}

// what `select`, `insert`, `update` and `remove` return
function isStructuredStatement(value) {
  return (value != null) && (value.type !== undefined) && (value.properties !== undefined);
}


/**
 * Every statement constructor validates its payload the same way, and does so when it is called
 * rather than when the statement is rendered - so the message names the constructor, not the
 * `create*Statement` it was going to be passed to.
 */
function statementPayload(properties, verb) {
  if (properties === undefined) {
    throw codeError(`An argument is expected to be passed to ${verb}`);
  }

  if ((properties === null) || (typeof properties !== 'object') || Array.isArray(properties)) {
    throw codeError("Expected payload to be an Object.");
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

// the `rds.agg` helpers, which double as the aggregate condition keys of a `having` clause
const AGGREGATE_FUNCTIONS = {
  max: ['MAX', false],
  maxDistinct: ['MAX', true],
  min: ['MIN', false],
  minDistinct: ['MIN', true],
  count: ['COUNT', false],
  countDistinct: ['COUNT', true],
  avg: ['AVG', false],
  avgDistinct: ['AVG', true],
  sum: ['SUM', false],
  sumDistinct: ['SUM', true],
};

// opaque to resolver code, like the value AWS returns from `rds.agg`
class Aggregate {
  constructor(sqlFunction, distinct, column) {
    this.sqlFunction = sqlFunction;
    this.distinct = distinct;
    this.column = column;
  }
}

/**
 * Each helper validates its column when it is called, whether or not the aggregate is ever
 * rendered. A nullish column is accepted and renders as an empty argument list, like on AWS.
 */
export const agg = Object.fromEntries(Object.entries(AGGREGATE_FUNCTIONS).map(
  ([name, [sqlFunction, distinct]]) => [name, (...args) => {
    if (args.length !== 1) {
      throw codeError("A single argument is expected to be passed to aggregates.");
    }

    const [column] = args;
    if ((column != null) && (typeof column !== 'string')) {
      // the exception AWS's own implementation leaks for a non-string column, reproduced verbatim
      // with the Java class the value arrives as
      let javaClass = 'java.util.LinkedHashMap';
      if (typeof column === 'boolean') {
        javaClass = 'java.lang.Boolean';
      } else if (typeof column === 'number') {
        if (!Number.isInteger(column)) {
          javaClass = 'java.lang.Double';
        } else if ((column >= -(2 ** 31)) && (column < 2 ** 31)) {
          javaClass = 'java.lang.Integer';
        } else {
          javaClass = 'java.lang.Long';
        }
      } else if (Array.isArray(column)) {
        javaClass = 'java.util.ArrayList';
      }
      throw codeError(`java.lang.ClassCastException: class ${javaClass} cannot be cast to class java.lang.String (${javaClass} and java.lang.String are in module java.base of loader 'bootstrap')`);
    }

    if (column === '*') {
      if (distinct) {
        throw codeError("* is an invalid argument for distinct aggregates.");
      }

      if (sqlFunction !== 'COUNT') {
        throw codeError("* is an invalid argument for all aggregates, except COUNT");
      }
    }

    return new Aggregate(sqlFunction, distinct, column);
  }],
));

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

// The join keys a select accepts, in the order AWS considers them. A select applies a single kind:
// the first one present, whatever order the keys were written in.
const JOIN_KINDS = [
  ['join', 'JOIN'],
  ['joinNatural', 'NATURAL JOIN'],
  ['innerJoinNatural', 'NATURAL INNER JOIN'],
  ['innerJoin', 'INNER JOIN'],
  ['crossJoin', 'CROSS JOIN'],
  ['leftJoin', 'LEFT JOIN'],
  ['leftJoinNatural', 'NATURAL LEFT JOIN'],
  ['leftOuterJoin', 'LEFT OUTER JOIN'],
  ['leftOuterJoinNatural', 'NATURAL LEFT OUTER JOIN'],
  ['rightJoin', 'RIGHT JOIN'],
  ['rightJoinNatural', 'NATURAL RIGHT JOIN'],
  ['rightOuterJoin', 'RIGHT OUTER JOIN'],
  ['rightOuterJoinNatural', 'NATURAL RIGHT OUTER JOIN'],
  ['fullOuterJoin', 'FULL OUTER JOIN'],
  ['fullOuterJoinNatural', 'NATURAL FULL OUTER JOIN'],
];

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
    // the clause (WHERE, ON or HAVING) whose condition object is rendering: AWS accepts aggregate
    // conditions in HAVING only, and binds only strings and type hints in ON
    this.conditionClause = null;
  }

  render(statements) {
    if (statements.length === 0) {
      throw codeError(`An argument is expected to be passed to ${this.functionName}`);
    }

    for (const stmt of statements) {
      if (typeof stmt === "string") {
        // a raw SQL string passes straight through
        this.renderRawTemplateStatement(stmt);
      } else if (isSqlTemplate(stmt)) {
        this.renderTaggedTemplateStatement(stmt.strings, stmt.keys);
      } else if (isStructuredStatement(stmt)) {
        this.renderStructuredStatement(stmt.type, stmt.properties);
      } else {
        this.unsupportedStatement();
      }
    }

    return this.result;
  }

  unsupportedStatement() {
    throw codeError(`Unsupported type is passed as argument to ${this.functionName}`);
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
      throw codeError(TEMPLATE_ARITY_ERROR);
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
      case "SELECT":
        this.result.statements.push(this.renderSelect(properties));
        break;
      case "REMOVE": {
        const { where, returning, } = properties;
        const parts = [`DELETE FROM ${this.resolveTableName(properties)}`];

        parts.push(...this.buildConditionParts('WHERE', where));

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

        parts.push(...this.buildConditionParts('WHERE', where));

        this.result.statements.push(this.joinClauses(parts));
        break;
      }
      default:
        this.unsupportedStatement();
    }
  }

  /**
   * Render a select to its SQL text. A select is also a valid `from` source, so this returns the
   * text rather than pushing it, and a subquery binds its variables before the outer statement's.
   */
  renderSelect(properties) {
    const { columns, where, groupBy, having, orderBy, limit, offset } = properties;
    const parts = ["SELECT"];

    // an absent column list means every column. Anything else is validated, so `columns: []`
    // still leaves a dangling `SELECT`, like AWS
    parts.push(columns == null ? '*' : this.renderColumnList(columns, true));

    parts.push(`FROM ${this.resolveTableName(properties, true)}`);
    parts.push(...this.buildJoinParts(properties));
    parts.push(...this.buildConditionParts('WHERE', where));

    if (groupBy != null) {
      if (!Array.isArray(groupBy)) {
        throw codeError("groupBy expects an array.");
      }

      if (groupBy.length === 0) {
        throw codeError("Column values are expected for GROUP BY.");
      }

      const items = groupBy.map(item => {
        // a 32-bit integer is a column position and renders as is
        if (Number.isInteger(item) && (item >= -(2 ** 31)) && (item < 2 ** 31)) {
          return String(item);
        }

        if (typeof item !== 'string') {
          throw codeError("Invalid type in GROUP BY column array.");
        }

        // unlike in a column list, a star is quoted
        return this.quoteSegments(item);
      });
      parts.push('GROUP BY', items.join(', '));
    }

    // AWS renders HAVING whether or not there is a GROUP BY
    parts.push(...this.buildConditionParts('HAVING', having));

    if (orderBy != null) {
      if (!Array.isArray(orderBy)) {
        throw codeError("orderBy expects an array.");
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

    return this.joinClauses(parts);
  }

  buildJoinParts(properties) {
    const kind = JOIN_KINDS.find(([key]) => properties[key] != null);
    if (kind === undefined) {
      return [];
    }

    // only the applied kind is validated: a malformed later kind is ignored, like on AWS
    const [key, keyword] = kind;
    const joins = properties[key];
    if (!Array.isArray(joins)) {
      throw codeError(`${key} expects an array.`);
    }

    const parts = [];
    for (const join of joins) {
      // AWS skips an item that is not an object rather than rejecting it
      if ((join == null) || (typeof join !== 'object') || Array.isArray(join)) {
        continue;
      }

      // a joined source follows the select's own `table`/`from` rules
      parts.push(keyword, this.resolveTableName(join, true));

      const { on, using } = join;
      if ((on != null) && (using != null)) {
        throw codeError("'on' and 'using' keys cannot be used together");
      }

      // a condition object renders like a WHERE clause, its values bound as variables rather than
      // read as column references
      parts.push(...this.buildConditionParts('ON', on));

      if (using != null) {
        // an empty list still renders, as `USING ()`, like AWS
        parts.push(`USING (${this.renderColumnList(using, true)})`);
      }
    }

    return parts;
  }

  /**
   * A WHERE, ON or HAVING clause, which AWS builds the same way: from a `sql` tagged template or a
   * condition object.
   */
  buildConditionParts(keyword, condition) {
    if (condition == null) {
      return [];
    }

    // the whole clause may be a `sql` tagged template instead of a condition object, sharing the
    // statement's variable numbering
    if (isSqlTemplate(condition)) {
      const rendered = this.renderTemplate(condition.strings, condition.keys);
      return rendered ? [keyword, rendered] : [];
    }

    if ((typeof condition !== 'object') || Array.isArray(condition)) {
      throw codeError(`${keyword} values are expected to be SQL templates or a condition object.`);
    }

    // a condition that renders to nothing - `{}`, `{ and: [] }`, or a column with no condition -
    // drops the keyword along with its body
    this.conditionClause = keyword;
    try {
      const clause = this.buildWhereClause(condition);
      return clause ? [keyword, clause] : [];
    } finally {
      this.conditionClause = null;
    }
  }

  renderOrderByItem(item) {
    if ((item == null) || (typeof item !== 'object') || Array.isArray(item)) {
      throw codeError("orderBy item expected to be an object.");
    }

    const { column, dir } = item;
    if (typeof column !== 'string') {
      throw codeError("orderBy item expected to have property column.");
    }

    // AWS uppercases `dir` and accepts only ASC or DESC. Interpolating it raw would let a caller
    // inject arbitrary SQL through the sort direction. Only a string is checked at all: any other
    // value, null included, means ASC, while an empty string is rejected - matching AWS.
    const direction = typeof dir !== 'string' ? 'ASC' : dir.toUpperCase();
    if ((direction !== 'ASC') && (direction !== 'DESC')) {
      throw codeError(`orderBy dir can have either ASC or DESC found ${dir}.`);
    }

    return `${this.quoteIdentifier(column)} ${direction}`;
  }

  renderReturning(returning) {
    // the column list is validated before the dialect is considered: a malformed `returning` on
    // MySQL is reported as malformed, not as unsupported
    const columns = this.renderColumnList(returning, false);

    // MySQL has no RETURNING clause and AWS refuses the key outright rather than emitting SQL the
    // engine would reject
    if (!this.supportsReturning) {
      throw codeError("returning is not supported in MySQL.");
    }

    return columns;
  }

  /**
   * Validate and quote a list of column names. AWS applies the same rules, and raises the same
   * messages, for a select's `columns` and an insert or delete's `returning`.
   */
  renderColumnList(columns, allowAggregates) {
    // AWS accepts either the bare string `*` or an array of column names
    if (columns === '*') {
      return columns;
    }

    if (!Array.isArray(columns)) {
      throw codeError("Expected column to be * or an array.");
    }

    return columns.map(column => {
      if (typeof column === 'string') {
        return this.quoteIdentifier(column);
      }

      if (column instanceof Aggregate) {
        // `returning` refuses a bare aggregate, though an aliased one gets through
        if (!allowAggregates) {
          throw codeError("Only columns in SELECT statements can include aggregates.");
        }

        return this.renderAggregate(column);
      }

      if ((column == null) || (typeof column !== 'object') || Array.isArray(column)) {
        throw codeError("Invalid type in column array.");
      }

      // a single-entry alias object, read like a table alias: `{ n: "p.name" }` becomes
      // `"p"."name" as "n"`
      const [alias, name] = this.aliasEntry(column, "column");
      const quotedAlias = this.quoteIdentifier(alias);
      if (name instanceof Aggregate) {
        return `${this.renderAggregate(name)} as ${quotedAlias}`;
      }

      if (typeof name !== 'string') {
        throw codeError("Column alias value is expected to be a string or rds.agg.");
      }

      // unlike a bare `*`, an aliased one is quoted
      return `${this.quoteSegments(name)} as ${quotedAlias}`;
    }).join(', ');
  }

  renderAggregate({ sqlFunction, distinct, column }) {
    // a nullish column leaves the argument list empty, as `MAX()` or `COUNT(DISTINCT )`
    const argument = column == null ? '' : this.quoteIdentifier(column);
    return `${sqlFunction}(${distinct ? 'DISTINCT ' : ''}${argument})`;
  }

  resolveValues(properties, verb) {
    const { values } = properties;
    if (values == null) {
      throw codeError(`values are expected to be passed to ${verb}`);
    }

    if ((typeof values !== 'object') || Array.isArray(values)) {
      // AWS's wording, grammar included
      throw codeError("Expected values to an Object.");
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
      throw codeError(`${keyword} expects a number.`);
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
    if (value instanceof Aggregate) {
      throw codeError("Only primitive values are supported as parameter.");
    }

    if ((this.conditionClause === 'ON') && (typeof value !== 'string') && !value.type) {
      throw codeError("ON expects a string value comparisons.");
    }

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
          throw codeError(`${key} expects conditions to be an array`);
        }
        const parts = where[key].map(part => {
          // only a condition object is accepted here - unlike a top-level `where`, a nested `sql`
          // template is refused
          if ((part == null) || (typeof part !== 'object') || Array.isArray(part) || isSqlTemplate(part)) {
            throw codeError(`Expected ${key} to be an Object.`);
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
      throw codeError("Expected condition to be an Object.");
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

    if (Object.hasOwn(AGGREGATE_FUNCTIONS, conditionType)) {
      // nullness is checked first, then the clause, then the condition's shape
      this.requireNonNull(rawValue, path);
      if (this.conditionClause !== 'HAVING') {
        throw codeError(`Aggregates are not valid for ${this.conditionClause} conditions.`);
      }

      if ((typeof rawValue !== 'object') || Array.isArray(rawValue)) {
        throw codeError(`Expected ${path} to be an Object.`);
      }

      // built through `rds.agg` so a star gets the same validation, e.g. `{ "*": { count: ... } }`
      // is `COUNT(*)` while `{ "*": { max: ... } }` is rejected
      const target = this.renderAggregate(agg[conditionType](columnName));
      return Object.keys(rawValue).map(operator => {
        // unlike `size`, an aggregate condition takes no `between`
        const comparison = COMPARISON_OPERATORS[operator];
        if (!comparison) {
          throw codeError(`${path} has invalid aggregate operator.`);
        }

        // a nullish value is inlined, as in a `size` condition
        return `${target} ${comparison} ${this.renderValue(rawValue[operator])}`;
      }).join(" AND ");
    }

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
          throw codeError(`Unsupported condition ${path}.`);
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
      throw codeError(`${path} condition expects an array with length of 2.`);
    }

    if (rawValue.length !== 2) {
      throw codeError(`${path} condition expects an array with 2 values but received an array with length ${rawValue.length}.`);
    }

    // mapping in order keeps the bound variables numbered low-then-high
    const [low, high] = rawValue.map(bound => this.renderValue(bound));
    return `${target} BETWEEN ${low} AND ${high}`;
  }

  buildSizeCondition(column, rawValue, path) {
    if ((typeof rawValue !== 'object') || (rawValue === null) || Array.isArray(rawValue)) {
      throw codeError(`Expected ${path} to be an Object.`);
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
        throw codeError(`${path} has invalid size operator.`);
      }

      // unlike a direct comparison, a nullish value here is inlined rather than rejected
      return `${target} ${comparison} ${this.renderValue(rawValue[operator])}`;
    });

    return statements.join(" AND ");
  }

  requireNonNull(value, path) {
    if (value == null) {
      throw codeError(`Value for ${path} can't be null.`);
    }

    return value;
  }

  requireString(value, path) {
    // AWS rejects a non-string for the wildcard conditions instead of coercing it
    if (typeof this.requireNonNull(value, path) !== 'string') {
      throw codeError(`${path} expects a string value to be passed.`);
    }

    return value;
  }

  requireBoolean(value, path) {
    if (typeof this.requireNonNull(value, path) !== 'boolean') {
      throw codeError(`${path} expects a boolean value to be passed.`);
    }

    return value;
  }

  resolveTableName(properties, allowFrom = false) {
    const { table, from } = properties;

    // `from` is an alias for `table`, but only in select(): insert/update/remove ignore the key
    // entirely, and only select() rejects the two being passed together
    if (allowFrom && (table != null) && (from != null)) {
      throw codeError("'from' and 'table' keys cannot be used together");
    }

    if (allowFrom && (table == null) && (from != null)) {
      // `from` carries its own type message, and rejects the array `table` would too. A statement
      // is only accepted as the value of an alias, never on its own.
      const isAliasObject = (typeof from === 'object') && !Array.isArray(from)
        && !isSqlTemplate(from) && !isStructuredStatement(from);
      if ((typeof from !== 'string') && !isAliasObject) {
        throw codeError("'from' value is expected to be string or object.");
      }

      return this.renderTableName(from, true);
    }

    if (table == null) {
      throw codeError("'table' or 'from' key is required.");
    }

    return this.renderTableName(table);
  }

  /**
   * A table is named either by a string or by a single-entry alias object, which AWS renders with
   * the *value* as the table name and the *key* as the alias: `{ persons: "p" }` becomes
   * `"p" as "persons"`. Only a select's `from` (and a join's) may alias a subquery instead, given
   * as a select or a `sql` template: `{ s: select(...) }` becomes `(SELECT ...) as "s"`.
   */
  renderTableName(name, allowSubquery = false) {
    if (typeof name === 'string') {
      return this.quoteIdentifier(name);
    }

    if ((typeof name !== 'object') || Array.isArray(name)) {
      throw codeError("table name is expected to be a string or alias.");
    }

    const [alias, actual] = this.aliasEntry(name, "table");
    const quotedAlias = this.quoteIdentifier(alias);
    if (typeof actual === 'string') {
      return `${this.quoteIdentifier(actual)} as ${quotedAlias}`;
    }

    if (!allowSubquery) {
      throw codeError("Table alias value is expected to be a string.");
    }

    if (isSqlTemplate(actual)) {
      return `(${this.renderTemplate(actual.strings, actual.keys)}) as ${quotedAlias}`;
    }

    if (isStructuredStatement(actual) && (actual.type === "SELECT")) {
      return `(${this.renderSelect(actual.properties)}) as ${quotedAlias}`;
    }

    throw codeError("Object value must be a SQL statement or string.");
  }

  /**
   * The single `[alias, value]` entry of a table or column alias object.
   */
  aliasEntry(aliasObject, kind) {
    const entries = Object.entries(aliasObject);
    if (entries.length > 1) {
      throw codeError(`${kind} alias is allowed only one key-value pair.`);
    }

    if (entries.length === 0) {
      // an exception AWS's own implementation leaks for an empty alias object, reproduced verbatim
      // so error handling behaves the same here as it does against AWS
      throw codeError("java.util.NoSuchElementException");
    }

    return entries[0];
  }

  quoteIdentifier(rawName) {
    // A bare `*` stays unquoted (`SELECT *`), matching AWS AppSync. Note that AWS quotes the
    // star in a qualified identifier (`persons.*` becomes `"persons"."*"`), so only the exact
    // string `*` is special-cased.
    if (rawName === '*') {
      return rawName;
    }

    return this.quoteSegments(rawName);
  }

  quoteSegments(rawName) {
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
