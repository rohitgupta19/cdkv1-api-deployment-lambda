import cdk = require('@aws-cdk/core');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codebuild = require('@aws-cdk/aws-codebuild');
import pipeActions = require('@aws-cdk/aws-codepipeline-actions');
import githubSecrets = require('./githubSecrets');
import { PolicyStatement, Policy, Effect, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Construct, CfnParameter } from '@aws-cdk/core';
import { ArtifactPath } from '@aws-cdk/aws-codepipeline';
import { CloudFormationCapabilities } from '@aws-cdk/aws-cloudformation';
import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import { getStatement } from './createPolicyStatement';
import { BuildEnvironmentVariableType } from '@aws-cdk/aws-codebuild';

export enum Stages {
  Testing = 'Testing'
}

const getStages = (stageGroup: Stages) => {
  const stages = {
    Testing: ['dev']
  };

  return stages[stageGroup];
};

const stageBranchMapping: { [k: string]: string } = require('../stages').branchMapping;

const cdkLambdaApplications: { [k: string]: string }[] = require('../pipelines');

export interface PipelinesProps extends cdk.StackProps {
  stages: Stages;
}

export class CDKPipelinesStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: PipelinesProps) {
    super(scope, id, props);

    const githubToken = githubSecrets.getSSHKeySecret(this, props.stages);

    const sourceArtifact = new codepipeline.Artifact('Source');
    const buildArtifact = new codepipeline.Artifact('Build');
    const deployArtifact = new codepipeline.Artifact('Deploy');

    const artifactBucket = new Bucket(this, 'PipelinesArtifactBucket', {
      bucketName:
        'cdk-lambda-piplines-artifacts-' + props.stages.toLowerCase() + this.account.substr(0, 4),
      encryption: BucketEncryption.S3_MANAGED
    });

    const buildPol = getBuildPolicy(this);
    const deployRole = getDeployRole(this);

    for (const cdkLambdaApplication of cdkLambdaApplications) {
      const codebuildProject = new codebuild.PipelineProject(this, cdkLambdaApplication.name, {
        projectName: cdkLambdaApplication.name,
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_5_0
        }
      });

      if (codebuildProject.role) buildPol.attachToRole(codebuildProject.role);

      for (const stage of getStages(props.stages)) {
        const branch = new CfnParameter(this, cdkLambdaApplication.name + stage + 'Branch', {
          default: stageBranchMapping[stage]
        });

        const pipeline = new codepipeline.Pipeline(
          this,
          stage + '-pipeline-' + cdkLambdaApplication.name,
          {
            pipelineName: stage + '-' + cdkLambdaApplication.name,
            artifactBucket: artifactBucket
          }
        );

        pipeline.addStage({
          stageName: 'Source',
          actions: [
            new pipeActions.GitHubSourceAction({
              actionName: 'Source',
              oauthToken: githubToken.secretValue,
              repo: scoringApplication.repo,
              owner: 'rohitgupta19',
              branch: branch.valueAsString,
              output: sourceArtifact
            })
          ]
        });

        pipeline.addStage({
          stageName: 'Build',
          actions: [
            new pipeActions.CodeBuildAction({
              actionName: 'CodeBuild',
              input: sourceArtifact,
              project: codebuildProject,
              environmentVariables: {
                BUILD_STAGE: { type: BuildEnvironmentVariableType.PLAINTEXT, value: stage }
              },
              outputs: [buildArtifact]
            })
          ]
        });

        pipeline.addStage({
          stageName: 'Deploy',
          actions: [
            new pipeActions.CloudFormationCreateReplaceChangeSetAction({
              actionName: 'CreateDeploy',
              stackName: scoringApplication.stackName + '-' + stage,
              templatePath: new ArtifactPath(
                buildArtifact,
                '.serverless/cloudformation-template-update-stack.json'
              ),
              templateConfiguration: new ArtifactPath(
                buildArtifact,
                '.serverless/cloudformation-template-config.json'
              ),
              adminPermissions: false,
              changeSetName: stage + '-deployment',
              deploymentRole: deployRole,
              capabilities: [CloudFormationCapabilities.NAMED_IAM],
              output: deployArtifact
            })
          ]
        });

        pipeline.addStage({
          stageName: 'DeployStack',
          actions: [
            new pipeActions.CloudFormationExecuteChangeSetAction({
              actionName: 'Deploy',
              stackName: scoringApplication.stackName + '-' + stage,
              changeSetName: stage + '-deployment',
              output: deployArtifact
            })
          ]
        });
      }
    }
  }
}

const getDeployRole = (scope: Construct) => {
  const all = new PolicyStatement();
  all.effect = Effect.ALLOW;

  all.addActions(
    'iam:*',
    'lambda:*',
    's3:*',
    'sqs:*',
    'events:*',
    'ec2:*',
    'sns:*',
    'logs:*',
    'apigateway:*',
    'states:*'
  );

  all.addResources('*');

  const rolePol = new Policy(scope, 'DeployPolicy');
  rolePol.addStatements(all);

  const role = new Role(scope, 'CFDeployRole', {
    assumedBy: new ServicePrincipal('cloudformation.amazonaws.com')
  });

  rolePol.attachToRole(role);

  return role;
};

const getBuildPolicy = (scope: Construct) => {
  const githubKeys = githubSecrets.getSecretsPolicy();

  const CFAccess = getStatement(
    ['cloudformation:List*', 'cloudformation:Describe*', 'cloudformation:Get*'],
    ['arn:aws:cloudformation:*:*:stack/*/*', 'arn:aws:cloudformation:*:*:stackset/*:']
  );

  const S3Access = getStatement(
    ['s3:Get*', 's3:List*', 's3:PutObject', 's3:PutObjectVersion'],
    ['arn:aws:s3:::*/serverless/*']
  );

  const LambdaAccess = getStatement(
    ['lambda:Get*', 'lambda:List*', 'lambda:Delete*'],
    ['arn:aws:lambda:*:*:function:*']
  );

  const rolePol = new Policy(scope, 'BuildPolicy');
  rolePol.addStatements(githubKeys, S3Access, CFAccess, LambdaAccess);

  return rolePol;
};
