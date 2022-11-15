# cdkLambdaApplication Pipelines

This is a [AWS CDK](https://github.com/awslabs/aws-cdk) application that deploys the pipelines used for https://github.com/rohitgupta19/aws-serverless-typescript-api.

3. run `aws configure` for the aws accessKeyId and secretAccessKey with a profile name
4. run `export AWS_PROFILE=#YOUR_PROFILE_NAME`
5. install CDK version for the project globally `npm install -g aws-cdk@1.80.0 `
6. run `npm install`
7. run `npm run build`

# Deployment from command line :

- run `npx cdk deploy CDKLambdaDeployPipeline --require-approval never`

The master pipeline in this project is the `pipeline-builder.ts`. This is a CodePipeline project that builds the other pipelines out.

`npm run build` Followed by
`npx cdk --app "node bin/pipeline-builder.js"` will deploy this master pipeline. This pipeline will run automatically on pushes to `master` of this project on github and will build out the pipelines defined here.

See `./pipelines.json` for the pipelines that will be built.

All pipelines follow the same patter for stages (Environments) and map their branches the same way to keep consitency. See `./stages.json`.

## Github

Each Pipeline is created with a webhook for it's respective branch and will automatically be started when a change is made on that branch.

Initial setup of pipelines requires Admin permission on a given repo for when the WebHook is automatically created, from then on it can be simple Read access.

## Permissions

The initial bootstrap will need an Admin to set the pipeline up, after that it will have enough permissions to update itself on any changes to the master branch.

# Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
