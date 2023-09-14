/* 
  * Helpers definition from https://docs.aws.amazon.com/appsync/latest/devguide/dynamodb-helpers-in-util-dynamodb-js.html
*/

const { checkValid } = require("./helpers.js");


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

  test("toBinary", async () => {
    await checkValid(`util.dynamodb.toBinary("foo")`);
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
