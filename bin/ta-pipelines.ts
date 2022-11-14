#!/usr/bin/env node
import cdk = require('@aws-cdk/core');
import { TaPipelinesStack, Stages } from '../lib/ta-pipelines-stack';
import * as config from '../environment.json';

const app = new cdk.App();

new TaPipelinesStack(app, 'TAScoringPipelines', {
  env: config.NonProd_Sydney,
  stages: Stages.Testing
});

app.synth();
