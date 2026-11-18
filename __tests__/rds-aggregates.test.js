/* rds.agg aggregates, and the select clauses that use them: groupBy and having */

import { dirname, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
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

const evaluate = (expr) => `
  export function request(ctx) {
    return ${expr};
  }
  export function response(ctx) {}
`;

test("aggregate counts grouped by a column", async () => {
  await checkResolverValid(pg(`rds.select({
    table: "orders",
    columns: ["customer", { orders: rds.agg.count("*") }, { total: rds.agg.sum("price") }],
    where: { status: { eq: "PAID" } },
    groupBy: ["customer"],
    having: { price: { sum: { gt: 100 } } },
    orderBy: [{ column: "customer" }],
  })`), {}, "request");
});

test("agg imported by name", async () => {
  const code = `
    import { agg, select, createPgStatement } from '@aws-appsync/utils/rds';
    export function request(ctx) {
      return createPgStatement(select({ table: "t", columns: [agg.count("*")] }));
    }
    export function response(ctx) {}
  `;
  // a local run evaluates the code from a data URI, so the named import needs an absolute URL
  let resolverCode = code;
  if (process.env.TEST_TARGET !== "AWS_CLOUD") {
    const rdsModule = pathToFileURL(resolve(dirname(fileURLToPath(import.meta.url)), "../rds/index.js"));
    resolverCode = code.replace("'@aws-appsync/utils/rds'", `'${rdsModule}'`);
  }
  await checkResolverValid(resolverCode, {}, "request");
});

describe("aggregate columns", () => {
  test("every aggregate", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [
      rds.agg.max("a"), rds.agg.maxDistinct("a"), rds.agg.min("a"), rds.agg.minDistinct("a"),
      rds.agg.count("a"), rds.agg.countDistinct("a"), rds.agg.avg("a"), rds.agg.avgDistinct("a"),
      rds.agg.sum("a"), rds.agg.sumDistinct("a"),
    ] })`), {}, "request");
  });

  test("count of every row", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [rds.agg.count("*")] })`), {}, "request");
  });

  test("a qualified column", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [rds.agg.sumDistinct("x.y")] })`), {}, "request");
  });

  // only the bare star is special: a qualified one is quoted, even in a distinct aggregate
  test("a qualified star in a distinct count", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [rds.agg.countDistinct("t.*")] })`), {}, "request");
  });

  test("an aliased aggregate", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [{ m: rds.agg.max("a") }, "b"] })`), {}, "request");
  });

  test("an aliased aggregate in mysql", async () => {
    await checkResolverValid(mysql(`rds.select({ table: "t", columns: [{ m: rds.agg.avg("db.a") }] })`), {}, "request");
  });

  test("an aggregate in a subquery", async () => {
    await checkResolverValid(pg(`rds.select({ from: { s: rds.select({ table: "u", columns: [{ m: rds.agg.max("a") }], groupBy: ["b"] }) } })`), {}, "request");
  });

  // a nullish column renders an empty argument list rather than being rejected
  test("a null column", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [rds.agg.max(null)] })`), {}, "request");
  });

  test("an undefined column", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [rds.agg.max(undefined)] })`), {}, "request");
  });

  test("a null column in a distinct aggregate", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [rds.agg.countDistinct(null)] })`), {}, "request");
  });

  test("an empty column", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [rds.agg.countDistinct("")] })`), {}, "request");
  });

  // `using` shares the column list, aggregates included
  test("an aggregate in using", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", using: [rds.agg.max("a")] }] })`), {}, "request");
  });

  test("an aliased aggregate in using", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", using: [{ k: rds.agg.max("a") }] }] })`), {}, "request");
  });

  // returning refuses a bare aggregate, but an aliased one gets through
  test("an aliased aggregate in returning", async () => {
    await checkResolverValid(pg(`rds.remove({ table: "t", returning: [{ m: rds.agg.max("a") }] })`), {}, "request");
  });

  test("rejects an aggregate in returning", async () => {
    await checkResolverValid(pg(`rds.insert({ table: "t", values: { a: 1 }, returning: [rds.agg.max("a")] })`), {}, "request");
  });

  test("rejects an aggregate in returning in mysql", async () => {
    await checkResolverValid(mysql(`rds.insert({ table: "t", values: { a: 1 }, returning: [rds.agg.max("a")] })`), {}, "request");
  });
});

