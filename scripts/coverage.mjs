import { util } from '../index.js';
import * as rds from '../rds/index.js';
import * as dynamodb from '../dynamodb/index.js';

class Namespace {
  constructor(name, obj) {
    this.name = name;
    this.obj = obj;
  }
};

// ns must be a Namespace type
function evaluateNamespace(ns) {
  for (const [key, value] of Object.entries(ns.obj)) {
    switch (typeof value) {
      case 'function': {
        console.log(`* ${ns.name}.${key}`);
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

