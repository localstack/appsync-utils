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
  if (strings.length !== (keys.length + 1)) {
    throw new Exception(`unhandled format for sql tagged template: ${{ strings, keys }}`);
  }

  return { strings, keys };
}


export function select(s) {
  return { type: "SELECT", properties: s };
}

export function insert(s) {
  return { type: "INSERT", properties: s };
}

export function update(s) {
  return { type: "UPDATE", properties: s };
}

export function remove(s) {
  return { type: "REMOVE", properties: s };
}

class StatementBuilder {
  constructor({ quoteChar, supportsReturning = true }) {
    this.quoteChar = quoteChar;
    this.supportsReturning = supportsReturning;
    this.result = {
      statements: [],
      variableMap: {},
      variableTypeHintMap: {},
    };

    this.variableIndex = 0;
  }

  render(statements) {
    for (const stmt of statements) {
      // handle raw sql strings
      if (stmt.strings !== undefined) {
        const { strings, keys } = stmt;
        this.renderTaggedTemplateStatement(strings, keys);
      } else {
        const { type, properties } = stmt;
        if ((type === undefined) && (properties === undefined)) {
          // we have a raw string
          this.renderRawTemplateStatement(stmt);
        } else {
          this.renderStructuredStatement(type, properties);
        }
      }
    }

    return this.result;
  }

  renderRawTemplateStatement(query) {
    this.result.statements.push(query);
  }

  renderTaggedTemplateStatement(strings, keys) {
    let stmt = strings[0];

    if (strings.length !== (keys.length + 1)) {
      throw new Error(`Invalid raw string statement: ${{ strings, keys }}`);
    }

    for (let i = 0; i < keys.length; i++) {
      const nextString = strings[i + 1];
      const nextKey = keys[i];

      const newVar = this.newVariable(nextKey);
      stmt = `${stmt}${newVar}${nextString}`;
    }

    this.result.statements.push(stmt);
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
        const { table, columns, where, orderBy, limit, offset } = properties;
        const parts = ["SELECT"];

        if (columns) {
          parts.push(columns.map(name => this.quoteIdentifier(name)).join(', '));
        } else {
          parts.push('*');
        }

        parts.push(`FROM ${this.getTableName(table)}`);
        parts.push(...this.buildWhereParts(where));

        // an empty sort list drops the whole clause, ORDER BY keyword included, like AWS
        if (orderBy && orderBy.length > 0) {
          parts.push('ORDER BY', orderBy.map(item => this.renderOrderByItem(item)).join(', '));
        }

        // limit/offset are optional and may be passed as null; 0 is a valid value
        if (limit != null) {
          parts.push(`LIMIT ${this.newVariable(limit)}`);
        }

        if (offset != null) {
          parts.push(`OFFSET ${this.newVariable(offset)}`);
        }

        this.result.statements.push(this.joinClauses(parts));
        break;
      }
      case "REMOVE": {
        const { table, where, returning, } = properties;
        const parts = [`DELETE FROM ${this.getTableName(table)}`];

        parts.push(...this.buildWhereParts(where));

        if (returning) {
          parts.push('RETURNING', this.renderReturning(returning));
        }

        this.result.statements.push(this.joinClauses(parts));
        break;
      }
      case "INSERT": {
        const { table, values, returning } = properties;
        const parts = [`INSERT INTO ${this.getTableName(table)}`];

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
        const { table, values, where } = properties;
        const parts = [`UPDATE ${this.getTableName(table)}`, 'SET'];

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
        throw new Error(`TODO: "${type}" query unsupported`);
    }
  }

  buildWhereParts(where) {
    if (!where) {
      return [];
    }

    // a `where` that renders to nothing - `{}`, `{ and: [] }`, or a column with no condition -
    // drops the WHERE keyword along with its body
    const clause = this.buildWhereClause(where);
    return clause ? ['WHERE', clause] : [];
  }

  renderOrderByItem({ column, dir }) {
    // AWS uppercases `dir` and accepts only ASC or DESC. Interpolating it raw would let a caller
    // inject arbitrary SQL through the sort direction. An absent or null `dir` means ASC, but an
    // empty string is rejected, matching AWS.
    const direction = dir == null ? 'ASC' : String(dir).toUpperCase();
    if ((direction !== 'ASC') && (direction !== 'DESC')) {
      throw new Error(`orderBy dir can have either ASC or DESC found ${dir}.`);
    }

    return `${this.quoteIdentifier(column)} ${direction}`;
  }

  renderReturning(returning) {
    // MySQL has no RETURNING clause and AWS refuses the key outright rather than emitting SQL the
    // engine would reject
    if (!this.supportsReturning) {
      throw new Error("returning is not supported in MySQL.");
    }

    // AWS accepts either the bare string `*` or an array of column names
    if (returning === '*') {
      return returning;
    }

    if (!Array.isArray(returning)) {
      throw new Error('Expected column to be * or an array.');
    }

    return returning.map(name => this.quoteIdentifier(name)).join(', ');
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
          // TODO properly handle errors to return a more useful message
          throw new Error(`'${key}' expects conditions to be an array`);
        }
        const parts = where[key].map(
          part => this.buildWhereClause(part, "(", ")", ops)
        );
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

    const conditionTypes = Object.keys(condition);
    // a column carrying no condition contributes nothing, e.g. an optional filter that the
    // resolver left empty
    if (conditionTypes.length === 0) {
      return "";
    }

    // several conditions on the same column are ANDed together
    const statements = conditionTypes.map(
      conditionType => this.buildCondition(columnName, condition[conditionType], conditionType)
    );

    return `${startGrouping}${statements.join(" AND ")}${endGrouping}`;
  }

  buildCondition(columnName, rawValue, conditionType) {
    let value;
    if (conditionType === "attributeExists") {
      value = rawValue;
    } else if (conditionType === "contains") {
      // AWS binds the value wrapped in wildcards, so `contains` is a real substring match rather
      // than an equality test. `notContains` is deliberately left unwrapped - AWS does not wrap it
      // either.
      value = this.newVariable(`%${rawValue}%`);
    } else {
      value = this.newVariable(rawValue);
    }
    switch (conditionType) {
      case "eq":
        return `${this.quoteIdentifier(columnName)} = ${value}`;
      case "ne":
        return `${this.quoteIdentifier(columnName)} != ${value}`;
      case "gt":
        return `${this.quoteIdentifier(columnName)} > ${value}`;
      case "lt":
        return `${this.quoteIdentifier(columnName)} < ${value}`;
      case "ge":
        return `${this.quoteIdentifier(columnName)} >= ${value}`;
      case "le":
        return `${this.quoteIdentifier(columnName)} <= ${value}`;
      case "contains":
        return `${this.quoteIdentifier(columnName)} LIKE ${value}`;
      case "notContains":
        return `${this.quoteIdentifier(columnName)} NOT LIKE ${value}`;
      case "attributeExists":
        return `${this.quoteIdentifier(columnName)} IS ${value? "NOT " : ""}NULL`;
      default:
        throw new Error(`Unhandled condition type ${conditionType}`);
    }
  }

  getTableName(rawName) {
    return this.quoteIdentifier(rawName);
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
  });
  return builder.render(statements);
}

export function createMySQLStatement(...statements) {
  let builder = new StatementBuilder({
    quoteChar: '`',
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
