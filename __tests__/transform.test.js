// `util.transform` turns a filter object into a DynamoDB expression. Both entry points produced
// byte identical output for every input recorded from AWS, so most cases below go through
// `toDynamoDBFilterExpression` and a separate block covers the two agreeing.
//
// AWS orders the keys of `expressionNames` and `expressionValues` by nothing in particular, and not
// even consistently between runs, so these tests parse the result before snapshotting; jest then
// serialises the keys in sorted order. The `expression` string itself is compared verbatim, and the
// two cases under "the shape of the result" keep the raw string to pin the serialisation.
import { checkValid } from "./helpers";

const parsed = (result) => JSON.parse(result);

const filter = (source) => checkValid(`util.transform.toDynamoDBFilterExpression(${source})`, {}, parsed);
const condition = (source) => checkValid(`util.transform.toDynamoDBConditionExpression(${source})`, {}, parsed);
// AWS answers a filter it cannot render with `null` rather than with an error
const rejected = (source) => checkValid(`util.transform.toDynamoDBFilterExpression(${source})`);

describe("DynamoDB expression transforms", () => {
  describe("the shape of the result", () => {
    test("a filter expression is a JSON string", async () => {
      await checkValid(`util.transform.toDynamoDBFilterExpression({ content: { contains: "foo" } })`);
    });

    test("a condition expression is a JSON string", async () => {
      await checkValid(`util.transform.toDynamoDBConditionExpression({ and: [{ id: { attributeExists: false } }] })`);
    });
  });

  describe("comparison operators", () => {
    test("eq", async () => await filter(`{ v: { eq: "x" } }`));
    test("ne", async () => await filter(`{ v: { ne: "x" } }`));
    test("lt", async () => await filter(`{ v: { lt: "x" } }`));
    test("le", async () => await filter(`{ v: { le: "x" } }`));
    test("gt", async () => await filter(`{ v: { gt: "x" } }`));
    test("ge", async () => await filter(`{ v: { ge: "x" } }`));
  });

  describe("the type of an operand", () => {
    test("a number keeps its numeric type", async () => await filter(`{ v: { eq: 10 } }`));
    test("a fractional number", async () => await filter(`{ v: { eq: 1.5 } }`));
    test("a boolean", async () => await filter(`{ v: { eq: true } }`));
    test("null", async () => await filter(`{ v: { eq: null } }`));
    test("an object", async () => await filter(`{ v: { eq: { a: 1 } } }`));
    test("a list", async () => await filter(`{ v: { eq: [1, 2] } }`));
  });

  describe("function operators", () => {
    test("contains leaves no space after the comma", async () => await filter(`{ v: { contains: "x" } }`));
    test("notContains", async () => await filter(`{ v: { notContains: "x" } }`));
    test("beginsWith", async () => await filter(`{ v: { beginsWith: "x" } }`));
  });

  describe("between", () => {
    test("names its bounds start and end", async () => await filter(`{ v: { between: ["1", "9"] } }`));
    test("numeric bounds", async () => await filter(`{ v: { between: [1, 9] } }`));
    test("ignores anything past the second bound", async () => await filter(`{ v: { between: ["1", "9", "3"] } }`));
  });

  describe("in", () => {
    test("separates its values with a comma and a space", async () => await filter(`{ v: { in: ["a", "b"] } }`));
    test("a single value", async () => await filter(`{ v: { in: ["a"] } }`));
  });

  describe("attributeExists", () => {
    test("true asks whether the attribute exists", async () => await filter(`{ v: { attributeExists: true } }`));
    test("false asks whether it does not", async () => await filter(`{ v: { attributeExists: false } }`));
  });

  describe("attributeType", () => {
    test("every friendly type name becomes its DynamoDB type code", async () => {
      await filter(`{
        a: { attributeType: "_null" },
        b: { attributeType: "string" },
        c: { attributeType: "stringSet" },
        d: { attributeType: "number" },
        e: { attributeType: "numberSet" },
        f: { attributeType: "binary" },
        g: { attributeType: "binarySet" },
        h: { attributeType: "boolean" },
        i: { attributeType: "list" },
        j: { attributeType: "map" },
      }`);
    });
  });

  describe("size", () => {
    test("compares the size of the attribute", async () => await filter(`{ v: { size: { gt: 2 } } }`));
    test("combines with a range", async () => await filter(`{ v: { size: { between: [1, 3] } } }`));
    test("combines with a function", async () => await filter(`{ v: { size: { contains: "x" } } }`));
    test("combines with attributeExists", async () => await filter(`{ v: { size: { attributeExists: true } } }`));
    test("two comparisons on one size", async () => await filter(`{ v: { size: { gt: 2, lt: 5 } } }`));
    test("nesting size names the value again without nesting the call", async () => {
      await filter(`{ v: { size: { size: { gt: 1 } } } }`);
    });
  });

  describe("grouping", () => {
    test("two fields at the top level are joined without being wrapped", async () => {
      await filter(`{ a: { eq: 1 }, b: { eq: 2 } }`);
    });

    test("a field carrying two operators is wrapped", async () => await filter(`{ v: { ge: 1, le: 5 } }`));

    test("an and of one member is not wrapped", async () => await filter(`{ and: [{ a: { eq: 1 } }] }`));

    test("an and of two members is wrapped", async () => {
      await filter(`{ and: [{ a: { eq: 1 } }, { b: { eq: 2 } }] }`);
    });

    test("an or of two members", async () => await filter(`{ or: [{ a: { eq: 1 } }, { b: { eq: 2 } }] }`));

    test("not of a single comparison", async () => await filter(`{ not: { a: { eq: 1 } } }`));

    test("not of a group", async () => await filter(`{ not: { and: [{ a: { eq: 1 } }, { b: { eq: 2 } }] } }`));

    test("not of a not", async () => await filter(`{ not: { not: { a: { eq: 1 } } } }`));

    test("not inside an and", async () => await filter(`{ and: [{ not: { a: { eq: 1 } } }, { b: { eq: 2 } }] }`));

    test("an and inside an or", async () => {
      await filter(`{ or: [{ and: [{ a: { eq: 1 } }, { b: { eq: 2 } }] }, { c: { eq: 3 } }] }`);
    });

    test("an or inside an and", async () => {
      await filter(`{ and: [{ or: [{ a: { eq: 1 } }, { b: { eq: 2 } }] }, { c: { eq: 3 } }] }`);
    });

    test("value names carry every level of the nesting", async () => {
      await filter(`{ and: [{ or: [{ and: [{ a: { eq: 1 } }] }] }] }`);
    });

    test("a field beside a group", async () => await filter(`{ a: { eq: 1 }, and: [{ b: { eq: 2 } }] }`));

    test("a field name is used verbatim, dots included", async () => await filter(`{ "a.b": { eq: 1 } }`));
  });

  describe("filters that render no expression", () => {
    test("an empty filter", async () => await filter(`{}`));

    test("an empty group", async () => await filter(`{ and: [] }`));

    test("a field without operators keeps its name", async () => await filter(`{ v: {} }`));

    test("a size without operators keeps the name of its field", async () => await filter(`{ v: { size: {} } }`));

    test("not of an empty filter", async () => await filter(`{ not: {} }`));

    test("an empty list of values", async () => await filter(`{ v: { in: [] } }`));

    // an empty member is joined like any other, which leaves the joiner with nothing after it
    test("an empty field beside a comparison leaves a dangling joiner", async () => {
      await filter(`{ a: { eq: 1 }, b: {} }`);
    });

    test("an empty member of a group leaves a dangling joiner", async () => {
      await filter(`{ and: [{ a: { eq: 1 } }, {}] }`);
    });
  });

  describe("filters that cannot be rendered", () => {
    test("no filter at all", async () => await rejected(``));
    test("null", async () => await rejected(`null`));
    test("an array", async () => await rejected(`[]`));
    test("a string", async () => await rejected(`"string"`));
    test("an unknown operator", async () => await rejected(`{ v: { foo: 1 } }`));
    test("a field holding a value instead of operators", async () => await rejected(`{ v: "x" }`));
    test("a field nested in a field", async () => await rejected(`{ a: { b: { eq: 1 } } }`));
    test("an and given a map instead of a list", async () => await rejected(`{ and: { a: { eq: 1 } } }`));
    test("an and given null", async () => await rejected(`{ and: null }`));
    test("a group holding a null member", async () => await rejected(`{ and: [{ a: { eq: 1 } }, null] }`));
    test("a not given a list", async () => await rejected(`{ not: [{ a: { eq: 1 } }] }`));
    test("a range with a single bound", async () => await rejected(`{ v: { between: [1] } }`));
    test("a range that is not a list", async () => await rejected(`{ v: { between: "x" } }`));
    test("a list of values that is not a list", async () => await rejected(`{ v: { in: "x" } }`));
    test("attributeExists given something other than a boolean", async () => await rejected(`{ v: { attributeExists: "yes" } }`));
    test("attributeType given a type code instead of a type name", async () => await rejected(`{ v: { attributeType: "S" } }`));
    test("attributeType given an unknown name", async () => await rejected(`{ v: { attributeType: "bogus" } }`));
    test("size given a value instead of operators", async () => await rejected(`{ v: { size: 3 } }`));
  });

  describe("both entry points render a filter the same way", () => {
    const SHAPES = {
      "a comparison": `{ content: { eq: "x" } }`,
      "a group of two members": `{ and: [{ content: { eq: "x" } }, { version: { attributeExists: true } }] }`,
      "a negated range": `{ not: { id: { between: ["1", "9"] } } }`,
    };

    for (const [name, source] of Object.entries(SHAPES)) {
      test(`${name} as a filter`, async () => await filter(source));
      test(`${name} as a condition`, async () => await condition(source));
    }
  });

  // the write conditions and list filter the Amplify GraphQL transformer generates for a model
  describe("Amplify model operations", () => {
    test("the condition guarding a create", async () => {
      await condition(`{ and: [{ id: { attributeExists: false } }] }`);
    });

    test("the condition guarding an update", async () => {
      await condition(`{ and: [{ id: { attributeExists: true } }, { _version: { eq: 1 } }] }`);
    });

    test("a list filter matching content", async () => {
      await filter(`{ content: { contains: "foo" } }`);
    });

    test("a list filter combining content and a flag", async () => {
      await filter(`{ and: [{ content: { contains: "a" } }, { done: { eq: true } }] }`);
    });

    test("a list filter combining a prefix and a range", async () => {
      await filter(`{ or: [{ content: { beginsWith: "a" } }, { id: { between: ["1", "9"] } }] }`);
    });
  });
});
