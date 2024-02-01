import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import path = require('path');

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new appsync.GraphqlApi(this, "Api", {
      name: "myapi",
      definition: appsync.Definition.fromFile(path.join(__dirname, "schema.graphql")),
    });

    const noneDataSource = api.addNoneDataSource("NoneDataSource");

    const fn = new appsync.AppsyncFunction(this, "Fn", {
      api,
      name: "fn",
      dataSource: noneDataSource,
      runtime: appsync.FunctionRuntime.JS_1_0_0,
      code: appsync.Code.fromAsset(path.join(__dirname, "function.js")),
    });

    new appsync.Resolver(this, "FooResolver", {
      api,
      typeName: "Query",
      fieldName: "foo",
      runtime: appsync.FunctionRuntime.JS_1_0_0,
      code: appsync.Code.fromAsset(path.join(__dirname, "pipeline.js")),
      pipelineConfig: [fn],
    });

    new cdk.CfnOutput(this, "GraphQLURL", {
      value: api.graphqlUrl,
    });

    new cdk.CfnOutput(this, "ApiKey", {
      value: api.apiKey || "",
    });
  }
}
