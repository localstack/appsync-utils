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
