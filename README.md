# AppSync Javascript resolver implementation

This package provides an implementation for the `@aws-appsync/utils` package that is available on AWS.

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
