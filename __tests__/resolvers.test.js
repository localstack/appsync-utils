/* test full resolver pipelines */

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
  test("postgres", async () => {
    const code = `
    import { select, createPgStatement, toJsonObject, typeHint } from "@aws-appsync/utils/rds"
    // appsync/resolvers/Query.getPracticeById.js
    export function request(ctx) {

        //const whereClause = { id: { eq: typeHint.UUID(ctx.args.id) } }; // TODO ctx.args.id is undefined 
        const whereClause = { id: { eq: typeHint.UUID("123") } };
        return createPgStatement(select({
            table: "UserGroup",
            where: whereClause
        }));
    }

    export function response(ctx) {
        const { error, result } = ctx;
        if (error) {
            return util.appendError(error.message, error.type, result);
        }
        const items = toJsonObject(result)[0];
        if (items.length == 0) {
            return null;
        }
        return items[0];
    }
    `;

    const requestContext = {
      args: {
        id: "1232"
      }
    };

    await checkResolverValid(code, requestContext, "request");

    const test_result = {
      sqlStatementResults: [
        {
          numberOfRecordsUpdated: 0,
          records: [
            [
              {
                stringValue: "User One"
              },
              {
                stringValue: "1232"
              }
            ],
          ],
          columnMetadata: [
            
          ]
        }
      ]
    }

    const responseContext = {
      error: null,
      result: JSON.stringify(test_result) // TODO the result is not correctly formatted? :/
    };

    await checkResolverValid(code, responseContext, "response");
  });
});

