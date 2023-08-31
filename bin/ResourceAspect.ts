import { CfnResource, IAspect, NestedStack, RemovalPolicy, Resource, Stack, TagManager } from "aws-cdk-lib";
import { IConstruct } from "constructs";

interface ResourceAspectProps {
    // add whatever tag to every resource 
    [name: string]: string
}

export class ResourceAspect implements IAspect {
    readonly tags: { [key: string]: string; }
    readonly iter: string[]

    constructor(props: ResourceAspectProps) {
        this.tags = { ...props };
        this.iter = Object.keys(this.tags);
    }



    visit(node: IConstruct) {
        if (CfnResource.isCfnResource(node) || (node instanceof Resource && node.node.defaultChild)) {
            try {
                // apply destroy to everything
                node.applyRemovalPolicy(RemovalPolicy.DESTROY);
            } catch (error) {
                console.warn('cannot apply RemovalPolicy to ' + node.constructor.name + '/' + node.node.id);
            }
        }

        if (TagManager.isTaggable(node) && CfnResource.isCfnResource(node)) {
            node.tags.setTag('resource:type', node.cfnResourceType);
            this.iter.forEach(k => node.tags.setTag(`x-${k}`, this.tags[k]))
        }

    }
}