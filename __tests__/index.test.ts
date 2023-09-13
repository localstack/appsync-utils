import { util } from '..';

describe("dynamodb helpers", () => {
  test('toString', () => {
    expect(util.dynamodb.toString("test")).toStrictEqual({ S: "test" });
  });
});
