#!/usr/bin/env bash

set -euo pipefail

log() {
    echo $@ >&2
}

(cd cdk

set -x

log "Installing dependencies"
npm ci

log "Bootstrapping"
npm run cdklocal -- bootstrap

log "Deploying"
npm run cdklocal -- deploy --require-approval never --outputs-file outputs.json

export TEST_URL=$(jq -r .CdkStack.GraphQLURL outputs.json)
export TEST_API_KEY=$(jq -r .CdkStack.ApiKey outputs.json)

log "Accessing URL ${TEST_URL} with api key ${TEST_API_KEY}"
REQUEST=$(curl \
    --connect-timeout 30 \
    --retry 10 \
    --retry-delay 6 \
    -X POST \
    -H "x-api-key:$TEST_API_KEY" \
    -H "Accept:application/json" \
    -H "Content-Type:application/json" \
    $TEST_URL \
    -d '{"query": "query { foo }"}'
)
foo=$(jq .data.foo <<< "$RESULT")
errors=$(jq .errors <<< "$RESULT")
if [[ "$errors" != "null" || "$foo" != '"my-string"' ]]; then
  exit 1
fi
)
