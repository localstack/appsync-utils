import { util } from '..';

describe("dynamodb helpers", () => {
  describe("toString", () => {
    test.each([
      ["foo", { S: "foo" }],
    ])("input is %s", (test, expected) => {
      expect(util.dynamodb.toString(test)).toStrictEqual(expected);
    });
  });

  describe("toStringSet", () => {
    test.each([
      [[ "foo", "bar", "baz" ], { SS: [ "foo", "bar", "baz" ] }],
    ])("input is %s", (test, expected) => {
      expect(util.dynamodb.toStringSet(test)).toStrictEqual(expected);
    });
  });
});
