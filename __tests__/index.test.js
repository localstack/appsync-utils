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

  test("authType", async () => {
    await checkValid(`util.authType()`);
  });
});

describe("time utilities", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("nowFormatted", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2021, 1, 1)).getTime());

    expect(util.time.nowFormatted('YYYY-MM-dd HH:mm:ss')).toEqual("2021-02-01T00:00:00.000Z");
  });
  test("nowISO8601", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2021, 1, 1)).getTime());

    expect(util.time.nowISO8601()).toEqual("2021-02-01T00:00:00.000Z");
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
    test("null", async () => {
      await checkValid(`util.dynamodb.toDynamoDB(null)`);
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
    test("fromS3ObjectJson", async () => {
      await checkValid(`util.dynamodb.fromS3ObjectJson('{"s3":{"key":"foo","bucket":"bar","region":"baz"}}')`);
    });
    test("fromS3ObjectJson with a version", async () => {
      await checkValid(`util.dynamodb.fromS3ObjectJson('{"s3":{"key":"foo","bucket":"bar","region":"baz","version":"beep"}}')`);
    });
  });
});

describe("DynamoDB module functions", () => {
  describe("get", () => {
    test("by key", async () => {
      await checkValid(`ddb.get({ key: { id: "id" }})`);
    });

    test("a consistent read of some attributes", async () => {
      await checkValid(`ddb.get({ key: { id: "1" }, consistentRead: true, projection: ["id", "a.b"] })`);
    });

    test("a projection reusing a path segment", async () => {
      await checkValid(`ddb.get({ key: { id: "1" }, projection: ["a.b", "a.c"] })`);
    });
  });

  describe("put", () => {
    test("an item", async () => {
      await checkValid(`ddb.put({ key: { id: "abc" }, item: { value: 10 }})`);
    });

    test("guarded by a condition", async () => {
      await checkValid(`ddb.put({ key: { id: "1" }, item: { v: 1 }, condition: { version: { eq: 1 } } })`);
    });

    // a condition that binds no value carries no expressionValues at all
    test("guarded by an attribute existing", async () => {
      await checkValid(`ddb.put({ key: { id: "1" }, item: { v: 1 }, condition: { v: { attributeExists: true } } })`);
    });

    test("versioned, with a custom partition key and index fields", async () => {
      await checkValid(`ddb.put({ key: { id: "1" }, item: { v: 1 }, _version: 3, customPartitionKey: "cpk", populateIndexFields: true })`);
    });
  });

  describe("remove", () => {
    test("by key", async () => {
      await checkValid(`ddb.remove({ key: { id: "test" } })`);
    });

    test("versioned and guarded by a condition", async () => {
      await checkValid(`ddb.remove({ key: { id: "1" }, _version: 2, condition: { a: { eq: 1 } } })`);
    });
  });

  describe("scan", () => {
    test("with a limit and a page token", async () => {
      await checkValid(`ddb.scan({ limit: 10, nextToken: "abc"})`);
    });

    test("with a filter and a projection", async () => {
      await checkValid(`ddb.scan({ limit: 2, filter: { a: { eq: 1 } }, projection: ["a"] })`);
    });

    test("of one segment of an index", async () => {
      await checkValid(`ddb.scan({ totalSegments: 4, segment: 1, index: "gsi", consistentRead: true })`);
    });

    test("without any arguments", async () => {
      await checkValid(`ddb.scan({})`);
    });
  });

  describe("query", () => {
    test("on a key", async () => {
      await checkValid(`ddb.query({ query: { id: { eq: "1" } } })`);
    });

    test("on a partition and a sort key", async () => {
      await checkValid(`ddb.query({ query: { a: { eq: "x" }, b: { beginsWith: "y" } } })`);
    });

    test("on a range of sort keys", async () => {
      await checkValid(`ddb.query({ query: { sk: { between: [1, 9] } } })`);
    });

    test("with every argument", async () => {
      await checkValid(`ddb.query({ query: { pk: { eq: "a" } }, index: "gsi1", limit: 5, nextToken: "t", consistentRead: true, scanIndexForward: false, select: "ALL_ATTRIBUTES", filter: { done: { eq: true } }, projection: ["id", "nested.field"] })`);
    });
  });

  describe("sync", () => {
    test("since the last one", async () => {
      await checkValid(`ddb.sync({ limit: 10, nextToken: "abc", lastSync: 1 })`);
    });

    test("of a delta index with a filter", async () => {
      await checkValid(`ddb.sync({ basePartitionKey: "bpk", deltaIndexName: "delta", limit: 5, lastSync: 2, filter: { a: { eq: 1 } } })`);
    });
  });

  describe("batch", () => {
    test("get", async () => {
      await checkValid(`ddb.batchGet({ tables: { post: { keys: [{ id: "1" }, { id: "2" }], consistentRead: false, projection: ["id", "name"] } } })`);
    });

    test("get without options", async () => {
      await checkValid(`ddb.batchGet({ tables: { post: { keys: [{ id: "1" }] } } })`);
    });

    test("put", async () => {
      await checkValid(`ddb.batchPut({ tables: { post: [{ id: "one", value: "x" }] } })`);
    });

    test("delete", async () => {
      await checkValid(`ddb.batchDelete({ tables: { post: [{ id: "one" }] } })`);
    });
  });

  describe("transact", () => {
    test("get", async () => {
      await checkValid(`ddb.transactGet({ items: [{ table: "post", key: { id: "1" }, projection: ["name"] }] })`);
    });

    test("get without a projection", async () => {
      await checkValid(`ddb.transactGet({ items: [{ table: "post", key: { id: "1" } }] })`);
    });

    test("write putting and deleting", async () => {
      await checkValid(`ddb.transactWrite({ items: [{ putItem: { table: "post", key: { id: "1" }, item: { a: 1 } } }, { deleteItem: { table: "post", key: { id: "2" }, condition: { v: { eq: 1 } } } }] })`);
    });

    test("write updating and checking a condition", async () => {
      await checkValid(`ddb.transactWrite({ items: [{ updateItem: { table: "t", key: { id: "1" }, update: { a: ddb.operations.increment(1) } } }, { conditionCheck: { table: "t", key: { id: "2" }, condition: { v: { eq: 1 } } } }] })`);
    });
  });

  describe("set helpers", () => {
    test("toStringSet", async () => {
      await checkValid(`ddb.toStringSet(["a", "b"])`);
    });

    // recorded unstringified, against what the type definitions describe
    test("toNumberSet", async () => {
      await checkValid(`ddb.toNumberSet([1, 2, 3])`);
    });

    test("toBinarySet", async () => {
      await checkValid(`ddb.toBinarySet(["SGVsbG8="])`);
    });
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

    test("increment by one when given no step", async () => {
      await checkValid(`ddb.update({ key: { id: "1" }, update: { a: ddb.operations.increment() } })`);
    });

    test("prepend", async () => {
      await checkValid(`ddb.update({ key: { id: "test" }, update: { values: ddb.operations.prepend([1, 2, 3]) } })`);
    });

    test("replace", async () => {
      await checkValid(`ddb.update({ key: { id: "test" }, update: { values: ddb.operations.replace({ a: 10 }) }})`);
    });

    test("remove", async () => {
      await checkValid(`ddb.update({ key: { id: "1" }, update: { addr: ddb.operations.remove() } })`);
    });

    test("a bare value sets the attribute", async () => {
      await checkValid(`ddb.update({ key: { id: "1" }, update: { isVerified: true } })`);
    });

    test("two attributes at once", async () => {
      await checkValid(`ddb.update({ key: { id: "1" }, update: { a: ddb.operations.increment(1), b: ddb.operations.replace("x") } })`);
    });

    test("two removals share one clause", async () => {
      await checkValid(`ddb.update({ key: { id: "1" }, update: { a: ddb.operations.remove(), b: ddb.operations.remove() } })`);
    });

    // the clauses are grouped by keyword, so the aliases are numbered in the order they come out
    // rather than the order they were written
    test("setting and removing together", async () => {
      await checkValid(`ddb.update({ key: { id: "1" }, update: { a: ddb.operations.increment(1), b: ddb.operations.remove() } })`);
    });

    test("removing written before setting", async () => {
      await checkValid(`ddb.update({ key: { id: "1" }, update: { b: ddb.operations.remove(), a: ddb.operations.increment(1) } })`);
    });

    test("an item of a list", async () => {
      await checkValid(`ddb.update({ key: { id: "1" }, update: { friends: [ddb.operations.updateListItem("x", 1)] } })`);
    });

    test("two items of one list share an alias", async () => {
      await checkValid(`ddb.update({ key: { id: "1" }, update: { f: [ddb.operations.updateListItem("x", 1), ddb.operations.updateListItem("y", 2)] } })`);
    });

    test("versioned and guarded by a condition", async () => {
      await checkValid(`ddb.update({ key: { id: "1" }, update: { a: ddb.operations.increment(1) }, condition: { b: { eq: 2 } }, _version: 5 })`);
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

  test("remove", async () => {
    await checkValid(`ddb.operations.remove()`);
  });

  // AWS answers an opaque value for this marker alone: it has no enumerable keys and serialises to
  // nothing, so the returned marker cannot be compared. What it builds is covered by the `update`
  // tests, which do match AWS.
  test.skip("updateListItem", async () => {
    await checkValid(`ddb.operations.updateListItem('foo', 1)`);
  });
});
