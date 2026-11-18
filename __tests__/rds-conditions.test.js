/* rds condition objects: not groups, the logical keys' casing and multi-column group items */

import { checkResolverValid } from "./helpers";

const pg = (expr) => `
  export function request(ctx) {
    return rds.createPgStatement(${expr});
  }
  export function response(ctx) {}
`;

const mysql = (expr) => `
  export function request(ctx) {
    return rds.createMySQLStatement(${expr});
  }
  export function response(ctx) {}
`;

describe("not", () => {
  test("a single condition", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: [{ a: { eq: 1 } }] } })`), {}, "request");
  });

  // the negated items are ANDed together
  test("several conditions", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: [{ a: { eq: 1 } }, { b: { gt: 2 } }] } })`), {}, "request");
  });

  test("an item with several columns", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: [{ a: { eq: 1 }, b: { gt: 2 } }] } })`), {}, "request");
  });

  test("an item with several conditions on one column", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: [{ a: { gt: 1, lt: 5 } }] } })`), {}, "request");
  });

  test("attributeExists, size and between", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: [{ a: { attributeExists: true } }, { b: { size: { gt: 1 } } }, { c: { between: [1, 2] } }] } })`), {}, "request");
  });

  // variables are numbered in key order
  test("between sibling conditions", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { x: { eq: "first" }, not: [{ a: { eq: "second" } }], y: { eq: "third" } } })`), {}, "request");
  });

  test("after an or group", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { or: [{ a: { eq: 1 } }, { b: { eq: 2 } }], not: [{ c: { eq: 3 } }] } })`), {}, "request");
  });

  test("nested in an or group", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { or: [{ not: [{ a: { eq: 1 } }] }, { b: { eq: 2 } }] } })`), {}, "request");
  });

  test("nested in an and group", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { and: [{ not: [{ a: { eq: 1 } }, { b: { eq: 2 } }] }] } })`), {}, "request");
  });

  test("holding an or group", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: [{ or: [{ a: { eq: 1 } }, { b: { eq: 2 } }] }] } })`), {}, "request");
  });

  test("a not inside a not", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: [{ not: [{ a: { eq: 1 } }] }] } })`), {}, "request");
  });

  // unlike an empty and/or, an empty not still renders, leaving SQL the engine rejects
  test("an empty not", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: [] } })`), {}, "request");
  });

  test("an empty not beside a condition", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: [], a: { eq: 1 } } })`), {}, "request");
  });

  test("an empty item", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: [{}] } })`), {}, "request");
  });

  test("an empty item beside a condition", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: [{}, { a: { eq: 1 } }] } })`), {}, "request");
  });

  test("in an update", async () => {
    await checkResolverValid(pg(`rds.update({ table: "t", values: { a: 1 }, where: { not: [{ b: { eq: 2 } }] } })`), {}, "request");
  });

  test("in a remove in mysql", async () => {
    await checkResolverValid(mysql(`rds.remove({ table: "t", where: { not: [{ b: { eq: 2 } }] } })`), {}, "request");
  });

  test("in on", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { not: [{ a: { eq: "b" } }] } }] })`), {}, "request");
  });

  test("an empty not in on", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { not: [] } }] })`), {}, "request");
  });

  test("in having", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: ["a"], having: { not: [{ a: { count: { gt: 1 } } }] } })`), {}, "request");
  });

  // the clause rules reach into the group
  test("rejects a number in on", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { not: [{ a: { eq: 1 } }] } }] })`), {}, "request");
  });

  test("rejects an aggregate in where", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: [{ a: { count: { gt: 1 } } }] } })`), {}, "request");
  });

  test("rejects an object", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: { a: { eq: 1 } } } })`), {}, "request");
  });

  test("rejects null", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: null } })`), {}, "request");
  });

  test("rejects a string item", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: ["x"] } })`), {}, "request");
  });

  test("rejects a null item", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: [null] } })`), {}, "request");
  });

  test("rejects a sql template item", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { not: [rds.sql\`a = \${1}\`] } })`), {}, "request");
  });
});

// AWS matches and/or/not in any casing, and names the key as written in its messages
describe("logical key casing", () => {
  test("upper case not", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { NOT: [{ a: { eq: 1 } }] } })`), {}, "request");
  });

  test("upper case or", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { OR: [{ a: { eq: 1 } }, { b: { eq: 2 } }] } })`), {}, "request");
  });

  test("mixed case and", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { And: [{ a: { eq: 1 } }, { b: { eq: 2 } }] } })`), {}, "request");
  });

  test("rejects an upper case not that is not an array", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { NOT: {} } })`), {}, "request");
  });

  test("rejects an upper case or that is not an array", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { OR: {} } })`), {}, "request");
  });

  test("rejects a string item in an upper case or", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { OR: ["x"] } })`), {}, "request");
  });

  // the operators are not case-insensitive
  test("rejects an upper case operator", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { a: { EQ: 1 } } })`), {}, "request");
  });

  test("rejects an upper case aggregate", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { COUNT: { GT: 1 } } } })`), {}, "request");
  });
});

// an item's columns are ANDed together and the item is grouped as a whole, whatever group it is in
describe("group items with several columns", () => {
  test("in an and group", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { and: [{ a: { eq: 1 }, b: { gt: 2 } }] } })`), {}, "request");
  });

  test("in an or group", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { or: [{ a: { eq: 1 }, b: { gt: 2 } }, { c: { eq: 3 } }] } })`), {}, "request");
  });

  test("an empty item in an and group", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { and: [{}, { a: { eq: 1 } }] } })`), {}, "request");
  });
});
