import { Duration } from "aws-cdk-lib";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Architecture, Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, NodejsFunctionProps, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { ExampleStack } from "./ExampleStack";


export interface NodetsFunctionProps extends NodejsFunctionProps {
    name: string
    // 
    //vpc: IVpc
    //vpcSubnets: SubnetSelection
    //securityGroups: SecurityGroup[]
}

export class NodetsFunction extends NodejsFunction {

    constructor(scope: ExampleStack, id: string, props: NodetsFunctionProps) {
        super(scope, id, {
            //default values
            architecture: Architecture.ARM_64,
            runtime: Runtime.NODEJS_18_X,
            memorySize: 128,
            tracing: Tracing.ACTIVE,
            handler: 'index.handler',
            timeout: Duration.seconds(30),
            retryAttempts: 0,
            logRetention: RetentionDays.ONE_DAY,
            entry: `src/functions/${props.name}/index.ts`,
            ...props,

            // force the name, do not let the cdk generate one
            functionName: props.functionName || props.name,
            // force a role, do not let the cdk generate one, important to avoid issues when using grant*
            role: props.role || createLambdaRole(scope, props.name),

            // override props
            bundling: {
                minify: process.env.NODE_ENV === 'production',
                banner: 'import { createRequire } from \'module\'; const require = createRequire(import.meta.url);',
                mainFields: ['module', 'main'],
                target: 'node18',
                externalModules: ['@aws-sdk/*', 'aws-lambda', '@layer/*'],
                format: OutputFormat.ESM,
                ...props.bundling,
            },
            environment: {
                ...props.environment
            },

        });
    }


}

function createLambdaRole(scope: ExampleStack, name: string) {
    const lambdaDefaultRole = new Role(scope, `fn-role-${name}`, {
        roleName: `fnRole${name}`,
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        description: `lambda exec role for ${name}`
    });

    if (scope.lambdaManagedPolicy)
        lambdaDefaultRole.addManagedPolicy(scope.lambdaManagedPolicy);
    return lambdaDefaultRole;
}