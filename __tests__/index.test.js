/* 
  * Helpers definition from https://docs.aws.amazon.com/appsync/latest/devguide/dynamodb-helpers-in-util-dynamodb-js.html
*/

import { checkValid } from "./helpers.js";

import { util } from "..";

describe("general utilities", () => {
  test("autoId", async () => {
    // cannot test on AWS due to random nature
    expect(util.autoId()).toBeTruthy();
  });
});

describe.skip("dynamodb helpers", () => {
  describe("toDynamoDB", () => {
    test("string", async () => {
      await checkValid(`util.dynamodb.toDynamoDB("test")`);
    });
    test("number", async () => {
      await checkValid(`util.dynamodb.toDynamoDB(12345)`);
    });
    test("boolean", async () => {
      await checkValid(`util.dynamodb.toDynamoDB(true)`);
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

  test("toBinarySet", async () => {
    await checkValid(`util.dynamodb.toBinarySet(["foo", "bar", "baz"])`);
  });

  test("toBoolean", async () => {
    await checkValid(`util.dynamodb.toBoolean(true)`);
  });

  test("toNull", async () => {
    await checkValid(`util.dynamodb.toNull()`);
  });

  test("toList", async () => {
    await checkValid(`util.dynamodb.toList(["foo", 123, {bar: "baz" }])`);
  });

  test("toMap", async () => {
    await checkValid(`util.dynamodb.toMap({ "foo": "bar", "baz": 1234, "beep": ["boop"] })`);
  });

  test("toMapValues", async () => {
    await checkValid(`util.dynamodb.toMapValues({ "foo": "bar", "baz": 1234, "beep": ["boop"] })`);
  });

  describe("s3 objects", () => {
    test("three parameter function", async () => {
      await checkValid(`util.dynamodb.toS3Object("foo", "bar", "baz")`);
    });
    test("four parameter function", async () => {
      await checkValid(`util.dynamodb.toS3Object("foo", "bar", "baz", "beep")`);
    });
    test.skip("fromS3ObjectJson", async () => {
      await checkValid(`util.dynamodb.fromS3ObjectJson({ "S" : "{ \"s3\" : { \"key\" : \"foo\", \"bucket\" : \"bar\", \"region\" : \"baz\", \"version\" = \"beep\" } }" })`);
    });
  });
});

describe("DynamoDB module functions", () => {
  test("get", async () => {
    await checkValid(`ddb.get({ key: { id: "id" }})`);
  });

  test("put", async () => {
    await checkValid(`ddb.put({ key: { id: "abc" }, item: { value: 10 }})`);
  });

  test("remove", async () => {
    await checkValid(`ddb.remove({ key: { id: "test" } })`);
  });
})
