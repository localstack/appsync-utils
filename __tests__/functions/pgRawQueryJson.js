export function request(ctx) {
  const { id, key, value } = ctx.args;
  const updateQuery = `UPDATE "document" set "data" = jsonb_set("data", '{${key}}', '"${value}" WHERE id = ${id}`;
  return rds.createPgStatement(updateQuery);
}

export function response(ctx) { }

