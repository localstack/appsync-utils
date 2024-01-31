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

export function createPgStatement(...statements) {
    let result = {
        statements: [],
        variableMap: {},
        variableTypeHintMap: {},
    };


    let variableIndex = 0;
    const newVariable = (value) => {
        const name = `:P${variableIndex}`;
        result.variableMap[name] = value;
        variableIndex++;
        return name;
    }

    for (const { type, properties } of statements) {
        switch (type) {
            case "SELECT":
                const { table, columns, where, orderBy, limit, offset } = properties;
                const columnNames = columns.map(name => `"${name}"`).join(', ');
                const tableName = `"${table}"`;

                let query = `SELECT ${columnNames} FROM ${tableName}`;

                if (where) {
                    if (where.or) {
                        const parts = [];
                        for (const part of where.or) {
                            const columnName = Object.keys(part)[0];
                            const condition = part[columnName];

                            const conditionType = Object.keys(condition)[0];
                            const value = newVariable(condition[conditionType]);
                            switch (conditionType) {
                                case "eq":
                                    parts.push(`("${columnName}" = ${value})`);
                                    break;
                                case "gt":
                                    parts.push(`("${columnName}" > ${value})`);
                                    break;
                                default:
                                    throw new Error(`Unhandled condition type ${conditionType}`);
                            }
                        }
                        query = `${query} WHERE ${parts.join(" OR ")}`;
                    } else if (where.and) {
                    } else {
                        throw new Error(`Unknown where clause type: ${where}`);
                    }
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
                    const limitValue = newVariable(limit);
                    query = `${query} LIMIT ${limitValue}`;
                }

                if (offset) {
                    const offsetValue = newVariable(offset);
                    query = `${query} OFFSET ${offsetValue}`;
                }

                result.statements.push(query);
                break;
            default:
                throw new Error(`TODO: "${type}" query unsupported`);
        }
    }

    return result;
}

export const typeHint = {
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
