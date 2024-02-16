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

    for (const record of records) {
      const row = {};
      if (record.length !== columnMetadata.length) {
        // TODO: what to do here?!
        throw new Error("TODO");
      }

      for (const colNo in record) {

        // TODO: what if the column is not a string?
        const { stringValue } = record[colNo];
        const { label } = columnMetadata[colNo];

        row[label] = stringValue;
      }

      statement.push(row);
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
  constructor({ quoteChar }) {
    this.quoteChar = quoteChar;
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
        this.renderRawStringStatement(strings, keys);
      } else {
        const { type, properties } = stmt;
        this.renderStructuredStatement(type, properties);
      }
    }

    return this.result;
  }

  renderRawStringStatement(strings, keys) {
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

  renderStructuredStatement(type, properties) {
    switch (type) {
      case "SELECT": {
        const { table, columns, where, orderBy, limit, offset } = properties;
        const tableName = this.getTableName(table);
        let query;

        if (columns) {
          const columnNames = columns.map(name => `${this.quoteChar}${name}${this.quoteChar}`).join(', ');
          query = `SELECT ${columnNames} FROM ${tableName}`;
        } else {
          query = `SELECT * FROM ${tableName}`;
        }

        if (where) {
          const parts = this.buildWhereClause(where);
          query = `${query} WHERE ${parts}`;
        }


        if (orderBy) {
          let orderByParts = [];
          for (let { column, dir } of orderBy) {
            dir = dir || "ASC";
            orderByParts.push(`${this.quoteChar}${column}${this.quoteChar} ${dir}`);
          }

          query = `${query} ORDER BY ${orderByParts.join(', ')}`;

        };

        if (limit) {
          const limitValue = this.newVariable(limit);
          query = `${query} LIMIT ${limitValue}`;
        }

        if (offset) {
          const offsetValue = this.newVariable(offset);
          query = `${query} OFFSET ${offsetValue}`;
        }

        this.result.statements.push(query);
        break;
      }
      case "REMOVE": {
        const { table, where, returning, } = properties;
        const tableName = this.getTableName(table);

        let query = `DELETE FROM ${tableName}`;

        if (where) {
          const parts = this.buildWhereClause(where);
          query = `${query} WHERE ${parts}`;
        }

        if (returning) {
          const columnNames = returning.map(name => `${this.quoteChar}${name}${this.quoteChar}`).join(', ');
          query = `${query} RETURNING ${columnNames}`;
        }

        this.result.statements.push(query);
        break;
      }
      case "INSERT": {
        const { table, values, returning } = properties;
        const tableName = this.getTableName(table);

        let query = `INSERT INTO ${tableName}`;

        let columnTextItems = [];
        let valuesTextItems = [];
        for (const [columnName, value] of Object.entries(values)) {
          columnTextItems.push(`${this.quoteChar}${columnName}${this.quoteChar}`);
          const placeholder = this.newVariable(value);
          valuesTextItems.push(placeholder);
        }
        query = `${query} (${columnTextItems.join(', ')}) VALUES (${valuesTextItems.join(', ')})`;

        if (returning) {
          query = `${query} RETURNING ${returning}`;
        }

        this.result.statements.push(query);
        break;
      }
      case "UPDATE": {
        const { table, values, where } = properties;
        const tableName = this.getTableName(table);

        let query = `UPDATE ${tableName} SET`;

        let columnDefinitionItems = [];
        for (const [columnName, value] of Object.entries(values)) {
          const placeholder = this.newVariable(value);
          columnDefinitionItems.push(`${this.quoteChar}${columnName}${this.quoteChar} = ${placeholder}`);

        }
        query = `${query} ${columnDefinitionItems.join(', ')}`;

        if (where) {
          const parts = this.buildWhereClause(where);
          query = `${query} WHERE ${parts}`;
        }

        this.result.statements.push(query);

        break;
      }
      default:
        throw new Error(`TODO: "${type}" query unsupported`);
    }
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

  buildWhereClause(where) {
    let blocks = [];
    if (where.or) {
      const parts = [];
      for (const part of where.or) {
        parts.push(this.buildWhereStatement(part));
      }
      blocks.push(parts.join(" OR "));
    } else if (where.and) {
      const parts = [];
      for (const part of where.and) {
        parts.push(this.buildWhereStatement(part));
      }
      blocks.push(parts.join(" AND "));
    } else {
      // implicit single clause
      blocks.push(this.buildWhereStatement(where, "", ""));
    }

    return blocks;
  }

  buildWhereStatement(defn, startGrouping = "(", endGrouping = ")") {
    const columnName = Object.keys(defn)[0];
    const condition = defn[columnName];

    const conditionType = Object.keys(condition)[0];
    const value = this.newVariable(condition[conditionType]);
    switch (conditionType) {
      case "eq":
        return `${startGrouping}${this.quoteChar}${columnName}${this.quoteChar} = ${value}${endGrouping}`;
      case "ne":
        return `${startGrouping}${this.quoteChar}${columnName}${this.quoteChar} != ${value}${endGrouping}`;
      case "gt":
        return `${startGrouping}${this.quoteChar}${columnName}${this.quoteChar} > ${value}${endGrouping}`;
      case "lt":
        return `${startGrouping}${this.quoteChar}${columnName}${this.quoteChar} < ${value}${endGrouping}`;
      case "ge":
        return `${startGrouping}${this.quoteChar}${columnName}${this.quoteChar} >= ${value}${endGrouping}`;
      case "le":
        return `${startGrouping}${this.quoteChar}${columnName}${this.quoteChar} <= ${value}${endGrouping}`;
      case "contains":
        return `${startGrouping}${this.quoteChar}${columnName}${this.quoteChar} LIKE ${value}${endGrouping}`;
      case "notContains":
        return `${startGrouping}${this.quoteChar}${columnName}${this.quoteChar} NOT LIKE ${value}${endGrouping}`;
      default:
        throw new Error(`Unhandled condition type ${conditionType}`);
    }
  }

  getTableName(rawName) {
    return `${this.quoteChar}${rawName}${this.quoteChar}`;
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
  });
  return builder.render(statements);
}


export const typeHint = {
  DECIMAL: function(value) {
    return {
      type: "DECIMAL",
      value,
    };
  },
  JSON: function(value) {
    return {
      type: "JSON",
      value,
    };
  },
  TIME: function(value) {
    return {
      type: "TIME",
      value,
    };
  },
  DATE: function(value) {
    return {
      type: "DATE",
      value,
    };
  },
  UUID: function(value) {
    return {
      type: "UUID",
      value,
    };
  },
  TIMESTAMP: function(value) {
    return {
      type: "TIMESTAMP",
      value: value.toISOString(),
    };
  }
};
