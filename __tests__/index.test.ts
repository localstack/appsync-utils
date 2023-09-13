/* 
  * Helpers definition from https://docs.aws.amazon.com/appsync/latest/devguide/dynamodb-helpers-in-util-dynamodb-js.html
*/

import { util } from '..';

describe("dynamodb helpers", () => {
  describe("toString", () => {
    test.each([
      ["foo", { S: "foo" }],
      [null, null],
    ])("input is %s", (test, expected) => {
      expect(util.dynamodb.toString(test)).toStrictEqual(expected);
    });
  });

  describe("toStringSet", () => {
    test.each([
      [["foo", "bar", "baz"], { SS: ["foo", "bar", "baz"] }],
      [null, null],
      [[], { SS: [] }],
    ])("input is %s", (test, expected) => {
      expect(util.dynamodb.toStringSet(test)).toStrictEqual(expected);
    });
  });

  test("toNumber", () => {
    expect(util.dynamodb.toNumber(12345)).toStrictEqual({ N: 12345 });
  });

  test("toNumberSet", () => {
    expect(util.dynamodb.toNumberSet([1, 23, 4.56])).toStrictEqual({ NS: [1, 23, 4.56] });
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
