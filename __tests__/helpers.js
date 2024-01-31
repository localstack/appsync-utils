"use strict";

import { AppSyncClient, EvaluateCodeCommand } from "@aws-sdk/client-appsync";
import { util } from "..";
import * as ddb from "../dynamodb";
import * as rds from "../rds";

let client = null;

const runResolverFunctionOnAWS = async (code, context, functionName) => {
    if (!client) {
        client = new AppSyncClient();
    }

    if (!context) {
        context = {};
    }

    const command = new EvaluateCodeCommand({
        code,
        context: JSON.stringify(context),
        function: functionName,
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
};

const runOnAWS = async (s, context) => {
    const code = `
  import { util } from '@aws-appsync/utils';
  import * as ddb from '@aws-appsync/utils/dynamodb';
  import * as rds from '@aws-appsync/utils/rds';

  export function request(ctx) {
    return ${s};
  }

  export function response(ctx) {
  }
  `;

    return await runResolverFunctionOnAWS(code, context, "request");

}

export const checkResolverValid = async (code, context, functionName) => {
    let result;
    if (process.env.TEST_TARGET === "AWS_CLOUD") {
        const fullCode = `
        import { util } from '@aws-appsync/utils';
        import * as rds from '@aws-appsync/utils/rds';
        ` + code;
        result = await runResolverFunctionOnAWS(fullCode, context, functionName);
    } else {
        const fullCode = `
        import { util } from '..';
        import * as rds from '../rds';
        ` + code;
        const encodedJs = encodeURIComponent(fullCode);
        const dataUri = 'data:text/javascript;charset=utf-8,' + encodedJs;
        const module = await import(dataUri);

        const fn = module[functionName];

        transformContextForAppSync(context);
        result = fn(context);
    }
    expect(result).toMatchSnapshot();
};

// manipulate the context object to behave like the AppSync equivalent
function transformContextForAppSync(context) {
    context.args = context.arguments;
}

// If TEST_TARGET is AWS_CLOUD then run the check against AWS. Otherwise, run locally.
export const checkValid = async (s, context, postProcess) => {
    let result;
    if (process.env.TEST_TARGET === "AWS_CLOUD") {
        result = await runOnAWS(s, context);
    } else {
        result = eval(s);
    }
    if (postProcess) {
        result = postProcess(result);
    }
    expect(result).toMatchSnapshot();
}
