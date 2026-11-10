import { describe, test } from "@jest/globals";

import { checkResolverValid } from "./helpers";

const resolver = (body) => `
export function request(ctx) {
  ${body}
}

export function response(ctx) {
  return ctx.result;
}
`;

describe("runtime.earlyReturn", () => {
  test("returns the value", async () => {
    await checkResolverValid(resolver(`runtime.earlyReturn({ early: true }); return { late: true };`), {}, "request");
  });

  test("returns null without a value", async () => {
    await checkResolverValid(resolver(`runtime.earlyReturn();`), {}, "request");
  });

  test("accepts skipTo END", async () => {
    await checkResolverValid(resolver(`runtime.earlyReturn("end", { skipTo: "END" });`), {}, "request");
  });

  test("accepts skipTo NEXT", async () => {
    await checkResolverValid(resolver(`runtime.earlyReturn("next", { skipTo: "NEXT" });`), {}, "request");
  });

  test("rejects an unknown skipTo", async () => {
    await checkResolverValid(resolver(`runtime.earlyReturn("x", { skipTo: "BOGUS" });`), {}, "request");
  });

  test("rejects options without skipTo", async () => {
    await checkResolverValid(resolver(`runtime.earlyReturn("x", {});`), {}, "request");
  });
});
