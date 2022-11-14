#!/usr/bin/env node
import cdk = require('@aws-cdk/core');
import { PipelineBuilder } from '../lib/pipeline-builder';
import * as config from '../environment.json';
import { Stages } from '../lib/ta-pipelines-stack';

const app = new cdk.App();
const AWS_ACCOUNT = process.env.CDK_DEFAULT_ACCOUNT;
let envConfig: any = { account: '', region: '' };
let stage: any = '';

if (AWS_ACCOUNT === config.NonProd_Sydney.account) {
  envConfig = config.NonProd_Sydney;
  stage = Stages.Testing;
}

console.log('envConfig : ', envConfig);
console.log('stage : ', stage);

new PipelineBuilder(app, 'PipelineBuilder', {
  env: envConfig,
  stages: stage
});

app.synth();
