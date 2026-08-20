/* test full resolver pipelines 
Note: for the request-context the naming must be `arguments` when passing it. 
Within the request it can be resolved to both, e.g. `ctx.arguments` and `ctx.args`
*/

import { checkResolverValid } from "./helpers";
import { util } from "..";
import * as rds from "../rds";
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

async function importCodeFromFile(stub) {
  const root = path.dirname(fileURLToPath(import.meta.url));
  const fullPath = path.join(path.resolve(root), stub);
  return await fs.readFile(fullPath, { encoding: "utf8" });
}

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
  describe("toJsonObject import paths", () => {
    const context = {
      result: JSON.stringify({
        sqlStatementResults: [
          {
            numberOfRecordsUpdated: 0,
            records: [
              [
                {
                  stringValue: "Mark Twain",
                },
                {
                  stringValue: "Adventures of Huckleberry Finn",
                },
                {
                  stringValue: "978-1948132817",
                },
              ],
              [
                {
                  stringValue: "Jack London",
                },
                {
                  stringValue: "The Call of the Wild",
                },
                {
                  stringValue: "978-1948132275",
                },
              ],
            ],
            columnMetadata: [
              {
                isSigned: false,
                isCurrency: false,
                label: "author",
                precision: 200,
                typeName: "VARCHAR",
                scale: 0,
                isAutoIncrement: false,
                isCaseSensitive: false,
                schemaName: "",
                tableName: "Books",
                type: 12,
                nullable: 0,
                arrayBaseColumnType: 0,
                name: "author",
              },
              {
                isSigned: false,
                isCurrency: false,
                label: "title",
                precision: 200,
                typeName: "VARCHAR",
                scale: 0,
                isAutoIncrement: false,
                isCaseSensitive: false,
                schemaName: "",
                tableName: "Books",
                type: 12,
                nullable: 0,
                arrayBaseColumnType: 0,
                name: "title",
              },
              {
                isSigned: false,
                isCurrency: false,
                label: "ISBN-13",
                precision: 15,
                typeName: "VARCHAR",
                scale: 0,
                isAutoIncrement: false,
                isCaseSensitive: false,
                schemaName: "",
                tableName: "Books",
                type: 12,
                nullable: 0,
                arrayBaseColumnType: 0,
                name: "ISBN-13",
              },
            ],
          },
        ],
      }),
    };

    test("default", async () => {
      let importStatement;
      if (process.env.TEST_TARGET === "AWS_CLOUD") {
        importStatement =
          "import { toJsonObject } from '@aws-appsync/utils/rds';";
      } else {
        importStatement = "import { toJsonObject } from '../rds';";
      }
      const code =
        importStatement +
        "\n" +
        `
      export function request(ctx) {
          return toJsonObject(ctx.result);
      }

      export function response(ctx) {
      }
    `;
      await checkResolverValid(code, context, "request");
    });

    test("fully qualified", async () => {
      const code = `
      export function request(ctx) {
          return util.rds.toJsonObject(ctx.result);
      }

      export function response(ctx) {
      }
    `;
      await checkResolverValid(code, context, "request");
    });
  });

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
          id: new Date(Date.UTC(2023, 1, 1)),
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
                  "longValue": 12345
                },
                {
                  "stringValue": "Mark Twain"
                },
                {
                  "stringValue": "Adventures of Huckleberry Finn"
                },
                {
                  "stringValue": "978-1948132817"
                },
                {
                  "isNull": true
                },
                { "arrayValue": { "stringValues": ["a", "b"] } },
                { "booleanValue": true },
                { "blobValue": Buffer.from("hello").toString("base64") }
              ],
              [
                {
                  "longValue": 67890
                },
                {
                  "stringValue": "Jack London"
                },
                {
                  "stringValue": "The Call of the Wild"
                },
                {
                  "stringValue": "978-1948132275"
                },
                {
                  "doubleValue": 12.34,
                },
                { "arrayValue": {
                    "arrayValues": [
                      { "booleanValues": [true, false] },
                      { "doubleValues": [1.234] },
                      { "longValues": [1, 2] },
                      { "stringValues": ["a", "b"] },
                    ],
                  },
                },
                { "booleanValue": false },
                { "blobValue": Buffer.from("world").toString("base64") },
              ]
            ],
            "columnMetadata": [
              {
                "type": 4,
                "typeName": "serial",
                "label": "id",
                "schemaName": "",
                "tableName": "Books",
                "isAutoIncrement": true,
                "isSigned": true,
                "isCurrency": false,
                "isCaseSensitive": false,
                "nullable": 0,
                "precision": 10,
                "scale": 0,
                "arrayBaseColumnType": 0
              },
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
              },
              {
                "name": "optional_double",
              },
              {
                "name": "tags",
              },
              {
                "name": "is_active",
                "label": "IS ACTIVE",
              },
              {
                "name": "blob_value",
              },
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
  test("toJsonObject insert or update", async () => {
    const responseContext = {
      "result": JSON.stringify({
        "sqlStatementResults": [{
          "numberOfRecordsUpdated": 1,
          "generatedFields": []
        }]
      })
    };

    const code = `
        export function request(ctx) {}

        export function response(ctx) {
            return rds.toJsonObject(ctx.result);
        }
        `;

    await checkResolverValid(code, responseContext, "response");
  })

  test("toJsonObject update and select", async () => {
    const responseContext = {
      "result": JSON.stringify({
        "sqlStatementResults": [{
          "numberOfRecordsUpdated": 1,
          "generatedFields": []
        },
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
      })
    };

    const code = `
        export function request(ctx) {}

        export function response(ctx) {
            return rds.toJsonObject(ctx.result);
        }
        `;

    await checkResolverValid(code, responseContext, "response");
  })

  test("where mixed inline and", async () => {
    const code = `
      export function request(ctx) {
          const query = rds.select({
              table: 'supplier',
              where: {
                count: { le: 10 },
                and: [{ id: { eq: 123456 } }],
                deleted: { attributeExists: false }
              }
          });
          return rds.createPgStatement(query);
      }
      export function response(ctx) {}
  `;
    await checkResolverValid(code, {}, "request");
  })

  test("where single value in and", async () => {
    const code = `
      export function request(ctx) {
          const query = rds.select({
              table: 'supplier',
              where: {
                and: [{ id: { eq: 123456 } }],
              }
          });
          return rds.createPgStatement(query);
      }
      export function response(ctx) {}
  `;
    await checkResolverValid(code, {}, "request");
  })

  test("where mixed or/and", async () => {
    const code = `
      export function request(ctx) {
          const query = rds.select({
              table: 'supplier',
              where: {
                and: [{ id: { eq: "and eq" } }],
                or: [{ id: { eq: "or eq 2" } }],
                id: { eq: "id eq" },
              }
          });
          return rds.createPgStatement(query);
      }
      export function response(ctx) {}
  `;
    await checkResolverValid(code, {}, "request");
  })

  test("where mixed or/and multiple or", async () => {
    const code = `
      export function request(ctx) {
          const query = rds.select({
              table: 'supplier',
              where: {
                and: [{ id: { eq: "and eq" } }],
                or: [
                  { id: { eq: "or eq 1" } },
                  { id: { eq: "or eq 2" } }
                ],
                id: { eq: "id eq" },
              }
          });
          return rds.createPgStatement(query);
      }
      export function response(ctx) {}
  `;
    await checkResolverValid(code, {}, "request");
  })

  test("where nested ors with ands", async () => {
    const code = `
      export function request(ctx) {
          const query = rds.select({
              table: 'supplier',
              where: {
                id: { eq: "id eq" },
                or: [
                  { id: { eq: "or 1" } },
                  {
                    or: [
                      { id: { eq: "or nested 1" } },
                      { id: { eq: "or nested 2" } }
                    ]
                  },
                  { id: { eq: "final or" } }
                ]
              }
          });
          return rds.createPgStatement(query);
      }
      export function response(ctx) {}
  `;
    await checkResolverValid(code, {}, "request");
  })

  test("attributeExists true false", async () => {
    const code = `
      export function request(ctx) {
          const query = rds.select({
              table: 'supplier',
              where: {
                created: { attributeExists: true },
                deleted: { attributeExists: false }
              }
          });
          return rds.createPgStatement(query);
      }
      export function response(ctx) {}
  `;
    await checkResolverValid(code, {}, "request");
  })

  test("attributeExists nested or", async () => {
    const code = `
      export function request(ctx) {
          const query = rds.select({
              table: 'supplier',
              where: {
                  id: {
                      eq: "123456"
                  },
                  and: [{
                      or: [
                          { deleted: { eq: false } },
                          { deleted: { attributeExists: false } }
                      ]
                  }
                  ]
              }
          });
          return rds.createPgStatement(query);
      }
      export function response(ctx) {}
  `;
  await checkResolverValid(code, {}, "request");
  })


  describe("mysql", () => {
    test("raw string", async () => {
      const code = `
      export function request(ctx) {
        const { id } = ctx.args;
        const updateQuery = \`UPDATE "document" set "data" = 10 WHERE id = \${id}\`;
        return rds.createMySQLStatement(updateQuery);
      }

      export function response(ctx) {}
    `;

      const context = {
        arguments: {
          id: "adb626eb-4ce5-452a-a917-3943a37f202b",
        },
      };

      await checkResolverValid(code, context, "request");
    });

    test("sql tagged template", async () => {
      const code = `
      export function request(ctx) {
        const { id, text } = ctx.args;
        const s1 = rds.sql\`insert into Post(id, text) values(\${rds.typeHint.UUID(id)}, \${text})\`;
        const s2 = rds.sql\`select * from Post where id = \${id}\`;
        return rds.createMySQLStatement(s1, s2);
      }

      export function response(ctx) {}
    `;

      const context = {
        arguments: {
          id: "adb626eb-4ce5-452a-a917-3943a37f202b",
          text: "hello world",
        },
      };

      await checkResolverValid(code, context, "request");
    });

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
          started: new Date(Date.UTC(2022, 2, 2)),
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
    test("raw string", async () => {
      const code = `
      export function request(ctx) {
        const { id } = ctx.args;
        const updateQuery = \`UPDATE "document" set "data" = 10 WHERE id = \${id}\`;
        return rds.createPgStatement(updateQuery);
      }

      export function response(ctx) {}
    `;

      const context = {
        arguments: {
          id: "adb626eb-4ce5-452a-a917-3943a37f202b",
        },
      };

      await checkResolverValid(code, context, "request");
    });

    test("json functions in raw string", async () => {
      const code = await importCodeFromFile("./functions/pgRawQueryJson.js");

      const context = {
        arguments: {
          id: "adb626eb-4ce5-452a-a917-3943a37f202b",
          key: "key",
          value: "value",
        },
      };

      await checkResolverValid(code, context, "request");
    });

    test("sql tagged template", async () => {
      const code = `
      export function request(ctx) {
        const { id, text } = ctx.args;
        const s1 = rds.sql\`insert into Post(id, text) values(\${rds.typeHint.UUID(id)}, \${text})\`;
        const s2 = rds.sql\`select * from Post where id = \${id}\`;
        return rds.createPgStatement(s1, s2);
      }

      export function response(ctx) {}
    `;

      const context = {
        arguments: {
          id: "adb626eb-4ce5-452a-a917-3943a37f202b",
          text: "hello world",
        },
      };

      await checkResolverValid(code, context, "request");
    });

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
          started: new Date(Date.UTC(2022, 2, 2)),
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

  // Schema/table-qualified identifiers (e.g. "schema.table" or "table.column") must be split on
  // `.` and each segment quoted individually, matching AWS AppSync (e.g. `"schema"."table"`),
  // rather than quoting the whole string as one literal identifier (`"schema.table"`).
  describe("schema-qualified identifiers", () => {
    test("postgresql select qualified table", async () => {
      const code = `
        export function request(ctx) {
          return rds.createPgStatement(rds.select({ table: "domain.item" }));
        }
        export function response(ctx) {}
      `;
      await checkResolverValid(code, {}, "request");
    });

    test("postgresql select qualified columns", async () => {
      const code = `
        export function request(ctx) {
          return rds.createPgStatement(rds.select({
            table: "private.persons",
            columns: ["id", "persons.name"],
          }));
        }
        export function response(ctx) {}
      `;
      await checkResolverValid(code, {}, "request");
    });

    test("postgresql qualified column in where clause", async () => {
      const code = `
        export function request(ctx) {
          return rds.createPgStatement(rds.select({
            table: "private.persons",
            where: { "persons.id": { eq: 123 } },
          }));
        }
        export function response(ctx) {}
      `;
      await checkResolverValid(code, {}, "request");
    });

    test("postgresql insert into qualified table", async () => {
      const code = `
        export function request(ctx) {
          return rds.createPgStatement(rds.insert({
            table: "private.persons",
            values: { name: "test" },
          }));
        }
        export function response(ctx) {}
      `;
      await checkResolverValid(code, {}, "request");
    });

    test("mysql select qualified table", async () => {
      const code = `
        export function request(ctx) {
          return rds.createMySQLStatement(rds.select({ table: "domain.item" }));
        }
        export function response(ctx) {}
      `;
      await checkResolverValid(code, {}, "request");
    });

    test("unqualified name is quoted as one segment", async () => {
      const code = `
        export function request(ctx) {
          return rds.createPgStatement(rds.select({ table: "item" }));
        }
        export function response(ctx) {}
      `;
      await checkResolverValid(code, {}, "request");
    });
  });

  // A `*` column must stay unquoted (`SELECT *`, not `SELECT "*"`), limit/offset are optional,
  // and an empty `where` object must not emit a dangling `WHERE` keyword.
  describe("select statement edge cases", () => {
    // resolver shape taken from a customer: limit/offset forwarded straight from ctx.args
    const optionalLimitOffsetCode = `
      export function request(ctx) {
        const { limit, offset = null } = ctx.args;
        return rds.createPgStatement(rds.select({
          table: 'domain.color',
          columns: ['*'],
          limit,
          offset,
        }));
      }
      export function response(ctx) {}
    `;

    test("limit and offset absent from args", async () => {
      await checkResolverValid(optionalLimitOffsetCode, {}, "request");
    });

    test("limit provided in args", async () => {
      await checkResolverValid(optionalLimitOffsetCode, { arguments: { limit: 3 } }, "request");
    });

    test("postgresql star column", async () => {
      const code = `
        export function request(ctx) {
          return rds.createPgStatement(rds.select({ table: "domain.color", columns: ["*"] }));
        }
        export function response(ctx) {}
      `;
      await checkResolverValid(code, {}, "request");
    });

    test("mysql star column", async () => {
      const code = `
        export function request(ctx) {
          return rds.createMySQLStatement(rds.select({ table: "domain.color", columns: ["*"] }));
        }
        export function response(ctx) {}
      `;
      await checkResolverValid(code, {}, "request");
    });

    test("qualified star column", async () => {
      const code = `
        export function request(ctx) {
          return rds.createPgStatement(rds.select({
            table: "private.persons",
            columns: ["id", "persons.*"],
          }));
        }
        export function response(ctx) {}
      `;
      await checkResolverValid(code, {}, "request");
    });

    test("empty where object", async () => {
      const code = `
        export function request(ctx) {
          return rds.createPgStatement(rds.select({
            table: "domain.color",
            where: {},
            limit: 3,
          }));
        }
        export function response(ctx) {}
      `;
      await checkResolverValid(code, {}, "request");
    });

    test("empty and condition in where", async () => {
      const code = `
        export function request(ctx) {
          return rds.createPgStatement(rds.select({
            table: "domain.color",
            where: { and: [] },
            limit: 3,
          }));
        }
        export function response(ctx) {}
      `;
      await checkResolverValid(code, {}, "request");
    });

    test("empty where object in update", async () => {
      const code = `
        export function request(ctx) {
          return rds.createPgStatement(rds.update({
            table: "persons",
            values: { name: "test" },
            where: {},
          }));
        }
        export function response(ctx) {}
      `;
      await checkResolverValid(code, {}, "request");
    });

    test("empty where object in remove", async () => {
      const code = `
        export function request(ctx) {
          return rds.createPgStatement(rds.remove({
            table: "persons",
            where: {},
          }));
        }
        export function response(ctx) {}
      `;
      await checkResolverValid(code, {}, "request");
    });

    test("limit and offset zero", async () => {
      const code = `
        export function request(ctx) {
          return rds.createPgStatement(rds.select({
            table: "domain.color",
            limit: 0,
            offset: 0,
          }));
        }
        export function response(ctx) {}
      `;
      await checkResolverValid(code, {}, "request");
    });
  });

  describe("empty, null and repeated clause inputs", () => {
    // AWS assembles a statement from clause fragments and drops the ones that render to nothing.
    // Some of the inputs below make AWS itself emit invalid SQL (a dangling SELECT, SET, RETURNING
    // or AND); the snapshots reproduce that byte-for-byte, so a query that breaks in AWS breaks
    // identically here rather than silently working.
    const pg = (expr) => `
      export function request(ctx) {
        return rds.createPgStatement(${expr});
      }
      export function response(ctx) {}
    `;

    const mysql = (expr) => `
      export function request(ctx) {
        return rds.createMySQLStatement(${expr});
      }
      export function response(ctx) {}
    `;

    // an empty sort list drops the ORDER BY keyword along with its body
    test("empty orderBy array", async () => {
      await checkResolverValid(pg(`rds.select({ table: "domain.color", orderBy: [] })`), {}, "request");
    });

    test("empty orderBy array with limit", async () => {
      await checkResolverValid(pg(`rds.select({ table: "domain.color", orderBy: [], limit: 3 })`), {}, "request");
    });

    test("empty orderBy array in mysql", async () => {
      await checkResolverValid(mysql(`rds.select({ table: "domain.color", orderBy: [] })`), {}, "request");
    });

    // an empty column list leaves the column fragment out entirely: `SELECT FROM ...`
    test("empty column list", async () => {
      await checkResolverValid(pg(`rds.select({ table: "domain.color", columns: [] })`), {}, "request");
    });

    test("empty column list with limit", async () => {
      await checkResolverValid(pg(`rds.select({ table: "domain.color", columns: [], limit: 3 })`), {}, "request");
    });

    test("empty column list in mysql", async () => {
      await checkResolverValid(mysql(`rds.select({ table: "domain.color", columns: [] })`), {}, "request");
    });

    test("empty nested or group", async () => {
      await checkResolverValid(pg(`rds.select({ table: "persons", where: { and: [{ or: [] }] } })`), {}, "request");
    });

    test("empty condition object for a column", async () => {
      await checkResolverValid(pg(`rds.select({ table: "persons", where: { id: {} } })`), {}, "request");
    });

    test("empty condition object alongside a real condition", async () => {
      await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { eq: "test" }, id: {} } })`), {}, "request");
    });

    test("empty object in an and array", async () => {
      await checkResolverValid(pg(`rds.select({ table: "persons", where: { and: [{ id: { eq: 1 } }, {}] } })`), {}, "request");
    });

    test("empty objects in an or array", async () => {
      await checkResolverValid(pg(`rds.select({ table: "persons", where: { or: [{}, {}] } })`), {}, "request");
    });

    test("empty returning array in insert", async () => {
      await checkResolverValid(pg(`rds.insert({ table: "persons", values: { name: "test" }, returning: [] })`), {}, "request");
    });

    test("empty returning array in remove", async () => {
      await checkResolverValid(pg(`rds.remove({ table: "persons", where: { id: { eq: 1 } }, returning: [] })`), {}, "request");
    });

    test("empty values object in update", async () => {
      await checkResolverValid(pg(`rds.update({ table: "persons", values: {}, where: { id: { eq: 1 } } })`), {}, "request");
    });

    // a nullish value is inlined as a NULL literal rather than bound to a variable
    test("null value in insert values", async () => {
      await checkResolverValid(pg(`rds.insert({ table: "persons", values: { name: null } })`), {}, "request");
    });

    test("null mixed with bound values in insert", async () => {
      await checkResolverValid(pg(`rds.insert({ table: "persons", values: { name: "test", country: null } })`), {}, "request");
    });

    test("undefined value in insert values", async () => {
      await checkResolverValid(pg(`rds.insert({ table: "persons", values: { name: undefined } })`), {}, "request");
    });

    test("null value in update values", async () => {
      await checkResolverValid(pg(`rds.update({ table: "persons", values: { country: null }, where: { id: { eq: 1 } } })`), {}, "request");
    });

    test("null alongside a type hint", async () => {
      await checkResolverValid(pg(`rds.insert({ table: "persons", values: { id: rds.typeHint.UUID("0e0d0c0b-0a09-0807-0605-040302010000"), country: null } })`), {}, "request");
    });

    // `false` and `0` are ordinary bound values, not nulls
    test("false and zero values are bound", async () => {
      await checkResolverValid(pg(`rds.insert({ table: "persons", values: { active: false, score: 0 } })`), {}, "request");
    });

    // every condition on a column is rendered, not just the first one
    test("multiple conditions on one column", async () => {
      await checkResolverValid(pg(`rds.select({ table: "persons", where: { id: { ge: 1, le: 9, ne: 5 } } })`), {}, "request");
    });

    test("multiple conditions on one column inside a group", async () => {
      await checkResolverValid(pg(`rds.select({ table: "persons", where: { and: [{ id: { eq: 1, gt: 0 } }, { name: { eq: "test" } }] } })`), {}, "request");
    });

    test("attributeExists alongside another condition", async () => {
      await checkResolverValid(pg(`rds.select({ table: "persons", where: { id: { eq: 1, attributeExists: true } } })`), {}, "request");
    });

    // returning accepts a column array (quoted) or the bare string `*`
    test("returning column array in insert", async () => {
      await checkResolverValid(pg(`rds.insert({ table: "persons", values: { name: "test" }, returning: ["id", "name"] })`), {}, "request");
    });

    test("returning star in insert", async () => {
      await checkResolverValid(pg(`rds.insert({ table: "persons", values: { name: "test" }, returning: "*" })`), {}, "request");
    });

    test("returning star in remove", async () => {
      await checkResolverValid(pg(`rds.remove({ table: "persons", where: { id: { eq: 1 } }, returning: "*" })`), {}, "request");
    });

    // orderBy dir is normalised to upper case; an absent or null dir means ascending
    test("lowercase orderBy dir is uppercased", async () => {
      await checkResolverValid(pg(`rds.select({ table: "persons", orderBy: [{ column: "name", dir: "desc" }] })`), {}, "request");
    });

    test("null orderBy dir defaults to ascending", async () => {
      await checkResolverValid(pg(`rds.select({ table: "persons", orderBy: [{ column: "name", dir: null }] })`), {}, "request");
    });

    // `contains` is a substring match, so the bound value carries wildcards; `notContains` does
    // not wrap its value - AWS does not either
    test("contains wraps the value in wildcards", async () => {
      await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { contains: "test" } } })`), {}, "request");
    });

    test("notContains does not wrap the value", async () => {
      await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { notContains: "test" } } })`), {}, "request");
    });

    // These inputs are rejected outright. The message is snapshotted like any other result: the
    // harness strips the source position AWS prefixes a thrown message with, so the recording holds
    // against `EvaluateCode` and against the local module alike.
    test("rejects an orderBy dir that is neither ascending nor descending", async () => {
      await checkResolverValid(pg(`rds.select({ table: "persons", orderBy: [{ column: "id", dir: "; DROP TABLE persons" }] })`), {}, "request");
    });

    test("rejects an empty orderBy dir", async () => {
      await checkResolverValid(pg(`rds.select({ table: "persons", orderBy: [{ column: "id", dir: "" }] })`), {}, "request");
    });

    test("rejects returning in mysql", async () => {
      await checkResolverValid(mysql(`rds.remove({ table: "persons", where: { id: { eq: 1 } }, returning: ["id"] })`), {}, "request");
    });

    test("rejects a returning value that is neither a column array nor a star", async () => {
      await checkResolverValid(pg(`rds.insert({ table: "persons", values: { name: "test" }, returning: "id" })`), {}, "request");
    });
  });

  describe("additional conditions and the from alias", () => {
    const pg = (expr) => `
      export function request(ctx) {
        return rds.createPgStatement(${expr});
      }
      export function response(ctx) {}
    `;

    const mysql = (expr) => `
      export function request(ctx) {
        return rds.createMySQLStatement(${expr});
      }
      export function response(ctx) {}
    `;

    describe("beginsWith, between and size", () => {
      // beginsWith is a prefix match: the bound value carries a trailing wildcard only
      test("beginsWith renders a trailing wildcard", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { beginsWith: "te" } } })`), {}, "request");
      });

      test("beginsWith keeps a wildcard already in the value", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { beginsWith: "a%b" } } })`), {}, "request");
      });

      test("beginsWith with an empty string", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { beginsWith: "" } } })`), {}, "request");
      });

      test("beginsWith in a delete statement", async () => {
        await checkResolverValid(pg(`rds.remove({ table: "persons", where: { name: { beginsWith: "te" } } })`), {}, "request");
      });

      test("beginsWith in mysql", async () => {
        await checkResolverValid(mysql(`rds.select({ table: "persons", where: { name: { beginsWith: "te" } } })`), {}, "request");
      });

      test("between two numbers", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { age: { between: [18, 65] } } })`), {}, "request");
      });

      test("between two strings", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { between: ["a", "m"] } } })`), {}, "request");
      });

      // each bound is bound separately, so type hints survive
      test("between two type hints", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { birthday: { between: [rds.typeHint.DATE("2020-01-01"), rds.typeHint.DATE("2020-12-31")] } } })`), {}, "request");
      });

      test("between a null bound", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { age: { between: [null, 65] } } })`), {}, "request");
      });

      test("between in an update statement", async () => {
        await checkResolverValid(pg(`rds.update({ table: "persons", values: { active: false }, where: { age: { between: [18, 65] } } })`), {}, "request");
      });

      test("between in mysql", async () => {
        await checkResolverValid(mysql(`rds.select({ table: "persons", where: { age: { between: [18, 65] } } })`), {}, "request");
      });

      // size compares against the column length
      test("size compares the column length", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { size: { eq: 3 } } } })`), {}, "request");
      });

      test("size with each comparison operator", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { a: { size: { ne: 1 } }, b: { size: { gt: 2 } }, c: { size: { ge: 3 } }, d: { size: { lt: 4 } }, e: { size: { le: 5 } } } })`), {}, "request");
      });

      test("size with a nested between", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { size: { between: [2, 8] } } } })`), {}, "request");
      });

      // the length target is repeated for each operator
      test("size with two comparisons on one column", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { size: { eq: 3, gt: 1 } } } })`), {}, "request");
      });

      // unlike a direct comparison, a nullish size value is inlined rather than rejected
      test("size with a null value", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { size: { eq: null } } } })`), {}, "request");
      });

      test("size on a qualified column", async () => {
        await checkResolverValid(pg(`rds.select({ table: "private.persons", where: { "persons.name": { size: { eq: 3 } } } })`), {}, "request");
      });

      test("size in an update statement", async () => {
        await checkResolverValid(pg(`rds.update({ table: "persons", values: { active: false }, where: { name: { size: { eq: 3 } } } })`), {}, "request");
      });

      test("size in mysql", async () => {
        await checkResolverValid(mysql(`rds.select({ table: "persons", where: { name: { size: { eq: 3 } } } })`), {}, "request");
      });

      // an empty size object renders nothing, and must not leave grouping parens behind
      test("empty size object", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { size: {} } } })`), {}, "request");
      });

      test("empty size object in a group", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { and: [{ name: { size: {} } }] } })`), {}, "request");
      });

      test("empty size object alongside a real condition in a group", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { and: [{ name: { size: {} } }, { id: { eq: 1 } }] } })`), {}, "request");
      });

      test("empty size object alongside a real condition on one column", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { size: {}, eq: "test" } } })`), {}, "request");
      });

      test("size and beginsWith in a group", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { and: [{ name: { size: { eq: 3 } } }, { country: { beginsWith: "de" } }] } })`), {}, "request");
      });

      test("size and beginsWith on one column", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { size: { eq: 3 }, beginsWith: "te" } } })`), {}, "request");
      });

      test("between and beginsWith in an or group", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { or: [{ age: { between: [18, 65] } }, { name: { beginsWith: "te" } }] } })`), {}, "request");
      });

      test("size nested in an or of an and", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { or: [{ and: [{ name: { size: { eq: 3 } } }] }] } })`), {}, "request");
      });

      test("size with order by and limit", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { size: { gt: 2 } } }, orderBy: [{ column: "name", dir: "desc" }], limit: 5 })`), {}, "request");
      });

      // The wildcard conditions all require a string
      test("rejects a non-string for beginsWith", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { beginsWith: 5 } } })`), {}, "request");
      });

      test("rejects null for beginsWith", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { beginsWith: null } } })`), {}, "request");
      });

      test("rejects a non-string for contains", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { contains: 5 } } })`), {}, "request");
      });

      test("rejects a non-string for notContains", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { notContains: 5 } } })`), {}, "request");
      });

      test("rejects between with the wrong number of values", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { age: { between: [1] } } })`), {}, "request");
      });

      test("rejects between with a value that is not an array", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { age: { between: 5 } } })`), {}, "request");
      });

      test("rejects a nested between with the wrong number of values", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { size: { between: [1] } } } })`), {}, "request");
      });

      test("rejects an unsupported size operator", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { size: { contains: "x" } } } })`), {}, "request");
      });

      test("rejects a size that is not an object", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { size: 3 } } })`), {}, "request");
      });
    });

    describe("from as a table alias", () => {
      test("select with from", async () => {
        await checkResolverValid(pg(`rds.select({ from: "persons" })`), {}, "request");
      });

      test("select with a qualified from", async () => {
        await checkResolverValid(pg(`rds.select({ from: "domain.color", columns: ["id"] })`), {}, "request");
      });

      test("select with from and the other clauses", async () => {
        await checkResolverValid(pg(`rds.select({ from: "domain.color", columns: ["id"], where: { id: { eq: 1 } }, limit: 2 })`), {}, "request");
      });

      test("select with from in mysql", async () => {
        await checkResolverValid(mysql(`rds.select({ from: "persons" })`), {}, "request");
      });

      // only select() knows the alias, so insert falls back to `table` without complaining
      test("insert uses table and ignores from", async () => {
        await checkResolverValid(pg(`rds.insert({ from: "ignored", table: "persons", values: { name: "test" } })`), {}, "request");
      });

      test("rejects from and table together in select", async () => {
        await checkResolverValid(pg(`rds.select({ from: "a", table: "b" })`), {}, "request");
      });

      test("rejects a select with neither table nor from", async () => {
        await checkResolverValid(pg(`rds.select({ columns: ["id"] })`), {}, "request");
      });

      test("rejects a null table", async () => {
        await checkResolverValid(pg(`rds.select({ table: null })`), {}, "request");
      });

      // insert/update/remove do not accept the alias at all
      test("rejects an insert given only from", async () => {
        await checkResolverValid(pg(`rds.insert({ from: "persons", values: { name: "test" } })`), {}, "request");
      });

      test("rejects an update given only from", async () => {
        await checkResolverValid(pg(`rds.update({ from: "persons", values: { name: "test" }, where: { id: { eq: 1 } } })`), {}, "request");
      });

      test("rejects a remove given only from", async () => {
        await checkResolverValid(pg(`rds.remove({ from: "persons", where: { id: { eq: 1 } } })`), {}, "request");
      });
    });
  });

  describe("input validation", () => {
    const pg = (expr) => `
      export function request(ctx) {
        return rds.createPgStatement(${expr});
      }
      export function response(ctx) {}
    `;

    const mysql = (expr) => `
      export function request(ctx) {
        return rds.createMySQLStatement(${expr});
      }
      export function response(ctx) {}
    `;

    describe("statement arguments", () => {
      // an empty expression renders as `createPgStatement()`, with no statement at all
      test("rejects a call with no statement", async () => {
        await checkResolverValid(pg(``), {}, "request");
      });

      // the message names the entry point, so both dialects are worth pinning
      test("rejects a call with no statement in mysql", async () => {
        await checkResolverValid(mysql(``), {}, "request");
      });

      test("rejects a number as a statement", async () => {
        await checkResolverValid(pg(`123`), {}, "request");
      });

      test("rejects an object that is not a statement", async () => {
        await checkResolverValid(pg(`{}`), {}, "request");
      });

      test("rejects an unknown statement type", async () => {
        await checkResolverValid(pg(`{ type: "BOGUS", properties: {} }`), {}, "request");
      });

      // `sql` is meant to be used as a tag; called by hand it can be given a mismatched arity
      test("rejects a malformed sql tagged template", async () => {
        await checkResolverValid(pg(`rds.sql(["a"], 1, 2)`), {}, "request");
      });

      // the statement constructors validate their payload when they are called, so the message
      // names the constructor rather than the statement builder
      test("rejects a select called with no payload", async () => {
        await checkResolverValid(pg(`rds.select()`), {}, "request");
      });

      test("rejects a remove called with no payload", async () => {
        await checkResolverValid(pg(`rds.remove()`), {}, "request");
      });

      test("rejects a null payload", async () => {
        await checkResolverValid(pg(`rds.select(null)`), {}, "request");
      });

      test("rejects a payload that is not an object", async () => {
        await checkResolverValid(pg(`rds.select("persons")`), {}, "request");
      });

      test("rejects a payload given as an array", async () => {
        await checkResolverValid(pg(`rds.select([])`), {}, "request");
      });
    });

    describe("table names and aliases", () => {
      // an alias is a single-entry object, and AWS reads the value as the table and the key as the
      // alias - so `{ persons: "p" }` means `"p" as "persons"`, not the other way round
      test("select with a table alias", async () => {
        await checkResolverValid(pg(`rds.select({ table: { persons: "p" } })`), {}, "request");
      });

      test("select with a table alias in mysql", async () => {
        await checkResolverValid(mysql(`rds.select({ table: { persons: "p" } })`), {}, "request");
      });

      test("select with a qualified table alias", async () => {
        await checkResolverValid(pg(`rds.select({ table: { "public.persons": "p" } })`), {}, "request");
      });

      test("from accepts an alias as well", async () => {
        await checkResolverValid(pg(`rds.select({ from: { persons: "p" } })`), {}, "request");
      });

      // unlike `from`, the alias is understood by every statement type
      test("insert with a table alias", async () => {
        await checkResolverValid(pg(`rds.insert({ table: { persons: "p" }, values: { name: "test" } })`), {}, "request");
      });

      test("update with a table alias", async () => {
        await checkResolverValid(pg(`rds.update({ table: { persons: "p" }, values: { name: "test" } })`), {}, "request");
      });

      test("delete with a table alias", async () => {
        await checkResolverValid(pg(`rds.remove({ table: { persons: "p" } })`), {}, "request");
      });

      test("rejects an alias with more than one entry", async () => {
        await checkResolverValid(pg(`rds.select({ table: { a: "x", b: "y" } })`), {}, "request");
      });

      // AWS leaks the exception from its own implementation here; the snapshot records it as-is
      test("rejects an empty alias", async () => {
        await checkResolverValid(pg(`rds.select({ table: {} })`), {}, "request");
      });

      test("rejects a non-string alias value", async () => {
        await checkResolverValid(pg(`rds.select({ table: { persons: 1 } })`), {}, "request");
      });

      test("rejects a table that is neither a string nor an alias", async () => {
        await checkResolverValid(pg(`rds.select({ table: 1 })`), {}, "request");
      });

      test("rejects a table given as an array", async () => {
        await checkResolverValid(pg(`rds.select({ table: ["persons"] })`), {}, "request");
      });

      // `from` reports its own message rather than the one for `table`
      test("rejects a from that is neither a string nor an object", async () => {
        await checkResolverValid(pg(`rds.select({ from: 1 })`), {}, "request");
      });

      test("rejects a non-string table in insert", async () => {
        await checkResolverValid(pg(`rds.insert({ table: 1, values: { name: "test" } })`), {}, "request");
      });
    });

    describe("column lists", () => {
      test("a star column list selects everything", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", columns: "*" })`), {}, "request");
      });

      test("a star inside the column array is left unquoted", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", columns: ["*"] })`), {}, "request");
      });

      test("a null column list selects everything", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", columns: null })`), {}, "request");
      });

      test("rejects a column list given as a plain string", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", columns: "name" })`), {}, "request");
      });

      test("rejects a null column name", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", columns: ["name", null] })`), {}, "request");
      });

      test("rejects a non-string column name", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", columns: [1] })`), {}, "request");
      });

      // `returning` is validated by the same rules as `columns`
      test("rejects a null column name in returning", async () => {
        await checkResolverValid(pg(`rds.insert({ table: "persons", values: { name: "test" }, returning: [null] })`), {}, "request");
      });

      // the shape of the list is checked before the dialect, so mysql reports the malformed list
      // rather than its lack of RETURNING support
      test("a malformed returning in mysql reports the column list", async () => {
        await checkResolverValid(mysql(`rds.insert({ table: "persons", values: { name: "test" }, returning: "id" })`), {}, "request");
      });

      test("rejects a star returning in mysql", async () => {
        await checkResolverValid(mysql(`rds.insert({ table: "persons", values: { name: "test" }, returning: "*" })`), {}, "request");
      });
    });

    describe("where clauses", () => {
      // a whole where clause may be a sql tagged template instead of a condition object
      test("where as a sql template", async () => {
        await checkResolverValid(pg('rds.select({ table: "persons", where: rds.sql`id = ${1}` })'), {}, "request");
      });

      test("where as a sql template with nothing interpolated", async () => {
        await checkResolverValid(pg('rds.select({ table: "persons", where: rds.sql`id = 1` })'), {}, "request");
      });

      test("where as a sql template in mysql", async () => {
        await checkResolverValid(mysql('rds.select({ table: "persons", where: rds.sql`id = ${1}` })'), {}, "request");
      });

      test("where as a sql template in a delete", async () => {
        await checkResolverValid(pg('rds.remove({ table: "persons", where: rds.sql`id = ${1}` })'), {}, "request");
      });

      // the template shares the statement's variable numbering, so the update value binds first
      test("where as a sql template in an update", async () => {
        await checkResolverValid(pg('rds.update({ table: "persons", values: { name: "test" }, where: rds.sql`id = ${1}` })'), {}, "request");
      });

      // only a condition object is accepted inside and/or, not a template
      test("rejects a sql template inside an and group", async () => {
        await checkResolverValid(pg('rds.select({ table: "persons", where: { and: [rds.sql`id = ${1}`] } })'), {}, "request");
      });

      test("rejects a where given as a plain string", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: "id = 1" })`), {}, "request");
      });

      test("rejects a where given as an array", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: [] })`), {}, "request");
      });

      test("rejects a null condition for a column", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: null } })`), {}, "request");
      });

      test("rejects a bare value as a condition", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: "test" } })`), {}, "request");
      });

      test("rejects an and that is not an array", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { and: "nope" } })`), {}, "request");
      });

      test("rejects an or that is not an array", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { or: "nope" } })`), {}, "request");
      });

      test("rejects a null entry in an and group", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { and: [null] } })`), {}, "request");
      });

      test("rejects a string entry in an or group", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { or: ["id = 1"] } })`), {}, "request");
      });

      test("rejects an unsupported condition", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { bogus: 1 } } })`), {}, "request");
      });

      // the dynamodb operators are not shared with rds, `in` included
      test("rejects the in operator", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { id: { in: [1, 2] } } })`), {}, "request");
      });
    });

    describe("condition values", () => {
      test("rejects a null equality value", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { id: { eq: null } } })`), {}, "request");
      });

      test("rejects an undefined equality value", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { id: { eq: undefined } } })`), {}, "request");
      });

      test("rejects a null greater-than value", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { id: { gt: null } } })`), {}, "request");
      });

      // a comparison under `size` keeps rendering a NULL literal - the rejection is only for a
      // direct comparison
      test("a null size comparison renders a null literal", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { size: { eq: null } } } })`), {}, "request");
      });

      test("attributeExists true renders is not null", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { attributeExists: true } } })`), {}, "request");
      });

      test("rejects a null attributeExists value", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { attributeExists: null } } })`), {}, "request");
      });

      // a truthy value is not enough, it has to be a boolean
      test("rejects a non-boolean attributeExists value", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { attributeExists: "yes" } } })`), {}, "request");
      });

      test("rejects zero for attributeExists", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", where: { name: { attributeExists: 0 } } })`), {}, "request");
      });
    });

    describe("order by, limit and offset", () => {
      test("rejects an orderBy that is not an array", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", orderBy: { column: "name" } })`), {}, "request");
      });

      test("rejects a null orderBy item", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", orderBy: [null] })`), {}, "request");
      });

      test("rejects an orderBy item with no column", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", orderBy: [{}] })`), {}, "request");
      });

      test("rejects a non-string orderBy column", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", orderBy: [{ column: 1 }] })`), {}, "request");
      });

      // only a string dir is validated: any other value means ascending, the same as omitting it
      test("a numeric orderBy dir sorts ascending", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", orderBy: [{ column: "name", dir: 1 }] })`), {}, "request");
      });

      test("an object orderBy dir sorts ascending", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", orderBy: [{ column: "name", dir: {} }] })`), {}, "request");
      });

      // a numeric string is coerced, so the bound variable is a number either way
      test("a numeric string limit binds a number", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", limit: "5" })`), {}, "request");
      });

      test("a numeric string offset binds a number", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", offset: "5" })`), {}, "request");
      });

      test("rejects a limit that is not numeric", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", limit: "abc" })`), {}, "request");
      });

      test("rejects an empty string limit", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", limit: "" })`), {}, "request");
      });

      test("rejects an object offset", async () => {
        await checkResolverValid(pg(`rds.select({ table: "persons", offset: {} })`), {}, "request");
      });
    });

    describe("insert and update values", () => {
      test("rejects an insert with no values", async () => {
        await checkResolverValid(pg(`rds.insert({ table: "persons" })`), {}, "request");
      });

      // the message names the statement type
      test("rejects an update with no values", async () => {
        await checkResolverValid(pg(`rds.update({ table: "persons", where: { id: { eq: 1 } } })`), {}, "request");
      });

      test("rejects null insert values", async () => {
        await checkResolverValid(pg(`rds.insert({ table: "persons", values: null })`), {}, "request");
      });

      test("rejects insert values given as an array", async () => {
        await checkResolverValid(pg(`rds.insert({ table: "persons", values: [1] })`), {}, "request");
      });
    });
  });
});

