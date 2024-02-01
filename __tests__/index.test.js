/* 
  * Helpers definition from https://docs.aws.amazon.com/appsync/latest/devguide/dynamodb-helpers-in-util-dynamodb-js.html
*/

import { expect, jest, test } from '@jest/globals';

import { checkValid } from "./helpers.js";

import { util } from "..";


describe("general utilities", () => {
  test("autoId", async () => {
    // cannot test on AWS due to random nature
    expect(util.autoId()).toBeTruthy();
  });
});

describe("time utilities", () => {
  test("nowFormatted", async () => {
    // patch date utilities to ensure consistency
    const newDate = new Date(2021, 1, 1);
    const spied = jest.spyOn(global, 'Date').mockImplementation(() => newDate);

    // TODO: not strictly correct, but close
    expect(util.time.nowFormatted('YYYY-MM-dd HH:mm:ss')).toEqual("2021-02-01T00:00:00.000Z");
    spied.mockRestore();
  });
});

describe("dynamodb helpers", () => {
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

  test("scan", async () => {
    await checkValid(`ddb.scan({ limit: 10, nextToken: "abc"})`);
  });

  // Not implemented on AWS
  // Error: code.js(5,14): error TS2339: Property 'sync' does not exist on type 'typeof import("/var/task/node_modules/@amzn/awsapp-sync-jsvtltranspiler/bundled/@aws-appsync/utils/lib/dynamo-db-helpers")'.
  test.skip("sync", async () => {
    await checkValid(`ddb.sync({ limit: 10, nextToken: "abc", lastSync: 1 })`);
  });

  describe("update", () => {
    test("add", async () => {
      await checkValid(`ddb.update({ key: { id: "test" }, update: { age: ddb.operations.add(10), } })`);
    });

    test("append", async () => {
      await checkValid(`ddb.update({ key: { id: "test" }, update: { values: ddb.operations.append([1, 2, 3]), } })`);
    });

    test("decrement", async () => {
      await checkValid(`ddb.update({ key: { id: "test" }, update: { age: ddb.operations.decrement(10) } })`);
    });

    test("increment", async () => {
      await checkValid(`ddb.update({ key: { id: "test" }, update: { age: ddb.operations.increment(10) } })`);
    });

    test("prepend", async () => {
      await checkValid(`ddb.update({ key: { id: "test" }, update: { values: ddb.operations.prepend([1, 2, 3]) } })`);
    });

    test("replace", async () => {
      await checkValid(`ddb.update({ key: { id: "test" }, update: { values: ddb.operations.replace({ a: 10 }) }})`);
    });
  });
})

describe("Transformations", () => {
  test("toDynamoDBFilterMap", async () => {
    await checkValid(`util.transform.toDynamoDBFilterExpression({ "title":{ "contains":"Hello World" } })`);
  });

  test("toDynamoDBConditionExpression", async () => {
    // attribute keys are not guaranteed to be ordered
    const postProcess = (result) => {

      const sortObjectByKeys = (obj) => {
        return Object.keys(obj).sort().reduce(
          (res, key) => {
            res[key] = obj[key];
            return res;
          },
          {}
        );
      };

      const { expression, expressionNames, expressionValues } = JSON.parse(result);
      const transformed = {
        expression,
        expressionNames: sortObjectByKeys(expressionNames),
        expressionValues: sortObjectByKeys(expressionValues),
      };
      return JSON.stringify(transformed);
    };
    await checkValid(`util.transform.toDynamoDBConditionExpression({
      id: { attributeExists: true },
      version: { eq: 10 },
    })`, {}, postProcess);
  });
});

describe("DynamoDB operations", () => {
  test("add", async () => {
    await checkValid(`ddb.operations.add(10)`);
  });

  test("append", async () => {
    await checkValid(`ddb.operations.append([1, 2, 3])`);
  });

  test("decrement", async () => {
    await checkValid(`ddb.operations.decrement(10)`);
  });

  test("increment", async () => {
    await checkValid(`ddb.operations.increment(10)`);
  });

  test("prepend", async () => {
    await checkValid(`ddb.operations.prepend([1, 2, 3])`);
  });

  test("replace", async () => {
    await checkValid(`ddb.operations.replace({ a: 10 })`);
  });

  // not implemented currently
  test.skip("updateListItem", async () => {
    await checkValid(`ddb.operations.updateListItem('foo', 1)`);
  });
});
