import { PolicyStatement, Effect } from '@aws-cdk/aws-iam';

export function getStatement(actions: string[], resc: string[]) {
  const pol = new PolicyStatement();
  pol.effect = Effect.ALLOW;

  pol.addActions(...actions);
  pol.addResources(...resc);

  return pol;
}
