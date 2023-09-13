import { util } from '..';

describe("dynamodb helpers", () => {
  test("toString", () => {
    expect(util.dynamodb.toString("foo")).toStrictEqual({ S: "foo" });
  });

  test("toStringSet", () => {
    expect(util.dynamodb.toStringSet(["foo", "bar", "baz"])).toStrictEqual({ SS: ["foo", "bar", "baz"] });
  });

  test.skip("toNumber", () => {
    expect(util.dynamodb.toNumber(12345)).toStrictEqual({ N: 12345 });
  });

  test.skip("toNumberSet", () => {
    expect(util.dynamodb.toNumberSet([1, 23, 4.56])).toStrictEqual({ NS: [1, 23, 4.56] });
  });
});
