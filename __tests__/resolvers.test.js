/* test full resolver pipelines 
Note: for the request-context the naming must be `arguments` when passing it. 
Within the request it can be resolved to both, e.g. `ctx.arguments` and `ctx.args`
*/

import { checkResolverValid } from "./helpers";
import { util } from "..";

describe("dynamodb resolvers", () => {
  test("something", async () => {
    const code = `
    export function request(ctx) {
        return {
            operation: "Query",
            index: "nameIndex",
            select : "ALL_ATTRIBUTES",
            query: {
                "expression" : "#name = :name",
                "expressionNames": {
                    "#name": "name",
                },
                "expressionValues" : {
                    ":name" : util.dynamodb.toDynamoDB(ctx.arguments.filter.line),
                }
            },
            filter: {
                "expression" : "#shift = :shift",
                "expressionNames": {
                    "#shift": "shift",
                },
                "expressionValues" : {
                    ":shift" : util.dynamodb.toDynamoDB(ctx.arguments.filter.shift),
                }
            },
        };
    }

    export function response(ctx) {
        return ctx.result.items;
    }
    `;

    const requestContext = {
      arguments: {
        filter: {
          line: "test",
          shift: 10,
        },
      },
    };

    await checkResolverValid(code, requestContext, "request");

    const responseContext = {
      result: {
        items: [
          { a: 10 },
        ],
      },
    };

    await checkResolverValid(code, responseContext, "response");
  });
});

