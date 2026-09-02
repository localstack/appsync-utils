// `util.transform.toSubscriptionFilter` turns a filter into the form AppSync delivers subscriptions
// against: a list of groups, each an AND of individual filters, the groups themselves OR-ed. Every
// operator of a field, every member of an `or` and every rule is an alternative, so the groups
// multiply out. Unlike the DynamoDB transforms it answers an object rather than a JSON string.
import { checkValid } from "./helpers";

const subscriptionFilter = (...args) =>
  checkValid(`util.transform.toSubscriptionFilter(${args.join(", ")})`);

describe("subscription filters", () => {
  describe("a single group", () => {
    test("one operator on one field", async () => {
      await subscriptionFilter(`{ a: { eq: 1 } }`);
    });

    test("two fields are combined", async () => {
      await subscriptionFilter(`{ a: { eq: 1 }, b: { eq: 2 } }`);
    });

    test("an and combines its members", async () => {
      await subscriptionFilter(`{ and: [{ a: { eq: 1 } }, { b: { eq: 2 } }] }`);
    });

    test("a field beside an and", async () => {
      await subscriptionFilter(`{ z: { eq: 0 }, and: [{ a: { eq: 1 } }] }`);
    });

    test("a field path is kept as written", async () => {
      await subscriptionFilter(`{ "loc.addr.country": { eq: "USA" } }`);
    });
  });

  describe("alternatives multiply the groups out", () => {
    test("two operators on one field", async () => {
      await subscriptionFilter(`{ a: { eq: 1, ne: 2 } }`);
    });

    test("an or splits into a group per member", async () => {
      await subscriptionFilter(`{ or: [{ a: { eq: 1 } }, { b: { eq: 2 } }] }`);
    });

    test("an or nested in an and", async () => {
      await subscriptionFilter(`{ and: [{ a: { eq: 1 } }, { or: [{ b: { eq: 2 } }, { c: { eq: 3 } }] }] }`);
    });

    test("operators and groups together", async () => {
      await subscriptionFilter(
        `{ percentageUp: { lte: 50, gte: 20 }, and: [{ title: { ne: "Book1" } }, { downvotes: { gt: 2000 } }], or: [{ author: { eq: "Admin" } }, { isPublished: { eq: false } }] }`,
      );
    });
  });

  describe("operators are carried through as written", () => {
    test("the comparisons", async () => {
      await subscriptionFilter(`{ a: { le: 1 }, b: { lt: 2 }, c: { ge: 3 }, d: { gt: 4 } }`);
    });

    test("membership", async () => {
      await subscriptionFilter(`{ a: { in: [1, 2] }, b: { notIn: ["x"] } }`);
    });

    test("between", async () => {
      await subscriptionFilter(`{ a: { between: [1, 9] } }`);
    });

    test("the string operators", async () => {
      await subscriptionFilter(`{ a: { contains: "x" }, b: { notContains: "y" }, c: { beginsWith: "z" } }`);
    });

    test("containsAny", async () => {
      await subscriptionFilter(`{ a: { containsAny: ["x", "y"] } }`);
    });

    test("a boolean value", async () => {
      await subscriptionFilter(`{ a: { eq: false } }`);
    });

    // nothing validates the operator, so an unknown one is passed straight through
    test("an unknown operator", async () => {
      await subscriptionFilter(`{ a: { bogus: 1 } }`);
    });

    // `not` is not a negation here, unlike the DynamoDB filter object: it is read as a field name
    test("not is treated as a field", async () => {
      await subscriptionFilter(`{ not: { a: { eq: 1 } } }`);
    });
  });

  describe("ignored fields", () => {
    test("drop a field", async () => {
      await subscriptionFilter(`{ a: { eq: 1 }, b: { eq: 2 } }`, `["a"]`);
    });

    test("drop a field nested in an and", async () => {
      await subscriptionFilter(`{ a: { eq: 1 }, and: [{ b: { eq: 2 } }] }`, `["b"]`);
    });
  });

  describe("rules", () => {
    // at least one rule has to hold, so each is an alternative added to every group
    test("are added as alternatives", async () => {
      await subscriptionFilter(`{ a: { eq: 1 } }`, `[]`, `{ r1: { gte: 250 }, r2: { eq: "p" } }`);
    });

    test("on their own", async () => {
      await subscriptionFilter(`{}`, `[]`, `{ r1: { eq: 1 } }`);
    });
  });

  describe("filters that produce no group", () => {
    test("an empty filter", async () => {
      await subscriptionFilter(`{}`);
    });

    test("a field with no operator", async () => {
      await subscriptionFilter(`{ a: {} }`);
    });

    test("an empty and", async () => {
      await subscriptionFilter(`{ and: [] }`);
    });
  });

  describe("filters that cannot be read", () => {
    test("null", async () => {
      await subscriptionFilter(`null`);
    });

    test("no filter at all", async () => {
      await subscriptionFilter(``);
    });

    test("an array", async () => {
      await subscriptionFilter(`[]`);
    });

    // the documented client-side pattern passes `ctx.args.filter` straight in, but a JSON string
    // is not read as a filter
    test("a JSON string", async () => {
      await subscriptionFilter(`'{"a":{"eq":1}}'`);
    });
  });
});
