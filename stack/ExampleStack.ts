// Import main CDK library as cdk
import { Aspects, CfnResource, RemovalPolicy, Resource, Stack, StackProps, TagManager } from 'aws-cdk-lib';

import { IManagedPolicy, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Construct, IConstruct } from 'constructs';
import { readdirSync } from 'fs';
import { NodetsFunction } from './NodetsFunction';
import { NodetsLayer } from './NodetsLayer';

interface ExampleStackProps extends StackProps {
  readonly app: string
  readonly defaultRemovalPolicy?: RemovalPolicy
}

export class ExampleStack extends Stack {
  layers: { [key: string]: LayerVersion }
  app: string
  lambdaManagedPolicy?: IManagedPolicy

  constructor(scope: Construct, id: string, props: ExampleStackProps) {
    super(scope, id, props);
    this.app = props.app;
    // retrieve the minimal managed policy for the lambda functions to provide VPC Access, remove this line if unwanted
    this.lambdaManagedPolicy = ManagedPolicy.fromManagedPolicyArn(this, 'AWSLambdaVPCAccessExecutionRole', 'arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole');
    //build layers
    this.buildLayers();

    // Add an aspect to add some metadata tags
    Aspects.of(this).add({
      visit(node: IConstruct) {

        // Add a tag based on the resource type, helpful in cost explorer
        // Add a tag for the app
        if (node instanceof Resource) {
          if (TagManager.isTaggable(node)) {
            node.tags.setTag('app', props.app);
            node.tags.setTag('resource:type', node.constructor.name);
          }
        }

        // Apply default RemovalPolicy
        if (props.defaultRemovalPolicy) {
          if (node instanceof CfnResource || (node instanceof Resource && node.node.defaultChild)) {
            try {
              node.applyRemovalPolicy(props.defaultRemovalPolicy);
            } catch (error) {
              console.warn('cannot apply RemovalPolicy to ' + node.constructor.name + '/' + node.node.id);
            }
          }
        }
      }
    });

    /**
     * Example of lambda creation
     */
    const lambdaDefault = {
      //      vpc,
      //      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      //      securityGroups: [lambdaSecurityGroup],
    };

    new NodetsFunction(this, 'discord-pong-lambda', {
      ...lambdaDefault,
      description: 'A lambda example with a layer to answer to discord bot interaction with pong',
      name: 'discord-pong',
      layers: [this.layers['discord-authorizer']]
    });

    new NodetsFunction(this, 'simple-lambda-without-layer', {
      ...lambdaDefault,
      name: 'return-200',
      description: 'always return 200',
    });

  }

  buildLayers() {
    this.layers = readdirSync('src/layers', { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .reduce<{ [key: string]: LayerVersion }>((map, name) => {
        /*Create Layer for each directory*/
        const layer = new NodetsLayer(this, `${name}-layer`, { name });
        return {
          ...map,
          [name]: layer
        };
      }, {});
  }
}
