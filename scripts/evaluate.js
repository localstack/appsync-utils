#!/usr/bin/env node

import { EvaluateCodeCommand, AppSyncClient } from "@aws-sdk/client-appsync";
import { exit } from "process";
import * as fs from 'fs';

(async () => {
  // parse command line arguments
  if (process.argv.length != 3) {
    console.error(`Program usage: ${process.argv[1]} <code.js>`);
    exit(1);
  }

  const codeFile = process.argv[2];

  const code = await fs.promises.readFile(codeFile, "utf8");

  const client = new AppSyncClient();
  const command = new EvaluateCodeCommand({
    runtime: {
      name: "APPSYNC_JS",
      runtimeVersion: "1.0.0",
    },
    code,
    context: JSON.stringify({}),
    function: "request",
  });

  try {
    const result = await client.send(command);
    console.log(result);

  } catch (err) {
    console.error(err);
  }

})();
