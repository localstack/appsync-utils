import { util } from '../index.js';
import * as rds from '../rds/index.js';
import * as dynamodb from '../dynamodb/index.js';

class Namespace {
  constructor(name, obj) {
    this.name = name;
    this.obj = obj;
  }
};

const partialImplementations = {
  'util.appendError': {
    message: "the function exists but errors are not yet captured",
  },
};

// ns must be a Namespace type
function evaluateNamespace(ns) {
  for (const [key, value] of Object.entries(ns.obj)) {
    switch (typeof value) {
      case 'function': {
        const qualifiedName = `${ns.name}.${key}`;
        let message = `* \`${qualifiedName}\``;
        if (partialImplementations[qualifiedName] !== undefined) {
          const partialDescription = partialImplementations[qualifiedName].message;
          message = `${message} _(partial, ${partialDescription})_`;
        } else {
        };
        console.log(message);
        break;
      };
      case "object": {
        const newNs = new Namespace(`${ns.name}.${key}`, value);
        evaluateNamespace(newNs);
        break;
      };
      default: {
        console.error(`Unhandled type ${typeof value}`);
        break;
      };
    }
  }
}

function printImportMessage(text) {
  console.log(`
Assuming the following import:

\`\`\`javascript
${text}
\`\`\`
    `);
}

printImportMessage(`import { util } from '@aws-appsync/utils'`);
evaluateNamespace(new Namespace("util", util));

printImportMessage(`import * as rds from '@aws-appsync/utils/rds'`);
evaluateNamespace(new Namespace("rds", rds));

printImportMessage(`import * as dynamodb from '@aws-appsync/utils/dynamodb'`);
evaluateNamespace(new Namespace("dynamodb", dynamodb));