describe("error handling", () => {
  test("error", async () => {
    const code = `
      export function request(ctx) {
          util.error("foo")
        }
      export function response(ctx) {}
  `;
    await checkResolverValid(code, {}, "request");
  })
  test("unauthorized", async () => {
    const code = `
      export function request(ctx) {
          util.unauthorized()
        }
      export function response(ctx) {}
  `;
    await checkResolverValid(code, {}, "request");
  })
})

// LocalStack has to tell a rejection raised by the library from an error the resolver author raised
// deliberately, and the two are otherwise identical: both are an `AppSyncUserError` carrying only a
// message. AppSync attributes the former to the errorType `Code`.
//
// This pair is the one thing here that is NOT compared against AWS, and cannot be: `EvaluateCode`
// reports an error as a bare message and never mentions errorType, so there is nothing to record.
// It pins our own contract with the runtime rather than a claim about AWS.
describe("error types", () => {
  const thrownBy = (fn) => {
    try {
      fn();
    } catch (e) {
      return e;
    }

    throw new Error("expected the call to throw");
  };

  test("a rejected input is attributed to the resolver code", () => {
    const error = thrownBy(() => rds.createPgStatement(rds.select({})));

    expect(error.name).toBe("AppSyncUserError");
    expect(error.errorType).toBe("Code");
    expect(error.message).toBe("'table' or 'from' key is required.");
  });

  test("a deliberate util.error carries no errorType", () => {
    const error = thrownBy(() => util.error("foo"));

    expect(error.name).toBe("AppSyncUserError");
    expect(error.errorType).toBeUndefined();
  });

  test("util.error keeps an errorType it was given", () => {
    const error = thrownBy(() => util.error("foo", "MyErrorType"));

    expect(error.errorType).toBe("MyErrorType");
  });
})