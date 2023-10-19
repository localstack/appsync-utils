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
