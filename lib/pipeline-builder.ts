import cdk = require('@aws-cdk/core');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codebuild = require('@aws-cdk/aws-codebuild');
import pipeActions = require('@aws-cdk/aws-codepipeline-actions');
import githubSecrets = require('./githubSecrets');
import { Policy } from '@aws-cdk/aws-iam';
import { CfnParameter, Construct } from '@aws-cdk/core';

import { getStatement } from './createPolicyStatement';
import { PipelinesProps } from './cdk-pipelines-stack';

export class PipelineBuilder extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: PipelinesProps) {
    super(scope, id, props);

    const githubToken = githubSecrets.getSSHKeySecret(this, props.stages);

    const sourceArtifact = new codepipeline.Artifact('Source');
    const buildArtifact = new codepipeline.Artifact('Build');

    const codebuildProject = new codebuild.PipelineProject(this, 'pipeline-builder-build', {
      projectName: 'pipeline-builder',
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0
      }
    });

    const buildPol = getBuildPolicy(this);
    if (codebuildProject.role) buildPol.attachToRole(codebuildProject.role);

    // Configure the branch of scoring-pipelines repo which should invoke on commit and deploy the CF Stack
    const branch = new CfnParameter(this, 'pipelineBranch', {
      default: 'develop'
    });

    const pipeline = new codepipeline.Pipeline(this, 'pipeline-builder', {
      pipelineName: 'pipeline-builder-pipeline'
    });

    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new pipeActions.GitHubSourceAction({
          actionName: 'Source',
          oauthToken: githubToken.secretValue,
          repo: 'cdkv1-api-deployment-lambda',
          owner: 'rohitgupta19',
          branch: branch.valueAsString,
          output: sourceArtifact
        })
      ]
    });

    pipeline.addStage({
      stageName: 'BuildAndDeploy',
      actions: [
        new pipeActions.CodeBuildAction({
          actionName: 'CodeBuild',
          input: sourceArtifact,
          project: codebuildProject,
          outputs: [buildArtifact]
        })
      ]
    });
  }
}

const getBuildPolicy = (scope: Construct) => {
  const githubKeys = githubSecrets.getSecretsPolicy();

  const CFAccess = getStatement(
    ['cloudformation:*', 'cloudformation:List*', 'cloudformation:Describe*', 'cloudformation:Get*'],
    [
      'arn:aws:cloudformation:*:*:stack/PipelineBuilder/*',
      'arn:aws:cloudformation:*:*:stack/*/*',
      'arn:aws:cloudformation:*:*:stack/CDKToolkit/*'
    ]
  );

  const pipeline = getStatement(
    ['codepipeline:*', 'codebuild:*', 'kms:DescribeKey', 'kms:CreateKey', 'sns:CreateTopic'],
    ['*']
  );

  const S3Access = getStatement(
    ['s3:*'],
    [
      'arn:aws:s3:::cdktoolkit*',
      'arn:aws:s3:::scoring-piplines-artifacts*',
      'arn:aws:s3:::scoring-piplines-artifacts-test*'
    ]
  );

  const LambdaHook = getStatement(
    ['lambda:*', 'sns:*'],
    [
      'arn:aws:lambda:*:*:function:CDKLambdaDeployPipeline-*',
      'arn:aws:lambda:*:*:function:PipelineBuilder-*',
      'arn:aws:sns:*:*:CDKLambdaDeployPipeline-*'
    ]
  );

  const IAM = getStatement(
    ['iam:*'],
    ['arn:aws:iam::*:role/CDKLambdaDeployPipeline-*', 'arn:aws:iam::*:role/PipelineBuilder-*']
  );

  const rolePol = new Policy(scope, 'BuildPolicy');
  rolePol.addStatements(pipeline, S3Access, CFAccess, LambdaHook, IAM, githubKeys);

  return rolePol;
};
