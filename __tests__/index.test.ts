import { util } from '..';

describe("dynamodb helpers", () => {
  test("toString", () => {
    expect(util.dynamodb.toString("foo")).toStrictEqual({ S: "foo" });
  });

  test("toStringSet", () => {
    expect(util.dynamodb.toStringSet(["foo", "bar", "baz"])).toStrictEqual({ SS: ["foo", "bar", "baz"] });
  });
});
