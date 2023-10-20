#!/usr/bin/env bash

set -euo pipefail
set -x

# Run as an entrypoint to docker to install the current package, and test that
# node can import it as per the LocalStack AppSync emulation.
# This script both runs the test, and acts as its own entrypoint

if [ -z ${TEST_IN_DOCKER_ENTRYPOINT:-} ]; then
    # test script
    echo Test script $0
    script_path=$(readlink -f $0)
    project_root=$(dirname $script_path)
    docker run \
        --rm \
        -it \
        -v $project_root:/src \
        -v $script_path:/test_in_docker.sh:ro \
        --workdir /test \
        --entrypoint bash \
        -e TEST_IN_DOCKER_ENTRYPOINT=1 \
        ${TEST_IMAGE_NAME:-public.ecr.aws/lambda/nodejs:16} /test_in_docker.sh
else
    # entrypoint
    echo Entrypoint
    echo '{"dependencies": {"@aws-appsync/utils":"/src"}}' > package.json
    npm install

    echo "import { util } from '@aws-appsync/utils';" > main.mjs
    node main.mjs
fi
