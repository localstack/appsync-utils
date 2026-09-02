# AppSync Javascript resolver implementation

This package provides an implementation for the `@aws-appsync/utils` package that is available on AWS.

## Changelog:

- v0.1.6: add `util.authType()`, derived from the identity of the request; a host installs the request through the new `setResolverContext` export
- v0.1.5: add `rds` `beginsWith`, `between` and `size` conditions, table aliases and `sql` template `where` clauses; invalid input now raises AWS's validation error instead of a raw `TypeError`, and the wildcard conditions require a string
- v0.1.4: fix `rds` query builders with empty `orderBy`, `where` and `values` inputs, `contains` wildcards and multiple conditions per column; `orderBy` `dir` is now restricted to `ASC`/`DESC`
- v0.1.3: fix `rds` query builders with star columns, empty `where` objects and nullable `limit`/`offset`
- v0.1.2: fix `rds` query builders with schema qualified identifiers
- v0.1.1: security updates
- v0.1.0: first pinned version of the library

> [!TIP]
> To ensure you are using the latest version of this package with LocalStack, start LocalStack with the environment variable
>
> ```
> APPSYNC_JS_LIBS_VERSION=refresh localstack start
> ```
>
> This will fetch the latest version the first time a JavaScript resolver is executed. On next startup this flag is not needed unless the package needs to be updated.
>
> Alternatively the library can be pinned to a specific Git tag or commit by setting:  `APPSYNC_JS_LIBS_VERSION=<commit or tag>`

## Requesting functions to be implemented

We do not yet cover all functionality as provided by AWS AppSync.
To request missing functions, or to see our function coverage, please see https://github.com/localstack/appsync-utils/issues/19.

## Development workflow

The test suite has automatic comparison with AWS. The testing workflow looks like:

* Add the test to `__tests__/index.test.js` passing the string text of the utility you wish to test, for example

```javascript
test("string", async () => {
  await checkValid(`util.dynamodb.toDynamoDB("test")`);
});
```

* Run the test against AWS to capture the snapshot:

```bash
npm run test:aws
```

* Run the tests against the local package, using the snapshot for the ground truth

```bash
npm run test
```
