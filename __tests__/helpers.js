"use strict";;

import { AppSyncClient, EvaluateCodeCommand } from "@aws-sdk/client-appsync";
import { util } from "..";

let client = null;

const runOnAWS = async (s) => {
  if (!client) {
    client = new AppSyncClient();
  }

  const code = `
  import { util } from '@aws-appsync/utils';

  export function request(ctx) {
    return ${s};
  }

  export function response(ctx) {
  }
  `;

  const command = new EvaluateCodeCommand({
    code,
    context: "{}",
    function: "request",
    runtime: {
      name: "APPSYNC_JS",
      runtimeVersion: "1.0.0",
    },
  });

  const result = await client.send(command);
  try {
    return JSON.parse(result.evaluationResult);
  } catch (e) {
    console.error("invalid json", result);
  }
}

// If TEST_TARGET is AWS_CLOUD then run the check against AWS. Otherwise, run locally.
export const checkValid = async (s) => {
  let result;
  if (process.env.TEST_TARGET === "AWS_CLOUD") {
    result = await runOnAWS(s);
  } else {
    result = eval(s);
  }
  expect(result).toMatchSnapshot();
}