describe("aggregate arguments", () => {
  // the argument is validated when the aggregate is created, whether or not it is ever rendered
  test("rejects a missing argument", async () => {
    await checkResolverValid(evaluate(`rds.agg.max()`), {}, "request");
  });

  test("rejects a star in a distinct aggregate", async () => {
    await checkResolverValid(evaluate(`rds.agg.countDistinct("*")`), {}, "request");
  });

  test("rejects a star in an aggregate other than count", async () => {
    await checkResolverValid(evaluate(`rds.agg.sum("*")`), {}, "request");
  });

  test("rejects a star in a distinct aggregate other than count", async () => {
    await checkResolverValid(evaluate(`rds.agg.maxDistinct("*")`), {}, "request");
  });

  // AWS leaks the exception its own implementation raises for a non-string column
  test("rejects an integer", async () => {
    await checkResolverValid(evaluate(`rds.agg.max(-1)`), {}, "request");
  });

  test("rejects an integer beyond 32 bits", async () => {
    await checkResolverValid(evaluate(`rds.agg.max(3000000000)`), {}, "request");
  });

  test("rejects a fractional number", async () => {
    await checkResolverValid(evaluate(`rds.agg.max(1.5)`), {}, "request");
  });

  test("rejects a boolean", async () => {
    await checkResolverValid(evaluate(`rds.agg.max(true)`), {}, "request");
  });

  test("rejects an array", async () => {
    await checkResolverValid(evaluate(`rds.agg.max(["a"])`), {}, "request");
  });

  test("rejects an object", async () => {
    await checkResolverValid(evaluate(`rds.agg.max({ a: "b" })`), {}, "request");
  });

  test("rejects an aggregate as a statement", async () => {
    await checkResolverValid(pg(`rds.agg.max("a")`), {}, "request");
  });

  test("rejects an aggregate as a from source", async () => {
    await checkResolverValid(pg(`rds.select({ from: { s: rds.agg.max("a") } })`), {}, "request");
  });

  test("rejects an aggregate as an inserted value", async () => {
    await checkResolverValid(pg(`rds.insert({ table: "t", values: { a: rds.agg.max("a") } })`), {}, "request");
  });

  test("rejects an aggregate as a compared value", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { a: { eq: rds.agg.max("a") } } })`), {}, "request");
  });
});

describe("group by", () => {
  test("columns", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: ["a", { n: rds.agg.count("*") }], groupBy: ["a", "b.c"] })`), {}, "request");
  });

  // integers are column positions and render unquoted
  test("column positions", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: [1, "a", 0, -2, 2.0] })`), {}, "request");
  });

  // unlike in a column list, a star is quoted
  test("stars are quoted", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: ["*", "a.*"] })`), {}, "request");
  });

  test("in mysql", async () => {
    await checkResolverValid(mysql(`rds.select({ table: "t", groupBy: ["db.a", 2] })`), {}, "request");
  });

  test("a null group by renders nothing", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: null })`), {}, "request");
  });

  // only select knows the clause
  test("remove ignores group by", async () => {
    await checkResolverValid(pg(`rds.remove({ table: "t", groupBy: "x" })`), {}, "request");
  });

  test("insert ignores group by and having", async () => {
    await checkResolverValid(pg(`rds.insert({ table: "t", values: { a: 1 }, groupBy: "bad", having: "bad" })`), {}, "request");
  });

  test("rejects a string", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: "a" })`), {}, "request");
  });

  test("rejects an empty list", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: [] })`), {}, "request");
  });

  test("rejects a fractional number", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: [1.5] })`), {}, "request");
  });

  test("rejects an integer beyond 32 bits", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: [3000000000] })`), {}, "request");
  });

  test("rejects NaN", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: [NaN] })`), {}, "request");
  });

  test("rejects a boolean", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: [true] })`), {}, "request");
  });

  test("rejects null", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: [null] })`), {}, "request");
  });

  test("rejects an alias object", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: [{ a: "b" }] })`), {}, "request");
  });

  test("rejects an aggregate", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: [rds.agg.max("a")] })`), {}, "request");
  });

  // the clauses are validated in the order they render
  test("where is validated before group by", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: "x", groupBy: [] })`), {}, "request");
  });

  test("group by is validated before having", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: [], having: "x" })`), {}, "request");
  });
});

