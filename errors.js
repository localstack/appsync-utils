/**
 * Raised for input the AppSync JS utils reject. AppSync surfaces this as a GraphQL error rather
 * than an internal failure, so the message reaches the caller instead of an opaque
 * `JSExecutionError`.
 *
 * Lives in its own module because both `index.js` and `rds/index.js` throw it, and `index.js`
 * already imports from `rds/index.js` - declaring the class in either one would make the pair
 * circular.
 */
export class AppSyncUserError extends Error {
  constructor(message, errorType, data, errorInfo) {
    super(message);
    this.name = "AppSyncUserError";
    this.errorType = errorType;
    this.data = data;
    this.errorInfo = errorInfo;
  }
}


/**
 * Build the error for input the utils reject. AppSync attributes a fault in the resolver code
 * itself - which is what invalid input to a util is - to the errorType `Code`, as distinct from the
 * null errorType a deliberate `util.error` carries. The two are otherwise indistinguishable, so
 * without this a caller cannot tell a rejection raised by the library from an error the resolver
 * author raised on purpose.
 *
 * `EvaluateCode` reports only the message, so this is not observable in the recorded snapshots.
 */
export function codeError(message) {
  return new AppSyncUserError(message, "Code");
}
