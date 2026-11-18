/* rds.select() column aliases, subquery `from` sources and joins */

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

// a subquery source, an aliased column and a join used together, the way a resolver combines them
test("subquery source with aliased columns and a left join", async () => {
  await checkResolverValid(pg(`rds.select({
    from: { item: rds.select({ table: "item", columns: ["sys_i", "name"], where: { name: { eq: "x" } } }) },
    columns: [{ sys_i: "item.sys_i" }, "item.name", { st: "s.label" }],
    leftJoin: [{ table: { s: "domain.status" }, on: rds.sql\`s.id = item.status_id AND s.kind = \${"k"}\` }],
    where: { "item.name": { ne: "y" } },
  })`), {}, "request");
});

describe("column aliases", () => {
  // like a table alias, the key is the alias and the value is the column
  test("aliased columns", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [{ a: "b" }, { c: "x.y" }, "plain"] })`), {}, "request");
  });

  test("an aliased star is quoted", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [{ a: "*" }] })`), {}, "request");
  });

  test("aliased columns in mysql", async () => {
    await checkResolverValid(mysql(`rds.select({ table: "t", columns: [{ x: "db.a" }] })`), {}, "request");
  });

  // `returning` shares the column list rules
  test("aliased returning columns", async () => {
    await checkResolverValid(pg(`rds.insert({ table: "t", values: { a: 1 }, returning: [{ x: "a" }, "b"] })`), {}, "request");
  });

  test("rejects an alias with two entries", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [{ a: "b", c: "d" }] })`), {}, "request");
  });

  test("rejects an empty alias", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [{}] })`), {}, "request");
  });

  test("rejects a number as the aliased column", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [{ a: 5 }] })`), {}, "request");
  });

  test("rejects null as the aliased column", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [{ a: null }] })`), {}, "request");
  });

  // unlike a `from` alias, a column alias takes no statement
  test("rejects a sql template as the aliased column", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [{ n: rds.sql\`count(\${1})\` }] })`), {}, "request");
  });

  test("rejects a select as the aliased column", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [{ n: rds.select({ table: "u" }) }] })`), {}, "request");
  });

  test("rejects an array in the column list", async () => {
    await checkResolverValid(pg(`rds.select({ table: "t", columns: [["a"]] })`), {}, "request");
  });
});

describe("subquery sources", () => {
  test("from a select", async () => {
    await checkResolverValid(pg(`rds.select({ from: { sub: rds.select({ table: "u", where: { id: { eq: 1 } } }) }, where: { id: { gt: 2 } } })`), {}, "request");
  });

  // the subquery's variables are numbered first, before the outer statement's
  test("from a select with its own limit", async () => {
    await checkResolverValid(pg(`rds.select({ from: { s: rds.select({ table: "u", where: { a: { eq: "inner" } }, limit: 2 }) }, where: { b: { eq: "outer" } }, limit: 9 })`), {}, "request");
  });

  test("from a sql template", async () => {
    await checkResolverValid(pg(`rds.select({ from: { sub: rds.sql\`select * from u where id = \${1}\` } })`), {}, "request");
  });

  test("from a sql template with type hints", async () => {
    await checkResolverValid(pg(`rds.select({ from: { s: rds.sql\`select \${rds.typeHint.UUID("a")}\` }, where: { x: { eq: rds.typeHint.UUID("b") } } })`), {}, "request");
  });

  test("from a nested subquery", async () => {
    await checkResolverValid(pg(`rds.select({ from: { a: rds.select({ from: { b: rds.select({ table: "c" }) } }) } })`), {}, "request");
  });

  test("from a select in mysql", async () => {
    await checkResolverValid(mysql(`rds.select({ from: { s: rds.select({ table: "db.u" }) } })`), {}, "request");
  });

  // a statement is only accepted under an alias
  test("rejects a bare select as from", async () => {
    await checkResolverValid(pg(`rds.select({ from: rds.select({ table: "u" }) })`), {}, "request");
  });

  test("rejects a bare sql template as from", async () => {
    await checkResolverValid(pg(`rds.select({ from: rds.sql\`u\` })`), {}, "request");
  });

  test("rejects an insert as the from source", async () => {
    await checkResolverValid(pg(`rds.select({ from: { s: rds.insert({ table: "u", values: { a: 1 } }) } })`), {}, "request");
  });

  test("rejects a number as the from source", async () => {
    await checkResolverValid(pg(`rds.select({ from: { s: 5 } })`), {}, "request");
  });

  // `table` keeps accepting only a string, in select as in the other statements
  test("rejects a select as the table alias value", async () => {
    await checkResolverValid(pg(`rds.select({ table: { sub: rds.select({ table: "u" }) } })`), {}, "request");
  });

  test("rejects a select as the table alias value in insert", async () => {
    await checkResolverValid(pg(`rds.insert({ table: { sub: rds.select({ table: "u" }) }, values: { a: 1 } })`), {}, "request");
  });
});

