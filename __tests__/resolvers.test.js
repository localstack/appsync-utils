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

    test.skip("createPgStatement-typeHint", async () => {
        const code = `
      export function request(ctx) {
        const now = util.time.nowFormatted('YYYY-MM-dd HH:mm:ss');
        const whereClause = { and:[
          { id: { eq: rds.typeHint.UUID(ctx.args.id) } },
          { started: { lt: rds.typeHint.TIMESTAMP(now) } } 
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

            }
        };

        await checkResolverValid(code, requestContext, "request");

    });

    test.skip("createPgStatement-select", async () => {
        const code = `
    export function request(ctx) {
        const whereClause = { or: [
          { name: { eq: 'Stephane'} },
          { id: { gt: 10 } }
      ]}
        return rds.createPgStatement(rds.select({
            table: "UserGroup",
            where: whereClause,
            columns: ['id', 'name'],
            orderBy: [{column: 'name'}, {column: 'id', dir: 'DESC'}]
        }));
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

    test.skip("createPgStatement-remove", async () => {
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

