import { CfnResource, IAspect, RemovalPolicy, Resource, TagManager } from "aws-cdk-lib";
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
        if (node instanceof Resource) {
            if (TagManager.isTaggable(node)) {
                // add resource:type tag to help finding resources in cost explorer and groups
                node.tags.setTag('resource:type', node.constructor.name);
            }

        }
        if (node instanceof CfnResource || (node instanceof Resource && node.node.defaultChild)) {
            try {
                // apply destroy to everything
                node.applyRemovalPolicy(RemovalPolicy.DESTROY);
            } catch (error) {
                console.warn('cannot apply RemovalPolicy to ' + node.constructor.name + '/' + node.node.id);
            }
        }

        if (TagManager.isTaggable(node)) {
            this.iter.forEach(k => node.tags.setTag(`x-${k}`, this.tags[k]))
        }

    }
}