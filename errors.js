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
