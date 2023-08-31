import { Duration, Resource, Stack, Tags } from "aws-cdk-lib";
import { Effect, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Architecture, ILayerVersion, LayerVersion, Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, NodejsFunctionProps, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
export interface NodetsFunctionProps extends NodejsFunctionProps {
    policies?: PolicyStatement[]
}
export const commonProps: Partial<NodejsFunctionProps> = {
    architecture: Architecture.ARM_64,
    runtime: Runtime.NODEJS_18_X,
    memorySize: 128,
    tracing: Tracing.ACTIVE,
    handler: 'index.handler',
    timeout: Duration.seconds(30),
    retryAttempts: 0,
    logRetention: RetentionDays.ONE_DAY,
    environment: {
        NODE_OPTIONS: '--enable-source-maps'
    },
    bundling: {
        minify: process.env.NODE_ENV === 'production',
        banner: 'import { createRequire } from \'module\'; const require = createRequire(import.meta.url);',
        mainFields: ['module', 'main'],
        target: 'node18',
        externalModules: ['@aws-sdk/*', 'aws-lambda', '@layer/*', '@aws-lambda-powertools/*', './common/*', 'aws-xray-sdk-core'],
        format: OutputFormat.ESM
    },
    layers: [],
};
let powertools: ILayerVersion | undefined = undefined;

export class NodetsFunction extends Construct {
    declare role: Role
    declare lambda: NodejsFunction

    constructor(scope: Stack, id: string, { policies, ...props }: NodetsFunctionProps) {
        super(scope, id);
        if (!powertools) {
            powertools = LayerVersion.fromLayerVersionArn(scope, 'powertool-layer', `arn:aws:lambda:${scope.region}:094274105915:layer:AWSLambdaPowertoolsTypeScript:18`);
            commonProps.layers?.push(powertools);
        }
        this.role = new Role(scope, `fn-role-${id}`, {
            roleName: `fnRole${id}`,
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            description: `lambda exec role for ${id}`
        });
        if (policies) {
            const r = this.role;
            policies.forEach(e => r.addToPolicy(e));
        }
        if (props.vpc) {
            this.role.addToPolicy(new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents",
                    "ec2:CreateNetworkInterface",
                    "ec2:DescribeNetworkInterfaces",
                    "ec2:DeleteNetworkInterface",
                    "ec2:AssignPrivateIpAddresses",
                    "ec2:UnassignPrivateIpAddresses"
                ],
                resources: ["*"]
            }));
        } else {
            this.role.addToPolicy(new PolicyStatement(
                {
                    effect: Effect.ALLOW,
                    actions: [
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                    ],
                    resources: ["*"]
                }
            ));
        }
        //default tracing is active
        if (!props.tracing || props.tracing === Tracing.ACTIVE)
            this.role.addToPolicy(new PolicyStatement(
                {
                    effect: Effect.ALLOW,
                    actions: [
                        "logs:CreateLogDelivery",
                        "logs:DeleteLogDelivery",
                        "logs:DescribeLogGroups",
                        "logs:DescribeResourcePolicies",
                        "logs:GetLogDelivery",
                        "logs:ListLogDeliveries",
                        "logs:PutResourcePolicy",
                        "logs:UpdateLogDelivery",
                        "xray:GetSamplingRules",
                        "xray:GetSamplingTargets",
                        "xray:PutTelemetryRecords",
                        "xray:PutTraceSegments"
                    ],
                    resources: [`arn:aws:logs:${Stack.of(this).region}:${scope.account}:log-group:/aws/lambda/${id}:*`],
                }
            ))

        this.lambda = new NodejsFunction(scope, `fn-${id}`, {
            //default values
            ...commonProps,
            entry: `src/functions/${id}/index.ts`,
            ...props,

            // force the name, do not let the cdk generate one
            functionName: props.functionName || id,
            // force a role, do not let the cdk generate one, important to avoid issues when using grant*
            role: this.role,
            layers: props.layers ? [...commonProps.layers ?? [], ...props.layers] : commonProps.layers,
            // override props
            bundling: {
                ...commonProps.bundling,
                ...props.bundling,
            },
            environment: {
                ...commonProps.environment,
                ...props.environment
            },

        });
    }

}
