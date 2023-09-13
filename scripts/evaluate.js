#!/usr/bin/env node

const { EvaluateCodeCommand, AppSyncClient } = require("@aws-sdk/client-appsync");
const { exit } = require("process");
const fs = require("fs").promises;

(async () => {
  // parse command line arguments
  if (process.argv.length != 4) {
    console.error(`Program usage: ${process.argv[1]} <code.js> <context.json>`);
    exit(1);
  }

  const codeFile = process.argv[2];
  const contextFile = process.argv[3];

  const code = await fs.readFile(codeFile, "utf8");
  const context = await fs.readFile(contextFile, "utf8");

  const client = new AppSyncClient();
  const command = new EvaluateCodeCommand({
    runtime: {
      name: "APPSYNC_JS",
      runtimeVersion: "1.0.0",
    },
    code,
    context,
    function: "request",
  });

  try {
    const result = await client.send(command);
    console.log(result);

  } catch (err) {
    console.error(err);
  }

})();