describe("having", () => {
  test("an aggregate condition", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: ["a"], groupBy: ["a"], having: { a: { count: { gt: 2 } } } })`), {}, "request");
  });

  test("max", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { max: { gt: 1, lt: 9 } } } })`), {}, "request");
  });

  test("min", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { min: { lt: 2 } } } })`), {}, "request");
  });

  test("avg", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { avg: { ge: 3 } } } })`), {}, "request");
  });

  test("sum", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { sum: { le: 4 } } } })`), {}, "request");
  });

  test("count", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { count: { eq: 5 } } } })`), {}, "request");
  });

  test("maxDistinct", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { maxDistinct: { ne: 6 } } } })`), {}, "request");
  });

  test("minDistinct", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { minDistinct: { eq: 7 } } } })`), {}, "request");
  });

  test("avgDistinct", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { avgDistinct: { eq: 8 } } } })`), {}, "request");
  });

  test("sumDistinct", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { sumDistinct: { eq: 9 } } } })`), {}, "request");
  });

  test("countDistinct", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { countDistinct: { eq: 10 } } } })`), {}, "request");
  });

  test("a count of every row", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { "*": { count: { gt: 1 } } } })`), {}, "request");
  });

  test("a qualified column", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { "x.y": { sum: { gt: 1 } } } })`), {}, "request");
  });

  test("a string value", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { max: { gt: "z" } } } })`), {}, "request");
  });

  test("a type hinted value", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { sum: { gt: rds.typeHint.DECIMAL("1.5") } } } })`), {}, "request");
  });

  // unlike a direct comparison, a nullish value is inlined
  test("a null value", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: ["a"], having: { a: { count: { gt: null } } } })`), {}, "request");
  });

  test("plain conditions alongside aggregate ones", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: ["a"], having: { a: { eq: "x" }, or: [{ b: { count: { gt: 1 } } }, { c: { size: { lt: 2 } } }] } })`), {}, "request");
  });

  test("plain and aggregate conditions on one column", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { count: { gt: 1 }, eq: "x", max: { lt: 3 } } } })`), {}, "request");
  });

  test("an and group", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { and: [{ a: { count: { gt: 1 } } }, { b: { sum: { lt: 2 } } }] } })`), {}, "request");
  });

  test("a sql template", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: ["a"], having: rds.sql\`count(*) > \${2}\` })`), {}, "request");
  });

  test("in mysql", async () => {
    await checkResolverValid(mysql(`rds.select({ table: "t", groupBy: ["db.a"], having: { "db.a": { count: { gt: 1 } } } })`), {}, "request");
  });

  // having renders after group by and before order by, and binds its variables in that order
  test("with every other select clause", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { w: { eq: "w" } }, groupBy: ["a"], having: { a: { count: { gt: "h" } } }, orderBy: [{ column: "a" }], limit: 1, offset: 2, leftJoin: [{ table: "u", on: rds.sql\`x = \${"j"}\` }] })`), {}, "request");
  });

  test("without a group by", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { count: { gt: 2 } } } })`), {}, "request");
  });

  test("an empty condition renders nothing", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: ["a"], having: {} })`), {}, "request");
  });

  test("an empty aggregate condition renders nothing", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: ["a"], having: { a: { count: {} } } })`), {}, "request");
  });

  test("a null having renders nothing", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: ["a"], having: null })`), {}, "request");
  });

  test("rejects a string", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: ["a"], having: "x" })`), {}, "request");
  });

  test("rejects an array", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: ["a"], having: [] })`), {}, "request");
  });

  // the typings allow between, but AWS refuses it
  test("rejects between", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { count: { between: [1, 2] } } } })`), {}, "request");
  });

  test("rejects a condition operator", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: ["a"], having: { a: { count: { contains: "x" } } } })`), {}, "request");
  });

  test("rejects a value that is not an object", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", groupBy: ["a"], having: { a: { count: 5 } } })`), {}, "request");
  });

  test("rejects a null aggregate condition", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { a: { count: null } } })`), {}, "request");
  });

  test("rejects a distinct count of every row", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { "*": { countDistinct: { gt: 1 } } } })`), {}, "request");
  });

  test("rejects a max of every row", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", having: { "*": { max: { gt: 1 } } } })`), {}, "request");
  });
});

describe("aggregate conditions outside having", () => {
  test("rejects one in where", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { a: { count: { gt: 2 } } } })`), {}, "request");
  });

  test("rejects one nested in where", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { or: [{ a: { count: { gt: 1 } } }] } })`), {}, "request");
  });

  // the clause is checked before the condition's shape
  test("rejects a malformed one in where", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { a: { count: "x" } } })`), {}, "request");
  });

  // but after its nullness
  test("rejects a null one in where", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", where: { a: { count: null } } })`), {}, "request");
  });

  test("rejects one in an update", async () => {
    await checkResolverValid(pg(`rds.update({ table: "t", values: { a: 1 }, where: { b: { max: { gt: 1 } } } })`), {}, "request");
  });

  test("rejects one in a remove", async () => {
    await checkResolverValid(pg(`rds.remove({ table: "t", where: { a: { avg: { gt: 1 } } } })`), {}, "request");
  });

  test("rejects one in on", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { a: { count: { gt: "x" } } } }] })`), {}, "request");
  });

  // ahead of on's own check that values are strings
  test("rejects one with a number in on", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { a: { count: { gt: 1 } } } }] })`), {}, "request");
  });
});
