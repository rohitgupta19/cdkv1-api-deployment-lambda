# TA Scoring Pipelines

# Current State verified as on 24th August 2021 (This read me file will be updated in future based on further work)

1. As of now the CI/CD pipeline for this project is not verified so deployment of the stack is manual. This work to be carried out as part of future tickets (Adding new environment, clean up some of the environment, verifying the CI/CD for scoring pipeline project, adding a pipeline for a new project or any new enhancement)
2. This project on deploy will create a cloud formation template and corresponding CI/CD pipelines for 3 projects.

   a. ao-scoring

3. stages and branch mapping for all 3 projects are defined in stages.json
4. Entry point for the project is cdk-pipelines.ts
5. There are 4 stages defined in the project and for each stage we will be deploying to below environments :

   Testing: ["dev", "dev3", "dev2", "sit", "fnc", "perf", "uat"],

6. If any new environment to be added or removed from the list for a particular stage, above variable needs to be updated along with the mapping in stages.json
7. If only the branch mapping for the environment needs to be changes in future only stages.json needs to be updated and redeploy the stack.
8. As of now only Non-Prod stack (CDKLambdaDeployPipeline) is enabled and rest of them are commented in cdk-pipelines.ts to ensure only that stack is deployed.

# Pre-Requisite before deploying the stack

1. You need to have your AWS Account configured in order to run the cdk commands from the command line
2. As of now a new iam user (scoring-pipelines-dev with administrator access) was created in non-prod account since existing iam user created for non-prod account can not execute the CDK commands. In order for any deployment to Prod account, we need to configure Iam user for prod account.
   https://tennis-master.awsapps.com/start/#/
3. run `aws configure` for the aws accessKeyId and secretAccessKey with a profile name
4. run `export AWS_PROFILE=#YOUR_PROFILE_NAME`
5. install CDK version for the project globally `npm install -g aws-cdk@1.80.0 `
6. run `npm install`
7. run `npm run build`

# Deployment from command line :

There are 2 option for deployment.

a. Deployment of cloudformation stack along with any resource changes (Not to be used only for branch mapping changes, choose option b) :

- run `npx cdk diff CDKLambdaDeployPipeline || true`

Above command will display all the difference between the current stack and deployed stack.
It will also list all the Iam related changes

Here is an Example of current value of paramter aoscoringdevBranch changing from master to develop

`[~] Parameter ao-scoringdevBranch aoscoringdevBranch: {"Type":"String","Default":"master"} to {"Type":"String","Default":"develop"}`

- run `npx cdk deploy CDKLambdaDeployPipeline --require-approval never`

Will re-deploy the cloudformation changes and also re-trigger the pipelines if there are any changes identified .

You can check the console logs to track the progress of deployment.

b. Deployment of only branch mapping changes :

- run `npx cdk deploy CDKLambdaDeployPipeline --parameters parameter-name=value --require-approval never`

Example :

- `npx cdk deploy CDKLambdaDeployPipeline --parameters aoscoringdevBranch=feature/AODS1234 --require-approval never`

You can find list of current parameter mapping in the cloudformation stack under Parameters tab.

This will only update the stack and the branch mapping in codepipeline but not trigger the actual pipeline. You need to push the changes to the branch or click on Release changes in code pipeline in order to trigger the build from the latest branch.

In order to update the mapping for multiple branches we need to pass multiple --parameters for each key value pair

`npx cdk deploy CDKLambdaDeployPipeline --parameters parameter-name1=value1 --parameters parameter-name2=value2 --require-approval never`

# TODO

1. Verify and Configure CI/CD pipeline as it seems existing but could not verify it to be working.
2. There are some reference of Old IT account in the code so needs to review what it is used for and if there are any changes required.
3. Move all the hardcoded items to the config file.
4. Make use of environment variables so can deploy the stack only for single account without commenting stack like Non Prod Sydney, Non Prod Singapore, Prod Sydney.
5. Update the Node js, CDK and other library versions.
6. Clean up environment for CI/CD pipelines which are not needed (perf, dev2, dev3).

###### Previous State before 24th August 2021 - Needs to review in future

This is a [AWS CDK](https://github.com/awslabs/aws-cdk) application that deploys the pipelines used for the Scoring Solution on AO.

The master pipeline in this project is the `pipeline-builder.ts`. This is a CodePipeline project that builds the other pipelines out.

`npm run build` Followed by
`npx cdk --app "node bin/pipeline-builder.js"` will deploy this master pipeline. This pipeline will run automatically on pushes to `master` of this project on github and will build out the pipelines defined here.

See `./pipelines.json` for the pipelines that will be built.

All pipelines follow the same patter for stages (Environments) and map their branches the same way to keep consitency. See `./stages.json`.

## Github

Each Pipeline is created with a webhook for it's respective branch and will automatically be started when a change is made on that branch.

Initial setup of pipelines requires Admin permission on a given repo for when the WebHook is automatically created, from then on it can be simple Read access.

## Permissions

The initial bootstrap will need an Admin to set the pipeline up, after that it will have enough permissions to update itself on any changes to the master branch. (As long as the change isn't to elevate it's own permissions...)

By default the application is not very permissive and only has access to the resources it needed when it was created, so this will need maintenance over time.

# Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
