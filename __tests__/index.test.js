/* 
  * Helpers definition from https://docs.aws.amazon.com/appsync/latest/devguide/dynamodb-helpers-in-util-dynamodb-js.html
*/

const { util } = require("..");
const { AppSyncClient, EvaluateCodeCommand } = require("@aws-sdk/client-appsync");

let client = null;

describe("dynamodb helpers", () => {
  describe.skip("toDynamoDB", () => {
    test.each([
      ["foo", { S: "foo" }],
      [10, { N: 10 }],
      [true, { BOOL: true }],
    ])("input is %s", (test, expected) => {
      expect(util.dynamodb.toDynamoDB(test)).toStrictEqual(expected);
    });
  });

  test("toString", async () => {
    await checkValid(`util.dynamodb.toString("test")`);
  });

  test("toStringSet", async () => {
    await checkValid(`util.dynamodb.toStringSet(["foo", "bar", "baz"])`);
  });

  test("toNumber", async () => {
    await checkValid(`util.dynamodb.toNumber(12345)`);
  });

  test("toNumberSet", async () => {
    await checkValid(`util.dynamodb.toNumberSet([1, 23, 4.56])`);
  });

  test.skip("toBinary", () => {
    expect(util.dynamodb.toBinary("foo")).toStrictEqual({ B: "foo" });
  });

  test.skip("toBinarySet", () => {
    expect(util.dynamodb.toBinarySet(["foo", "bar", "baz"])).toStrictEqual({ BS: ["foo", "bar", "baz"] });
  });

  test.skip("toBoolean", () => {
    expect(util.dynamodb.toBoolean(true)).toStrictEqual({ BOOL: true });
  });

  test.skip("toNull", () => {
    expect(util.dynamodb.toNull()).toStrictEqual({ NULL: null });
  });

  test.skip("toList", () => {
    expect(util.dynamodb.toList(["foo", 123, { bar: "baz" }])).toStrictEqual(
      {
        L: [
          { S: "foo" },
          { N: 123 },
          {
            M: {
              bar: { S: "baz" },
            },
          },
        ],
      }
    );
  });

  test.skip("toMap", () => {
    expect(util.dynamodb.toMap({ "foo": "bar", "baz": 1234, "beep": ["boop"] })).toStrictEqual(
      {
        "M": {
          "foo": { "S": "bar" },
          "baz": { "N": 1234 },
          "beep": {
            "L": [
              { "S": "boop" }
            ]
          }
        }
      }
    );
  });

  test.skip("toMapValues", () => {
    expect(util.dynamodb.toMapValues({ "foo": "bar", "baz": 1234, "beep": ["boop"] })
    ).toStrictEqual(
      {
        "foo": { "S": "bar" },
        "baz": { "N": 1234 },
        "beep": {
          "L": [
            { "S": "boop" }
          ]
        }
      }
    );
  });
});

const runOnAWS = async (s) => {
  if (!client) {
    client = new AppSyncClient();
  }

  const code = `
  import { util } from '@aws-appsync/utils';

  export function request(ctx) {
    return ${s};
  }

  export function response(ctx) {
  }
  `;

  const command = new EvaluateCodeCommand({
    code,
    context: "{}",
    function: "request",
    runtime: {
      name: "APPSYNC_JS",
      runtimeVersion: "1.0.0",
    },
  });

  const result = await client.send(command);
  try {
    return JSON.parse(result.evaluationResult);
  } catch (e) {
    console.error("invalid json", result);
  }
}

// If TEST_TARGET is AWS_CLOUD then run the check against AWS. Otherwise, run locally.
const checkValid = async (s) => {
  let result;
  if (process.env.TEST_TARGET === "AWS_CLOUD") {
    result = await runOnAWS(s);
  } else {
    result = eval(s);
  }
  expect(result).toMatchSnapshot();
}

