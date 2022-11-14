#!/usr/bin/env node
import cdk = require('@aws-cdk/core');
import { CDKPipelinesStack, Stages } from '../lib/cdk-pipelines-stack';
import * as config from '../environment.json';

const app = new cdk.App();

new CDKPipelinesStack(app, 'CDKLambdaDeployPipeline', {
  env: config.NonProd_Sydney,
  stages: Stages.Testing
});

app.synth();
