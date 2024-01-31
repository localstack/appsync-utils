export function toJsonObject(inputStr) {
  const input = JSON.parse(inputStr);
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



export function select(s) {
  return { type: "SELECT", properties: s };
}

export function remove(s) {
  return { type: "REMOVE", properties: s };
}

class PgStatementBuilder {
  constructor() {
    this.result = {
      statements: [],
      variableMap: {},
      variableTypeHintMap: {},
    };

    this.variableIndex = 0;
  }

  render(statements) {
    for (const { type, properties } of statements) {
      switch (type) {
        case "SELECT": {
          const { table, columns, where, orderBy, limit, offset } = properties;
          const tableName = `"${table}"`;
          let query;

          if (columns) {
            const columnNames = columns.map(name => `"${name}"`).join(', ');
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
              orderByParts.push(`"${column}" ${dir}`);
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
          const tableName = `"${table}"`;

          let query = `DELETE FROM ${tableName}`;

          if (where) {
            const parts = this.buildWhereClause(where);
            query = `${query} WHERE ${parts}`;
          }

          if (returning) {
            const columnNames = returning.map(name => `"${name}"`).join(', ');
            query = `${query} RETURNING ${columnNames}`;
          }

          this.result.statements.push(query);
          break;
        }
        default:
          throw new Error(`TODO: "${type}" query unsupported`);
      }
    }

    return this.result;
  }

  newVariable(value) {
    const name = `:P${this.variableIndex}`;
    if (value.type) {
      this.result.variableMap[name] = value.value;
      this.result.variableTypeHintMap[name] = value.type;
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
        return `${startGrouping}"${columnName}" = ${value}${endGrouping}`;
      case "ne":
        return `${startGrouping}"${columnName}" != ${value}${endGrouping}`;
      case "gt":
        return `${startGrouping}"${columnName}" > ${value}${endGrouping}`;
      case "lt":
        return `${startGrouping}"${columnName}" < ${value}${endGrouping}`;
      case "ge":
        return `${startGrouping}"${columnName}" >= ${value}${endGrouping}`;
      case "le":
        return `${startGrouping}"${columnName}" <= ${value}${endGrouping}`;
      case "contains":
        return `${startGrouping}"${columnName}" LIKE ${value}${endGrouping}`;
      case "notContains":
        return `${startGrouping}"${columnName}" NOT LIKE ${value}${endGrouping}`;
      default:
        throw new Error(`Unhandled condition type ${conditionType}`);
    }
  }
}

export function createPgStatement(...statements) {
  let builder = new PgStatementBuilder();
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