describe("joins", () => {
  describe("join kinds", () => {
    test("join", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", join: [{ table: "u", on: rds.sql\`t.id = u.tid\` }] })`), {}, "request");
    });

    test("innerJoin", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", innerJoin: [{ table: "u" }] })`), {}, "request");
    });

    test("leftJoin", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u" }] })`), {}, "request");
    });

    test("leftOuterJoin", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftOuterJoin: [{ table: "u" }] })`), {}, "request");
    });

    test("rightJoin", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", rightJoin: [{ table: "u" }] })`), {}, "request");
    });

    test("rightOuterJoin", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", rightOuterJoin: [{ table: "u" }] })`), {}, "request");
    });

    test("fullOuterJoin", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", fullOuterJoin: [{ table: "u" }] })`), {}, "request");
    });

    test("crossJoin", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", crossJoin: [{ table: "u" }] })`), {}, "request");
    });

    test("joinNatural", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", joinNatural: [{ table: "u" }] })`), {}, "request");
    });

    test("innerJoinNatural", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", innerJoinNatural: [{ table: "u" }] })`), {}, "request");
    });

    test("leftJoinNatural", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoinNatural: [{ table: "u" }] })`), {}, "request");
    });

    test("leftOuterJoinNatural", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftOuterJoinNatural: [{ table: "u" }] })`), {}, "request");
    });

    test("rightJoinNatural", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", rightJoinNatural: [{ table: "u" }] })`), {}, "request");
    });

    test("rightOuterJoinNatural", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", rightOuterJoinNatural: [{ table: "u" }] })`), {}, "request");
    });

    test("fullOuterJoinNatural", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", fullOuterJoinNatural: [{ table: "u" }] })`), {}, "request");
    });
  });

  // a select applies a single join kind: the first one present in a fixed order, whatever order
  // the keys were written in. AWS interleaves the natural kinds with the plain ones, so each test
  // pins one adjacent pair of that order, writing the losing key first.
  describe("join kind precedence", () => {
    test("join wins over joinNatural", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", joinNatural: [{ table: "joinNatural" }], join: [{ table: "join" }] })`), {}, "request");
    });

    test("joinNatural wins over innerJoinNatural", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", innerJoinNatural: [{ table: "innerJoinNatural" }], joinNatural: [{ table: "joinNatural" }] })`), {}, "request");
    });

    test("innerJoinNatural wins over innerJoin", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", innerJoin: [{ table: "innerJoin" }], innerJoinNatural: [{ table: "innerJoinNatural" }] })`), {}, "request");
    });

    test("innerJoin wins over crossJoin", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", crossJoin: [{ table: "crossJoin" }], innerJoin: [{ table: "innerJoin" }] })`), {}, "request");
    });

    test("crossJoin wins over leftJoin", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "leftJoin" }], crossJoin: [{ table: "crossJoin" }] })`), {}, "request");
    });

    test("leftJoin wins over leftJoinNatural", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoinNatural: [{ table: "leftJoinNatural" }], leftJoin: [{ table: "leftJoin" }] })`), {}, "request");
    });

    test("leftJoinNatural wins over leftOuterJoin", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftOuterJoin: [{ table: "leftOuterJoin" }], leftJoinNatural: [{ table: "leftJoinNatural" }] })`), {}, "request");
    });

    test("leftOuterJoin wins over leftOuterJoinNatural", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftOuterJoinNatural: [{ table: "leftOuterJoinNatural" }], leftOuterJoin: [{ table: "leftOuterJoin" }] })`), {}, "request");
    });

    test("leftOuterJoinNatural wins over rightJoin", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", rightJoin: [{ table: "rightJoin" }], leftOuterJoinNatural: [{ table: "leftOuterJoinNatural" }] })`), {}, "request");
    });

    test("rightJoin wins over rightJoinNatural", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", rightJoinNatural: [{ table: "rightJoinNatural" }], rightJoin: [{ table: "rightJoin" }] })`), {}, "request");
    });

    test("rightJoinNatural wins over rightOuterJoin", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", rightOuterJoin: [{ table: "rightOuterJoin" }], rightJoinNatural: [{ table: "rightJoinNatural" }] })`), {}, "request");
    });

    test("rightOuterJoin wins over rightOuterJoinNatural", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", rightOuterJoinNatural: [{ table: "rightOuterJoinNatural" }], rightOuterJoin: [{ table: "rightOuterJoin" }] })`), {}, "request");
    });

    test("rightOuterJoinNatural wins over fullOuterJoin", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", fullOuterJoin: [{ table: "fullOuterJoin" }], rightOuterJoinNatural: [{ table: "rightOuterJoinNatural" }] })`), {}, "request");
    });

    test("fullOuterJoin wins over fullOuterJoinNatural", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", fullOuterJoinNatural: [{ table: "fullOuterJoinNatural" }], fullOuterJoin: [{ table: "fullOuterJoin" }] })`), {}, "request");
    });

    // an empty list still claims the join, so the later kind is dropped
    test("an empty earlier kind suppresses a later one", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", join: [], leftJoin: [{ table: "u" }] })`), {}, "request");
    });

    test("a null earlier kind is skipped", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", join: null, leftJoin: [{ table: "u" }] })`), {}, "request");
    });

    // only the applied kind is validated
    test("a malformed later kind is ignored", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", join: [{ table: "u" }], leftJoin: "x" })`), {}, "request");
    });
  });

  describe("join items", () => {
    test("several joins of one kind", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: rds.sql\`1=1\` }, { table: { v: "vv" }, on: rds.sql\`2=2\` }] })`), {}, "request");
    });

    test("join a subquery", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ from: { s: rds.select({ table: "u" }) }, on: rds.sql\`s.id = t.id\` }] })`), {}, "request");
    });

    test("join a table given as from", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ from: "u" }] })`), {}, "request");
    });

    test("join in mysql", async () => {
      await checkResolverValid(mysql(`rds.select({ table: "t", leftJoin: [{ table: { s: "db.u" }, on: rds.sql\`s.a = t.a\` }] })`), {}, "request");
    });

    // a join sits between the source and the WHERE clause, and binds its variables in that order
    test("variables are numbered source, joins, where, limit", async () => {
      await checkResolverValid(pg(`rds.select({
        from: { s: rds.select({ table: "u", where: { a: { eq: "from" } } }) },
        leftJoin: [{ table: "v", on: { x: { eq: "join1" } } }, { table: "w", on: rds.sql\`y = \${"join2"}\` }],
        where: { b: { eq: "where" } },
        limit: 3,
      })`), {}, "request");
    });

    test("join with every other select clause", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", columns: [{ n: "u.name" }], leftJoin: [{ table: "u", using: ["id"] }], where: { a: { eq: 1 } }, orderBy: [{ column: "u.name" }], limit: 1, offset: 2 })`), {}, "request");
    });

    test("an empty join list renders nothing", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [] })`), {}, "request");
    });

    // items that are not objects are skipped without an error
    test("join items that are not objects are skipped", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: ["x", null, { table: "u" }, 5, ["y"], { table: "v" }] })`), {}, "request");
    });

    // a join has no ON or USING requirement, whatever its kind
    test("a natural join keeps its on clause", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", joinNatural: [{ table: "u", on: rds.sql\`a=b\` }] })`), {}, "request");
    });

    test("a cross join keeps its using clause", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", crossJoin: [{ table: "u", using: ["id"] }] })`), {}, "request");
    });

    // joins belong to select only
    test("remove ignores joins", async () => {
      await checkResolverValid(pg(`rds.remove({ table: "t", leftJoin: [{ table: "u" }] })`), {}, "request");
    });

    test("rejects a join kind that is not an array", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: { table: "u" } })`), {}, "request");
    });

    test("rejects a join with neither table nor from", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ on: rds.sql\`1=1\` }] })`), {}, "request");
    });

    test("rejects a join with both table and from", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", from: "v" }] })`), {}, "request");
    });

    test("rejects a join from given as an array", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ from: ["u"] }] })`), {}, "request");
    });

    test("rejects a sql template as a join table alias value", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: { s: rds.sql\`select \${1}\` } }] })`), {}, "request");
    });

    test("rejects an empty join table alias", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: {} }] })`), {}, "request");
    });

    test("rejects on and using together", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: rds.sql\`1=1\`, using: ["id"] }] })`), {}, "request");
    });
  });

  describe("using", () => {
    test("using columns and aliases", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", using: ["id", { k: "kk" }] }] })`), {}, "request");
    });

    test("an empty using list", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", using: [] }] })`), {}, "request");
    });

    test("rejects using given as a string", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", using: "id" }] })`), {}, "request");
    });

    test("rejects a number in using", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", using: [5] }] })`), {}, "request");
    });

    test("rejects a using alias with two entries", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", using: [{ a: "b", c: "d" }] }] })`), {}, "request");
    });
  });

  describe("on condition objects", () => {
    // the values are bound as variables like a WHERE clause's, not read as column references
    test("comparisons bind string values", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { "u.x": { eq: "t.x" }, "u.y": { gt: "t.y" } } }] })`), {}, "request");
    });

    test("several comparisons on one column", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { a: { lt: "b", ge: "c" } } }] })`), {}, "request");
    });

    test("an or group", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { "u.x": { eq: "t.x" }, or: [{ "u.y": { ne: "t.y" } }, { "u.z": { le: "t.z" } }] } }] })`), {}, "request");
    });

    test("contains", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { a: { contains: "b" } } }] })`), {}, "request");
    });

    test("attributeExists", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { a: { attributeExists: true } } }] })`), {}, "request");
    });

    test("between strings", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { a: { between: ["b", "c"] } } }] })`), {}, "request");
    });

    test("size against a string", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { a: { size: { eq: "b" } } } }] })`), {}, "request");
    });

    test("a type hinted value", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { a: { eq: rds.typeHint.UUID("x") } } }] })`), {}, "request");
    });

    test("in mysql", async () => {
      await checkResolverValid(mysql(`rds.select({ table: "t", leftJoin: [{ table: { s: "db.u" }, on: { "s.a": { eq: "t.a" } } }] })`), {}, "request");
    });

    test("an empty condition renders no ON", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: {} }] })`), {}, "request");
    });

    test("a null on renders no ON", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: null }] })`), {}, "request");
    });

    test("rejects a number", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { a: { eq: 3 } } }] })`), {}, "request");
    });

    test("rejects a boolean", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { a: { eq: true } } }] })`), {}, "request");
    });

    test("rejects a number in an or group", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { or: [{ a: { eq: 1 } }] } }] })`), {}, "request");
    });

    test("rejects numbers in between", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { a: { between: [1, 2] } } }] })`), {}, "request");
    });

    test("rejects a number in size", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { a: { size: { eq: 1 } } } }] })`), {}, "request");
    });

    test("rejects a number in a later join", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { a: { eq: "x" } } }, { table: "v", on: { b: { eq: 2 } } }] })`), {}, "request");
    });

    test("rejects a null value", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { a: { eq: null } } }] })`), {}, "request");
    });

    test("rejects an unknown operator", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: { a: { foo: "b" } } }] })`), {}, "request");
    });

    test("rejects a plain string", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: "a = b" }] })`), {}, "request");
    });

    test("rejects an array", async () => {
      await checkResolverValid(pg(`rds.select({ table: "t", leftJoin: [{ table: "u", on: [] }] })`), {}, "request");
    });
  });
});
