"use strict";;

import { AppSyncClient, EvaluateCodeCommand } from "@aws-sdk/client-appsync";
import { util } from "..";
import * as ddb from "../dynamodb";

let client = null;

const runOnAWS = async (s, context) => {
  if (!client) {
    client = new AppSyncClient();
  }

  if (!context) {
    context = {};
  }

  const code = `
  import { util } from '@aws-appsync/utils';
  import * as ddb from '@aws-appsync/utils/dynamodb';

  export function request(ctx) {
    return ${s};
  }

  export function response(ctx) {
  }
  `;

  const command = new EvaluateCodeCommand({
    code,
    context: JSON.stringify(context),
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
export const checkValid = async (s, context) => {
  let result;
  if (process.env.TEST_TARGET === "AWS_CLOUD") {
    result = await runOnAWS(s, context);
  } else {
    console.log(s);
    result = eval(s);
  }
  expect(result).toMatchSnapshot();
}
