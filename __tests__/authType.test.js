// `util.authType()` names the authorization mode of the request. AppSync gives each mode its own
// `ctx.identity` shape, so the mode is read back from the identity; every shape below comes from
// the AppSync resolver context reference, together with the mixtures that sit between two modes.
import { checkResolverValid } from "./helpers";
import { util, setResolverContext } from "..";

const RESOLVER = `
export function request(ctx) {
  return { authType: util.authType() };
}

export function response(ctx) {}
`;

const authTypeFor = (identity) => checkResolverValid(RESOLVER, { identity }, "request");

const COGNITO_ISSUER = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123";
const COGNITO_CLAIMS = {
  sub: "sub-1",
  iss: COGNITO_ISSUER,
  "cognito:username": "alice",
  token_use: "id",
};

const LAMBDA_IDENTITY = { resolverContext: { userId: "alice", role: "admin" } };

const IAM_IDENTITY = {
  accountId: "123456789012",
  cognitoIdentityPoolId: null,
  cognitoIdentityId: null,
  sourceIp: ["1.2.3.4"],
  username: "AKIAIOSFODNN7EXAMPLE",
  userArn: "arn:aws:iam::123456789012:user/alice",
  cognitoIdentityAuthType: null,
  cognitoIdentityAuthProvider: null,
};

const IAM_IDENTITY_POOL_IDENTITY = {
  ...IAM_IDENTITY,
  cognitoIdentityPoolId: "us-east-1:00000000-0000-0000-0000-000000000000",
  cognitoIdentityId: "us-east-1:11111111-1111-1111-1111-111111111111",
  username: "AROAEXAMPLE:CognitoIdentityCredentials",
  userArn: "arn:aws:sts::123456789012:assumed-role/authRole/CognitoIdentityCredentials",
  cognitoIdentityAuthType: "authenticated",
  cognitoIdentityAuthProvider: "cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123",
};

const USER_POOL_IDENTITY = {
  sourceIp: ["1.2.3.4"],
  username: "alice",
  groups: ["admins"],
  sub: "sub-1",
  issuer: COGNITO_ISSUER,
  claims: COGNITO_CLAIMS,
  defaultAuthStrategy: "ALLOW",
};

const OIDC_IDENTITY = {
  sub: "sub-1",
  issuer: "https://accounts.example.com",
  claims: { sub: "sub-1", iss: "https://accounts.example.com" },
};

const withoutKey = (identity, key) => {
  const { [key]: _removed, ...rest } = identity;
  return rest;
};

describe("util.authType", () => {
  describe("the mode of an identity", () => {
    test("a request carrying no identity is authorized by an API key", async () => {
      await checkResolverValid(RESOLVER, {}, "request");
    });

    test("a null identity is authorized by an API key", async () => {
      await authTypeFor(null);
    });

    test("an identity carrying a resolver context comes from a Lambda authorizer", async () => {
      await authTypeFor(LAMBDA_IDENTITY);
    });

    // a Lambda authorizer may return no resolver context at all, which leaves an empty identity
    test("an identity with no keys comes from a Lambda authorizer", async () => {
      await authTypeFor({});
    });

    test("an IAM identity is IAM authorized even though it also carries a username", async () => {
      await authTypeFor(IAM_IDENTITY);
    });

    test("an IAM identity from a Cognito identity pool is IAM authorized", async () => {
      await authTypeFor(IAM_IDENTITY_POOL_IDENTITY);
    });

    test("a user pool identity is user pool authorized", async () => {
      await authTypeFor(USER_POOL_IDENTITY);
    });

    test("a user pool identity without groups is user pool authorized", async () => {
      await authTypeFor(withoutKey(USER_POOL_IDENTITY, "groups"));
    });

    test("an identity holding a subject, an issuer and claims is OIDC authorized", async () => {
      await authTypeFor(OIDC_IDENTITY);
    });
  });

  describe("an identity that names no single mode", () => {
    test("an IAM identity missing its user ARN falls back to an API key", async () => {
      await authTypeFor(withoutKey(IAM_IDENTITY, "userArn"));
    });

    test("an IAM identity whose source IP is null falls back to an API key", async () => {
      await authTypeFor({ ...IAM_IDENTITY, sourceIp: null });
    });

    test("a user pool identity missing its default auth strategy falls back to an API key", async () => {
      await authTypeFor(withoutKey(USER_POOL_IDENTITY, "defaultAuthStrategy"));
    });

    test("a user pool identity missing its source IP falls back to an API key", async () => {
      await authTypeFor(withoutKey(USER_POOL_IDENTITY, "sourceIp"));
    });

    test("an identity holding only claims falls back to an API key", async () => {
      await authTypeFor({ claims: OIDC_IDENTITY.claims });
    });

    // `username` belongs to the user pool identity, which makes this an incomplete user pool
    // identity rather than an OIDC one
    test("a subject, an issuer and claims beside a username fall back to an API key", async () => {
      await authTypeFor({ ...OIDC_IDENTITY, username: "alice" });
    });
  });

  // NOT compared against AWS: `setResolverContext` is the seam a host uses to hand the request to
  // the utils, so these pin our own contract with the runtime rather than any AWS behaviour. They
  // also show that the module a test imports is the module the resolver code imports.
  describe("the request context a host installs", () => {
    afterEach(() => setResolverContext(null));

    test("reports an API key until a context is installed", () => {
      expect(util.authType()).toBe("API Key Authorization");
    });

    test("follows the context installed for the current request", () => {
      setResolverContext({ identity: LAMBDA_IDENTITY });
      expect(util.authType()).toBe("Lambda Authorization");
    });

    test("falls back to an API key once the context is cleared", () => {
      setResolverContext({ identity: IAM_IDENTITY });
      setResolverContext(null);
      expect(util.authType()).toBe("API Key Authorization");
    });
  });
});