describe("rds resolvers", () => {
  describe("typehints", () => {
    test("UUID", async () => {
      const code = `
            export function request(ctx) {
                return rds.typeHint.UUID(ctx.args.id);
            }

            export function response(ctx) {
            }
            `;

      const context = {
        arguments: {
          id: "abc123",
        },
      };

      await checkResolverValid(code, context, "request");
    });

    test("TIMESTAMP", async () => {
      const code = `
            export function request(ctx) {
                return rds.typeHint.TIMESTAMP(ctx.args.id);
            }

            export function response(ctx) {
            }
            `;

      const context = {
        arguments: {
          id: new Date(2023, 1, 1),
        },
      };

      await checkResolverValid(code, context, "request");
    });
  });

  // https://docs.aws.amazon.com/appsync/latest/devguide/resolver-reference-rds-js.html
  test("toJsonObject", async () => {
    const responseContext = {
      "result": JSON.stringify({
        "sqlStatementResults": [
          {
            "numberOfRecordsUpdated": 0,
            "records": [
              [
                {
                  "stringValue": "Mark Twain"
                },
                {
                  "stringValue": "Adventures of Huckleberry Finn"
                },
                {
                  "stringValue": "978-1948132817"
                }
              ],
              [
                {
                  "stringValue": "Jack London"
                },
                {
                  "stringValue": "The Call of the Wild"
                },
                {
                  "stringValue": "978-1948132275"
                }
              ]
            ],
            "columnMetadata": [
              {
                "isSigned": false,
                "isCurrency": false,
                "label": "author",
                "precision": 200,
                "typeName": "VARCHAR",
                "scale": 0,
                "isAutoIncrement": false,
                "isCaseSensitive": false,
                "schemaName": "",
                "tableName": "Books",
                "type": 12,
                "nullable": 0,
                "arrayBaseColumnType": 0,
                "name": "author"
              },
              {
                "isSigned": false,
                "isCurrency": false,
                "label": "title",
                "precision": 200,
                "typeName": "VARCHAR",
                "scale": 0,
                "isAutoIncrement": false,
                "isCaseSensitive": false,
                "schemaName": "",
                "tableName": "Books",
                "type": 12,
                "nullable": 0,
                "arrayBaseColumnType": 0,
                "name": "title"
              },
              {
                "isSigned": false,
                "isCurrency": false,
                "label": "ISBN-13",
                "precision": 15,
                "typeName": "VARCHAR",
                "scale": 0,
                "isAutoIncrement": false,
                "isCaseSensitive": false,
                "schemaName": "",
                "tableName": "Books",
                "type": 12,
                "nullable": 0,
                "arrayBaseColumnType": 0,
                "name": "ISBN-13"
              }
            ]
          }
        ]
      }),
    };

    const code = `
        export function request(ctx) {}

        export function response(ctx) {
            return rds.toJsonObject(ctx.result);
        }
        `;

    await checkResolverValid(code, responseContext, "response");
  });

  describe("mysql", () => {
    test("type hints", async () => {
      const code = `
      export function request(ctx) {
        const whereClause = { and:[
          { id: { eq: rds.typeHint.UUID(ctx.args.id) } },
          { started: { lt: rds.typeHint.TIMESTAMP(ctx.args.started) } } 
        ] }; 
        return rds.createMySQLStatement(rds.select({
          table: "UserGroup",
          where: whereClause,
          }));
      }

      export function response(ctx) {}
      `
      const requestContext = {
        arguments: {
          id: "1232",
          name: "hello",
          started: new Date(2022, 2, 2),
        }
      };

      await checkResolverValid(code, requestContext, "request");

    });

    test("select", async () => {
      const code = `
    export function request(ctx) {
        const whereClause = { or: [
          { name: { eq: 'Stephane'} },
          { id: { gt: 10 } }
      ]}
        return rds.createMySQLStatement(rds.select({
            table: "UserGroup",
            where: whereClause,
            limit: 10,
            offset: 1,
            columns: ['id', 'name'],
            orderBy: [{column: 'name'}, {column: 'id', dir: 'DESC'}]
        }));
    }

    export function response(ctx) {}
    `;

      const requestContext = {};

      await checkResolverValid(code, requestContext, "request");

    });

    test("update", async () => {
      const code = `
        export function request(ctx) {
            const { input: { id, ...values }, condition } = ctx.args;
            const where = {
                ...condition,
                id: { eq: id },
            };
            const updateStatement = rds.update({
                table: 'persons',
                values,
                where,
            });

            return rds.createMySQLStatement(updateStatement)
        }
        export function response(ctx) {}
    `;
      const requestContext = {
        arguments: {
          input: {
            id: "abc123",
            name: "name",
            birthday: "today",
            country: "home",
          },
        },
      };

      await checkResolverValid(code, requestContext, "request");
    });

    test("insert", async () => {
      const code = `
        export function request(ctx) {
        const { input: values } = ctx.args;
        const insertStatement = rds.insert({ table: 'persons', values });
        
        return rds.createMySQLStatement(insertStatement)
        }

        export function response(ctx) {}
        `;

      const requestContext = {
        arguments: {
          input: {
            name: "test",
          },
        }
      };

      await checkResolverValid(code, requestContext, "request");
    });

    test("remove", async () => {
      const code = `
      export function request(ctx) {
          const id = ctx.args.id;
          const where = { id: { eq: id } };
          const deleteStatement = rds.remove({
              table: 'persons',
              where: where,
          });
      
          return rds.createMySQLStatement(deleteStatement);
        }
      export function response(ctx) {}
  `;

      const requestContext = {
        arguments: {
          id: "1232"
        }
      };

      await checkResolverValid(code, requestContext, "request");

    });
  });

  describe("postgresql", () => {
    test("type hints", async () => {
      const code = `
      export function request(ctx) {
        const whereClause = { and:[
          { id: { eq: rds.typeHint.UUID(ctx.args.id) } },
          { started: { lt: rds.typeHint.TIMESTAMP(ctx.args.started) } } 
        ] }; 
        return rds.createPgStatement(rds.select({
          table: "UserGroup",
          where: whereClause,
          }));
      }

      export function response(ctx) {}
      `
      const requestContext = {
        arguments: {
          id: "1232",
          name: "hello",
          started: new Date(2022, 2, 2),
        }
      };

      await checkResolverValid(code, requestContext, "request");

    });

    test("select", async () => {
      const code = `
    export function request(ctx) {
        const whereClause = { or: [
          { name: { eq: 'Stephane'} },
          { id: { gt: 10 } }
      ]}
        return rds.createPgStatement(rds.select({
            table: "UserGroup",
            where: whereClause,
            limit: 10,
            offset: 1,
            columns: ['id', 'name'],
            orderBy: [{column: 'name'}, {column: 'id', dir: 'DESC'}]
        }));
    }

    export function response(ctx) {}
    `;

      const requestContext = {};

      await checkResolverValid(code, requestContext, "request");

    });

    test("update", async () => {
      const code = `
        export function request(ctx) {
            const { input: { id, ...values }, condition } = ctx.args;
            const where = {
                ...condition,
                id: { eq: id },
            };
            const updateStatement = rds.update({
                table: 'persons',
                values,
                where,
            });

            return rds.createPgStatement(updateStatement)
        }
        export function response(ctx) {}
    `;
      const requestContext = {
        arguments: {
          input: {
            id: "abc123",
            name: "name",
            birthday: "today",
            country: "home",
          },
        },
      };

      await checkResolverValid(code, requestContext, "request");
    });


    test("insert", async () => {
      const code = `
        export function request(ctx) {
        const { input: values } = ctx.args;
        const insertStatement = rds.insert({ table: 'persons', values, returning: "*" });
        
        return rds.createPgStatement(insertStatement)
        }

        export function response(ctx) {}
        `;

      const requestContext = {
        arguments: {
          input: {
            name: "test",
          },
        }
      };

      await checkResolverValid(code, requestContext, "request");
    });

    test("remove", async () => {
      const code = `
      export function request(ctx) {
          const id = ctx.args.id;
          const where = { id: { eq: id } };
          const deleteStatement = rds.remove({
              table: 'persons',
              where: where,
              returning: ['id', 'name'],
          });
      
          return rds.createPgStatement(deleteStatement);
        }
      export function response(ctx) {}
  `;

      const requestContext = {
        arguments: {
          id: "1232"
        }
      };

      await checkResolverValid(code, requestContext, "request");

    });
  });
});

