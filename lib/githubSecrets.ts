import secretsmanager = require('@aws-cdk/aws-secretsmanager');
import { Construct } from '@aws-cdk/core';
import { PolicyStatement, Effect } from '@aws-cdk/aws-iam';
import * as config from '../environment.json';

export function getSSHKeySecret(scope: Construct, env: string) {
  let arn = `arn:aws:secretsmanager:${config.NonProd_Sydney.region}:${config.NonProd_Sydney.account}:secret:github-build-token-4j7Cc6`;

  if (arn === null) throw new Error('Could not find Github Token for ' + env);
  return secretsmanager.Secret.fromSecretCompleteArn(scope, 'TennisAustraliaBuildToken', arn);
}

export function getSecretsPolicy() {
  const ssmAccess = new PolicyStatement();
  ssmAccess.effect = Effect.ALLOW;

  ssmAccess.addActions(
    'ssm:GetParameters',
    'ssm:GetParameter',
    'kms:Decrypt',
    'kms:Encrypt',
    'kms:GetKeyPolicy',
    'kms:DescribeKey',
    'secretsmanager:GetSecretValue'
  );
  ssmAccess.addResources(
    `arn:aws:kms:${config.NonProd_Sydney.region}:${config.NonProd_Sydney.account}:key/f27e3a70-6fcd-4ea9-ba62-1730480ec36f`,
    'arn:aws:ssm:*:*:parameter/CodeBuild/Github',
    'arn:aws:secretsmanager:*:*:secret:TennisAustraliaBuildToken*'
  );

  return ssmAccess;
}
